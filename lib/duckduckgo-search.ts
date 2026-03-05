/**
 * DuckDuckGo Search Integration
 * 
 * Uses DuckDuckGo HTML search for web results (no API key required)
 * Parses HTML results and returns structured search data
 */

export interface DuckDuckGoResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  rank: number;
}

export interface DuckDuckGoSearchResponse {
  query: string;
  results: DuckDuckGoResult[];
  totalResults: number;
  searchTime: number;
  success: boolean;
  error?: string;
}

const DDG_ENDPOINT = 'https://html.duckduckgo.com/html/';

/**
 * Search DuckDuckGo and parse HTML results
 */
export async function searchDuckDuckGo(
  query: string,
  maxResults: number = 10
): Promise<DuckDuckGoSearchResponse> {
  const startTime = Date.now();
  
  try {
    // DuckDuckGo HTML search endpoint
    const params = new URLSearchParams({
      q: query,
      kl: 'us-en', // Region
      num: String(maxResults),
    });
    
    const response = await fetch(`${DDG_ENDPOINT}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }
    
    const html = await response.text();
    const results = parseDuckDuckGoHtml(html, maxResults);
    
    return {
      query,
      results,
      totalResults: results.length,
      searchTime: Date.now() - startTime,
      success: true,
    };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return {
      query,
      results: [],
      totalResults: 0,
      searchTime: Date.now() - startTime,
      success: false,
      error: String(error),
    };
  }
}

/**
 * Parse DuckDuckGo HTML response
 */
function parseDuckDuckGoHtml(html: string, maxResults: number): DuckDuckGoResult[] {
  const results: DuckDuckGoResult[] = [];
  
  // DuckDuckGo HTML structure:
  // <div class="result__body">
  //   <a class="result__a" href="...">Title</a>
  //   <a class="result__url" href="...">domain.com</a>
  //   <a class="result__snippet">Snippet text...</a>
  // </div>
  
  // Match result containers
  const resultPattern = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const linkPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
  const snippetPattern = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
  const urlPattern = /<a[^>]*class="[^"]*result__url[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
  
  let match;
  let rank = 1;
  
  // Alternative: simpler regex for each result
  const simpleResultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  
  while ((match = simpleResultPattern.exec(html)) !== null && rank <= maxResults) {
    const rawUrl = match[1];
    const titleHtml = match[2];
    
    // DuckDuckGo uses redirect URLs, extract actual URL
    const url = extractActualUrl(rawUrl);
    
    if (!url || url.startsWith('/')) continue; // Skip invalid or internal links
    
    // Get snippet - find it after the title link
    const snippetMatch = html.slice(match.index, match.index + 1000).match(snippetPattern);
    const snippet = stripHtml(snippetMatch?.[1] || '');
    
    // Get domain
    const domainMatch = html.slice(match.index, match.index + 500).match(urlPattern);
    const domain = stripHtml(domainMatch?.[1] || '') || extractDomain(url);
    
    results.push({
      title: stripHtml(titleHtml),
      url,
      snippet: snippet.slice(0, 200),
      domain,
      rank,
    });
    
    rank++;
  }
  
  return results;
}

/**
 * Extract actual URL from DuckDuckGo redirect URL
 */
function extractActualUrl(redirectUrl: string): string {
  try {
    // DuckDuckGo uses URLs like: //duckduckgo.com/l/?uddg=ENCODED_URL
    if (redirectUrl.includes('uddg=')) {
      const urlParam = redirectUrl.match(/uddg=([^&]+)/);
      if (urlParam) {
        const decoded = decodeURIComponent(urlParam[1]);
        // Validate the URL is properly formed
        try {
          new URL(decoded);
          return decoded;
        } catch {
          // Invalid URL, continue to other methods
        }
      }
    }
    
    // Direct URL - validate it
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
      try {
        new URL(redirectUrl);
        return redirectUrl;
      } catch {
        // Invalid URL
      }
    }
    
    // Protocol-relative URL
    if (redirectUrl.startsWith('//')) {
      const fullUrl = 'https:' + redirectUrl;
      try {
        new URL(fullUrl);
        return fullUrl;
      } catch {
        // Invalid URL
      }
    }
    
    return '';
  } catch {
    return '';
  }
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '') // Remove tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Search with retry and fallback
 */
export async function searchWithFallback(
  query: string,
  maxResults: number = 5
): Promise<DuckDuckGoResult[]> {
  const result = await searchDuckDuckGo(query, maxResults);
  
  if (result.success && result.results.length > 0) {
    return result.results;
  }
  
  // Could add fallback to other search engines here
  console.warn('DuckDuckGo search failed, no fallback available');
  return [];
}

/**
 * Batch search multiple queries
 */
export async function batchSearch(
  queries: string[],
  maxResultsPerQuery: number = 3
): Promise<Map<string, DuckDuckGoResult[]>> {
  const results = new Map<string, DuckDuckGoResult[]>();
  
  // Search in parallel
  const searchPromises = queries.map(async (query) => {
    const results = await searchWithFallback(query, maxResultsPerQuery);
    return { query, results };
  });
  
  const allResults = await Promise.all(searchPromises);
  
  for (const { query, results: searchResults } of allResults) {
    results.set(query, searchResults);
  }
  
  return results;
}
