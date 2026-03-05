import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query, searchType = "web" } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Using DuckDuckGo HTML interface with proper headers
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse DuckDuckGo results
    const results = parseDuckDuckGoResults(html);

    return NextResponse.json({
      results,
      query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}

function parseDuckDuckGoResults(html: string) {
  const results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }> = [];

  // Parse web results using regex for DuckDuckGo HTML structure
  const resultMatches = html.match(/<a rel="nofollow" class="result__a"[^>]*>.*?<\/a>.*?<\/div>/g);
  
  if (!resultMatches) {
    // Fallback: try alternative parsing
    const titleMatches = html.match(/<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    const snippetMatches = html.match(/<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g);
    
    if (titleMatches) {
      for (let i = 0; i < titleMatches.length && i < 10; i++) {
        const titleMatch = titleMatches[i]?.match(/>([^<]*)<\/a>/);
        const urlMatch = titleMatches[i]?.match(/href="([^"]*)"/);
        
        if (titleMatch && urlMatch) {
          results.push({
            title: cleanHtml(titleMatch[1]),
            url: decodeURIComponent(urlMatch[1]),
            snippet: "",
            source: new URL(decodeURIComponent(urlMatch[1])).hostname,
          });
        }
      }
    }
  } else {
    for (const match of resultMatches.slice(0, 10)) {
      const titleMatch = match.match(/<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/);
      const snippetMatch = match.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/);
      
      if (titleMatch) {
        let url = decodeURIComponent(titleMatch[1]);
        
        // Handle DuckDuckGo redirect URLs
        if (url.includes('duckduckgo.com/l/') && url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            url = decodeURIComponent(uddgMatch[1]);
          }
        }
        
        // Ensure URL has protocol
        if (url.startsWith('//')) {
          url = 'https:' + url;
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        try {
          const urlObj = new URL(url);
          results.push({
            title: cleanHtml(titleMatch[2]),
            url: url,
            snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : "",
            source: urlObj.hostname,
          });
        } catch (urlError) {
          // Skip invalid URLs
          console.warn('Skipping invalid URL:', url);
        }
      }
    }
  }

  return results;
}

function cleanHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/<[^>]+>/g, "")
    .trim();
}
