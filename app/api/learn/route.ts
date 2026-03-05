import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";

// Initialize providers
const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY || "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",
});

const nyatiCore = createOpenAI({
  baseURL: 'https://ryan33121-nyati-core-api.hf.space/v1',
  apiKey: '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',
});

// YouTube search function
async function searchYouTube(query: string, maxResults: number = 5) {
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyA82ZQFsZYuf_yzCsd4QN0tkpRMvKcs6EA';
    if (!YOUTUBE_API_KEY) {
      console.warn('YouTube API key not configured');
      return [];
    }
    
    const searchQuery = encodeURIComponent(`${query} tutorial educational`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${searchQuery}&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API error:', response.status, errorData);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('No YouTube results found for:', query);
      return [];
    }
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

// DuckDuckGo search function
async function searchDuckDuckGo(query: string, maxResults: number = 5) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " educational")}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) return [];
    const html = await response.text();
    
    const results: Array<{
      title: string;
      url: string;
      snippet: string;
      source: string;
    }> = [];

    // Parse DuckDuckGo results
    const titleMatches = html.match(/<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (titleMatches) {
      for (let i = 0; i < titleMatches.length && i < maxResults; i++) {
        const titleMatch = titleMatches[i]?.match(/>([^<]*)<\/a>/);
        const urlMatch = titleMatches[i]?.match(/href="([^"]*)"/);
        
        if (titleMatch && urlMatch) {
          try {
            const url = decodeURIComponent(urlMatch[1]);
            results.push({
              title: titleMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim(),
              url: url,
              snippet: "",
              source: new URL(url).hostname,
            });
          } catch {}
        }
      }
    }

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

const SYSTEM_PROMPT = `You are an expert educational AI tutor. Your goal is to create comprehensive, well-structured learning materials on any topic the user requests.

### GUIDED LEARNING FORMAT
Structure your response as a complete educational guide with:

1. **Overview**: Brief introduction to the topic
2. **Prerequisites**: What the learner should know beforehand
3. **Learning Objectives**: Clear goals for what they'll learn
4. **Main Content**: 
   - Break into logical sections/modules
   - Use clear headings and subheadings
   - Include examples and explanations
   - Add practice questions where appropriate
5. **Video Resources**: List relevant YouTube videos for visual learning
6. **Web Resources**: Include curated web sources for further reading
7. **Summary**: Key takeaways
8. **Further Resources**: Suggested next steps or related topics

### FORMATTING RULES
- Use clean Markdown formatting
- Include code examples if relevant (use proper syntax highlighting)
- Make content engaging and easy to follow
- Include "Key Points" callouts for important concepts
- Add "Try It Yourself" sections for practical exercises
- CITE your sources by referencing [Source: X] when using search results

### TONE
Encouraging, clear, and educational. Write as if you're a patient mentor guiding someone through their learning journey.

IMPORTANT: Generate complete, comprehensive content that can be compiled into a downloadable PDF document. Do not cut content short - provide full educational material. Incorporate provided search results and videos naturally into the content.`;

export async function POST(req: NextRequest) {
  try {
    const { topic, level = "intermediate", userId, model = "medium" } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Perform searches
    const [youtubeResults, webResults] = await Promise.all([
      searchYouTube(topic, 5),
      searchDuckDuckGo(topic, 5),
    ]);

    // Build context from search results
    let searchContext = '';
    if (youtubeResults.length > 0) {
      searchContext += '\n\n### RELEVANT YOUTUBE VIDEOS\n';
      youtubeResults.forEach((video: any, idx: number) => {
        searchContext += `[${idx + 1}] ${video.title} by ${video.channelTitle}:\n${video.description}\nURL: ${video.url}\n\n`;
      });
    }
    if (webResults.length > 0) {
      searchContext += '\n\n### RELEVANT WEB SOURCES\n';
      webResults.forEach((result: any, idx: number) => {
        searchContext += `[${idx + 1}] ${result.title} [Source: ${result.source}]:\n${result.snippet}\nURL: ${result.url}\n\n`;
      });
    }

    // Build the prompt based on topic and level
    const userPrompt = `Create a comprehensive guided learning course on: **${topic}**

Target Level: ${level}

Please provide:
1. A complete overview of the topic
2. Prerequisites (if any)
3. Clear learning objectives
4. Detailed content broken into sections
5. Examples and explanations
6. Practice exercises or questions
7. Summary and key takeaways
8. Suggested next steps or related topics

Include relevant YouTube videos and web sources in the appropriate sections.

Make this content thorough enough to be used as a complete learning resource.${searchContext}`;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let result;
          
          if (model === 'medium') {
            // Use dual-agent approach for guided learning
            const thinkingResult = await streamText({
              model: groqProvider.languageModel('llama-3.1-8b-instant'),
              system: SYSTEM_PROMPT,
              messages: [{
                role: 'user',
                content: `Create a brief outline/plan for teaching "${topic}" at ${level} level. Keep under 100 words.`
              }],
            });

            let thinkingText = '';
            for await (const chunk of thinkingResult.textStream) {
              thinkingText += chunk;
            }

            result = await streamText({
              model: nyatiCore.languageModel('llama3.2:1b'),
              system: SYSTEM_PROMPT + '\n\n### TEACHING PLAN\nUse this structure:\n' + thinkingText,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.7,
            });
          } else if (model === 'pro') {
            result = await streamText({
              model: groqProvider.languageModel('llama-3.1-8b-instant'),
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userPrompt }],
            });
          } else {
            result = await streamText({
              model: nyatiCore.languageModel('llama3.2:1b'),
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.7,
            });
          }

          // Send metadata as first chunk
          const metadata = JSON.stringify({
            type: 'metadata',
            topic,
            level,
            videos: youtubeResults,
            sources: webResults,
          });
          controller.enqueue(new TextEncoder().encode(metadata + '\n'));

          for await (const chunk of result.textStream) {
            try {
              controller.enqueue(new TextEncoder().encode(chunk));
            } catch (enqueueError) {
              break;
            }
          }

          try {
            controller.close();
          } catch (closeError) {
            // Controller might already be closed
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("Guided learning error:", error);
    return NextResponse.json(
      { error: "Failed to generate learning material", details: (error as Error).message },
      { status: 500 }
    );
  }
}
