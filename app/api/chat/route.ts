import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { searchKnowledge, searchChatHistory, searchUserFacts, addUserFact } from '@/lib/qdrant';
import { generateEmbeddingWithRetry } from '@/lib/embeddings';
import { searchDuckDuckGo } from '@/lib/duckduckgo-search';
import { routeQuery, needsContextEnrichment, type QueryIntent } from '@/lib/intent-router';
import { searchNews, formatNewsForContext, type NewsArticle } from '@/lib/news-api';
import { searchMovies, multiSearch, formatMoviesForContext, getImageUrl, type MovieResult, type TVResult } from '@/lib/tmdb-api';
import { createPlan, evaluateMemoryStorage, toolRouter, createReflection, generateStrategicDraft, generateFinalResponse, generateConsistentStrategicDraft } from '@/lib/intelligence-controller';
import { 
  metricsStore, 
  shouldUseSelfConsistency, 
  validateResponse, 
  analyzeComplexity, 
  pruneMemoryContext,
  calculateMemoryQualityScore,
  shouldStoreMemory,
  type PerformanceMetrics 
} from '@/lib/adaptive-intelligence';
import { decideExploration, recordExplorationOutcome, type ExplorationDecision } from '@/lib/exploration-engine';
import { handleCapabilityMessage, detectCapabilityQuery } from '@/lib/capability-registry';
import { generateReport } from '@/lib/report-engine';
import { fetchLiveResources, selectResourcesForStep } from '@/lib/live-resources';
import { resourceService } from '@/lib/learning-platform';
import type { ContentCategory } from '@/lib/live-resources';
import type { NyatiPlan } from '@/types/plan';

// Types
interface ChatSource {
  id: number;
  title: string;
  url: string;
  type: 'qdrant' | 'google' | 'youtube' | 'web';
  snippet?: string;
}

// 1. Prevent Vercel timeouts
export const maxDuration = 60;

// 2. Initialize providers
const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY || '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',
});

const nyatiCore = createOpenAI({
  baseURL: 'https://ryan33121-nyati-core-api.hf.space/v1',
  apiKey: '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',
});

const SYSTEM_PROMPT = `You are Koda-A, a sharp and technically skilled AI assistant. You're genuinely fun to talk to.

**WHO YOU ARE**:
- You're an AI assistant that helps with coding, technical questions, learning resources, and casual conversation
- You have knowledge retrieval and adaptive intelligence capabilities

**PERSONALITY**:
- You're a peer, not an assistant. Talk like you're chatting with a colleague.
- Match the user's energy. Short message? Short reply. Detailed question? Thoughtful answer.
- Never use generic phrases like "How can I help you?" or "What do you need assistance with?"
- Be playful when appropriate. Drop a joke, make a reference, keep it real.
- You have opinions and preferences. Don't be bland.

**CONVERSATION STYLE**:
- For greetings: Respond naturally. "hey" → "yo, what's up?" or "hey!" or "sup"
- For "hru" or "how are you": "good, you?" or "doing well, what about you?"
- For "thanks": "np" or "anytime" or just acknowledge it casually
- For questions: Get straight to the point, then elaborate if needed
- Never sign off with "Let me know if you need anything else"
- Never mention servers, systems, or technical infrastructure in casual chat

**CITATIONS & SOURCES**:
- When using information from context, cite it like [1], [2], [3]
- Each citation corresponds to a source in the order you use them
- At the end of your response, include a sources section if you cited anything

**SUGGESTIONS**:
- After answering, suggest 2-3 follow-up questions the user might ask
- Format: Put each suggestion on a new line starting with "→ "

**THINKING FORMAT** (for complex questions):
Before answering complex questions, show your reasoning in <thinking> tags:
<thinking>
Analyzing: What the user wants.
Key points: A, B, C.
Approach: Will explain X then provide example.
</thinking>

**TECHNICAL STUFF**:
- When code or technical questions come up, switch to engineer mode
- Keep explanations clear but not patronizing
- For technical topics, be precise and factual (lower creativity)

**SELF-CORRECTION**:
- If you realize you need more information to answer accurately, output: [NEED_SEARCH: your search query]
- This will trigger a web search to get fresh data before continuing
- Use this when you're uncertain about current events or facts

**CONTEXT**:
User: {{user_name}}
Role: {{user_role}}`;

// Intelligence Controller: RAG with privacy filtering
async function retrieveMemoryWithPrivacy(
  query: string,
  queryVector: number[],
  userId?: string
): Promise<{ sources: ChatSource[]; context: string }> {
  let sources: ChatSource[] = [];
  let context = '';
  
  try {
    // Search knowledge base with user filter if available
    const knowledgeResults = await searchKnowledge(queryVector, 5);
    
    // Filter by privacy/scope if userId provided
    const filteredResults = userId 
      ? knowledgeResults.filter(r => {
          // Allow: user's own data, public data, or data with matching scope
          const payload = r as any;
          if (payload.privacy === 'private' && payload.owner_id !== userId) return false;
          return true;
        })
      : knowledgeResults;
    
    if (filteredResults.length > 0) {
      sources = filteredResults.map((result, idx) => ({
        id: idx + 1,
        title: result.title,
        url: result.source || '',
        type: 'qdrant' as const,
        snippet: result.content.slice(0, 200),
      }));
      
      context += '\n\n### RELEVANT KNOWLEDGE\n';
      filteredResults.forEach((result, idx) => {
        const contextText = (result as any).parentContent || result.content;
        context += `[${idx + 1}] ${result.title}:\n${contextText}\n\n`;
      });
    }
    
    // Search user facts for personalization
    if (userId) {
      const userFacts = await searchUserFacts(userId, queryVector, 3);
      if (userFacts.length > 0) {
        context += '\n### USER PREFERENCES\n';
        userFacts.forEach((fact) => {
          context += `- ${fact.fact}\n`;
        });
      }
    }
  } catch (error) {
    console.error('Memory retrieval error:', error);
  }
  
  return { sources, context };
}

export async function POST(req: Request) {
  const { messages, model, userId, searchMode, selectedTool, modelType, userProfile } = await req.json();
  
  // Get the latest user message
  const latestMessage = messages[messages.length - 1];
  const userQuery = latestMessage?.content || '';
  
  // ==========================================
  // INTENT ROUTING - Decide which tools to use
  // ==========================================
  const routingResult = routeQuery(userQuery, selectedTool);
  console.log('🔀 Intent Router:', routingResult.intent, `(${routingResult.confidence})`);
  
  // Build dynamic system prompt with user context
  const userName = userProfile?.firstName || userProfile?.name || null;
  const userRole = userProfile?.role || 'Developer';
  let dynamicSystemPrompt = SYSTEM_PROMPT
    .replace(/\{\{user_name\}\}/g, userName || 'Guest')
    .replace(/\{\{user_role\}\}/g, userRole)
    .replace(/\{\{current_context\}\}/g, searchMode || 'conversation');
  
  // Context enrichment based on routing
  let enrichedContext = '';
  let contextSources: any[] = [];
  let newsArticles: any[] = [];
  let movieResults: any[] = [];
  let youtubeVideos: any[] = [];
  
  // NEWS: Use NewsAPI for news queries
  if (routingResult.intent === 'NEWS') {
    console.log('📰 Performing NewsAPI search...');
    const searchQuery = routingResult.suggestedSearchQuery || userQuery;
    const newsResult = await searchNews(searchQuery, 5);
    
    if (newsResult.success && newsResult.articles.length > 0) {
      enrichedContext += formatNewsForContext(newsResult.articles);
      newsArticles = newsResult.articles;
      newsResult.articles.forEach((article, i) => {
        contextSources.push({
          id: i + 1,
          title: article.title,
          url: article.url,
          snippet: article.description,
          type: 'news',
          image: article.urlToImage,
          source: article.source.name,
          date: article.publishedAt,
        });
      });
    }
  }
  
  // MOVIE: Use TMDB for movie/TV queries
  if (routingResult.intent === 'MOVIE') {
    console.log('🎬 Performing TMDB search...');
    const searchQuery = routingResult.suggestedSearchQuery || userQuery;
    const movieResult = await multiSearch(searchQuery);
    
    if (movieResult.success && movieResult.results.length > 0) {
      enrichedContext += formatMoviesForContext(movieResult.results, true);
      
      // Separate people from movies/TV
      const people = movieResult.results.filter((r: any) => r.media_type === 'person');
      const moviesAndTV = movieResult.results.filter((r: any) => r.media_type !== 'person');
      
      movieResults = moviesAndTV.slice(0, 5).map((item: any, i: number) => ({
        id: item.id,
        title: item.title || item.name,
        year: (item.release_date || item.first_air_date || '').slice(0, 4),
        overview: item.overview,
        rating: item.vote_average,
        poster: getImageUrl(item.poster_path, 'w500'),
        backdrop: getImageUrl(item.backdrop_path, 'w780'),
        type: item.media_type || (item.title ? 'movie' : 'tv'),
      }));
      
      // Add person results
      const personResults = people.slice(0, 3).map((item: any, i: number) => ({
        id: item.id,
        title: item.name,
        overview: `Known for: ${item.known_for?.map((k: any) => k.title || k.name).join(', ')}`,
        poster: getImageUrl(item.profile_path, 'w500'),
        type: 'person',
        rating: item.popularity,
        known_for: item.known_for?.slice(0, 3).map((k: any) => ({
          title: k.title || k.name,
          type: k.media_type,
        })),
      }));
      
      // Add to movieResults for display
      movieResults = [...movieResults, ...personResults];
      
      movieResult.results.slice(0, 5).forEach((item: any, i: number) => {
        const isPerson = item.media_type === 'person';
        contextSources.push({
          id: i + 1,
          title: item.title || item.name,
          url: `https://www.themoviedb.org/${item.media_type || 'movie'}/${item.id}`,
          snippet: item.overview?.slice(0, 200) || (isPerson ? `Known for: ${item.known_for?.map((k: any) => k.title || k.name).join(', ')}` : undefined),
          type: isPerson ? 'person' : 'movie',
          image: getImageUrl(item.poster_path || item.profile_path, 'w200'),
          rating: item.vote_average,
        });
      });
    }
    
    // Also do web search for person queries to get more info
    const isPersonQuery = movieResult.results.some((r: any) => r.media_type === 'person');
    if (isPersonQuery) {
      console.log('🔍 Also performing web search for person info...');
      const ddgResults = await searchDuckDuckGo(searchQuery, 5);
      if (ddgResults.success && ddgResults.results.length > 0) {
        enrichedContext += '\n\n**WEB SEARCH RESULTS:**\n';
        ddgResults.results.forEach((result, i) => {
          enrichedContext += `[${i + 1}] ${result.title}\n${result.snippet}\nSource: ${result.url}\n\n`;
          contextSources.push({
            id: contextSources.length + 1,
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            type: result.url.includes('youtube') ? 'youtube' : 'duckduckgo',
          });
        });
      }
    }
  }
  
  // DUCKDUCKGO: Web search for current/real-time info
  if (routingResult.intent === 'DUCKDUCKGO' || selectedTool === 'deep-search') {
    console.log('🔍 Performing DuckDuckGo search...');
    const searchQuery = routingResult.suggestedSearchQuery || userQuery;
    const ddgResults = await searchDuckDuckGo(searchQuery, 5);
    
    if (ddgResults.success && ddgResults.results.length > 0) {
      enrichedContext += '\n\n**WEB SEARCH RESULTS:**\n';
      ddgResults.results.forEach((result, i) => {
        enrichedContext += `[${i + 1}] ${result.title}\n${result.snippet}\nSource: ${result.url}\n\n`;
        const isYouTube = result.url.includes('youtube.com') || result.url.includes('youtu.be');
        contextSources.push({
          id: i + 1,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          type: isYouTube ? 'video' : 'website',
          source: result.domain,
          favicon: `https://www.google.com/s2/favicons?sz=32&domain=${result.domain}`,
        });
      });
    }
    
    // Also fetch YouTube videos for general searches
    console.log('📺 Fetching YouTube videos for search...');
    try {
      const liveResources = await fetchLiveResources(searchQuery, {
        category: 'coding',
        skillLevel: 'beginner',
        ageRating: '13+',
        maxResults: 2,
      });
      
      if (liveResources.youtubeVideos && liveResources.youtubeVideos.length > 0) {
        youtubeVideos = liveResources.youtubeVideos.slice(0, 2).map((v: any) => ({
          id: v.id,
          title: v.title,
          url: v.url,
          channel: v.channelTitle,
          duration: Math.round(v.duration / 60),
          thumbnail: v.thumbnail,
        }));
        
        // Add YouTube videos to context
        enrichedContext += '\n\n**YOUTUBE VIDEOS:**\n';
        liveResources.youtubeVideos.slice(0, 2).forEach((v: any, i: number) => {
          enrichedContext += `${i + 1}. ${v.title} (${v.channelTitle})\n`;
        });
      }
    } catch (error) {
      console.error('YouTube fetch error:', error);
    }
  }
  
  // QDRANT: Personal history and memory
  if (routingResult.intent === 'QDRANT' && userId) {
    console.log('🧠 Searching Qdrant for personal context...');
    try {
      const queryVector = await generateEmbeddingWithRetry(userQuery);
      const memoryResults = await retrieveMemoryWithPrivacy(userQuery, queryVector, userId);
      
      if (memoryResults.context) {
        enrichedContext += '\n\n**RELEVANT MEMORY:**\n' + memoryResults.context;
        contextSources.push(...memoryResults.sources);
      }
    } catch (error) {
      console.error('Memory retrieval failed:', error);
    }
  }
  
  // Enhance prompt for deep-search tool
  if (selectedTool === 'deep-search') {
    dynamicSystemPrompt += `

**DEEP SEARCH MODE ACTIVE**:
- Search the web thoroughly for the user's query
- Provide comprehensive results with sources
- Include relevant YouTube videos when available
- Cite sources using [1], [2] format`;
  }
  
  // Enhance prompt for guided-learning tool
  if (selectedTool === 'guided-learning') {
    dynamicSystemPrompt += `

**GUIDED LEARNING MODE ACTIVE**:
- Act as a patient tutor helping the user learn
- Break down complex topics into digestible steps
- Provide practice questions to test understanding
- Recommend learning resources (videos, articles, docs)
- Adapt to the user's skill level and context (school, online, etc.)`;
  }
  
  // Add enriched context to prompt if available
  if (enrichedContext) {
    dynamicSystemPrompt += `\n\n**CONTEXT FOR YOUR RESPONSE:**${enrichedContext}`;
    dynamicSystemPrompt += `\n\nUse the above context to answer. Cite sources with [1], [2] format.`;
  }
  
  // Check if this is a capability query or report request
  const capabilityResponse = handleCapabilityMessage(userQuery);
  if (capabilityResponse.isCapabilityQuery && capabilityResponse.response) {
    // Return static response for capability queries (don't stream)
    return new Response(capabilityResponse.response, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  
  // Check for report generation request
  if (userQuery.toLowerCase().includes('generate report') || userQuery.toLowerCase().includes('download governance')) {
    try {
      const report = await generateReport({
        type: 'full-system',
        format: 'json',
        options: { includeTraces: false, includeIdentity: true, includeGoals: true },
      });
      
      const reportMessage = `📊 **Report Generated**

**Type:** ${report.type}
**Format:** ${report.format}
**Size:** ${(report.fileSize / 1024).toFixed(1)} KB
**Records:** ${report.metadata.recordCount}

**Download Link:** [Download Report](/api/reports?id=${report.id}&action=download)

_This link expires in 24 hours._`;
      
      return new Response(reportMessage, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  }
  
  // Store for reflection and adaptive metrics
  let executedPlan: NyatiPlan | undefined;
  let fullResponseText = '';
  let generationStartTime = Date.now();
  let strategicDraftGenerated = false;
  let selfConsistencyUsed = false;
  let memoryActuallyUsed = false;
  let isExploration = false;
  let explorationDecision: ExplorationDecision | null = null;

  // Create a stream with the new agentic flow
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ==========================================
        // STEP 1: INTELLIGENCE CONTROLLER - PLANNING
        // ==========================================
        console.log('🧠 Intelligence Controller: Creating plan...');
        const plan = await createPlan(userQuery);
        executedPlan = plan;
        
        // ==========================================
        // STEP 1.5: EXPLORATION DECISION (Phase 7)
        // ==========================================
        const recentSummary = metricsStore.getIntentMetrics(plan.intent, 20);
        explorationDecision = decideExploration(plan, recentSummary.successRate);
        isExploration = explorationDecision.shouldExplore;
        
        if (isExploration) {
          console.log('🔬 Exploration mode:', explorationDecision.focus);
          // Apply exploration adjustments
          plan.confidence = Math.max(0.1, plan.confidence + explorationDecision.adjustments.confidenceBiasDelta);
        }
        
        // Send plan metadata (for debugging/UI)
        const planMetadata = JSON.stringify({ 
          type: 'plan', 
          plan: {
            intent: plan.intent,
            needs_memory: plan.needs_memory,
            needs_tools: plan.needs_tools,
            store_memory: plan.store_memory,
            confidence: plan.confidence,
            isExploration,
            explorationFocus: isExploration ? explorationDecision.focus : null,
          },
          adaptive: metricsStore.getThresholds(),
        });
        controller.enqueue(new TextEncoder().encode(planMetadata + '\n'));
        
        // ==========================================
        // STEP 2: MEMORY RETRIEVAL & LIVE RESOURCES (if needed)
        // ==========================================
        let memoryContext = '';
        let sources: ChatSource[] = [];
        let youtubeVideos: any[] = [];
        let memoryRetrieved = false;
        let liveResourcesFetched = false;
        
        if (plan.needs_memory && plan.memory_query) {
          console.log('📚 Retrieving memory...');
          try {
            const queryEmbedding = await generateEmbeddingWithRetry(plan.memory_query);
            const memoryResult = await retrieveMemoryWithPrivacy(
              plan.memory_query,
              queryEmbedding,
              userId
            );
            memoryContext = memoryResult.context;
            sources = memoryResult.sources;
            memoryRetrieved = sources.length > 0;
            
            // Apply reasoning budget control - prune if too large
            const complexity = analyzeComplexity(userQuery, memoryContext, plan.tool_actions || null);
            if (complexity.recommendation === 'prune_memory') {
              console.log('✂️ Pruning memory context (reasoning budget)');
              const thresholds = metricsStore.getThresholds();
              memoryContext = pruneMemoryContext(memoryContext, thresholds.maxMemoryContextSize);
            }
          } catch (error) {
            console.error('Memory retrieval error:', error);
          }
        }
        
        // Fetch live resources for learning-related queries
        const learningKeywords = ['tutorial', 'learn', 'how to', 'course', 'guide', 'blender', 'python', 'roblox', 'youtube', 'video', 'animation', 'coding', 'programming'];
        const isLearningQuery = learningKeywords.some(kw => userQuery.toLowerCase().includes(kw));
        
        if (isLearningQuery && !searchMode?.startsWith('quick')) {
          console.log('🎓 Learning query detected - fetching live resources...');
          try {
            // Determine category from query
            let category: ContentCategory = 'coding';
            if (userQuery.toLowerCase().includes('blender') || userQuery.toLowerCase().includes('3d') || userQuery.toLowerCase().includes('animation')) {
              category = 'animation';
            } else if (userQuery.toLowerCase().includes('roblox') || userQuery.toLowerCase().includes('game') || userQuery.toLowerCase().includes('unity')) {
              category = 'game-dev';
            } else if (userQuery.toLowerCase().includes('youtube') || userQuery.toLowerCase().includes('video') || userQuery.toLowerCase().includes('content')) {
              category = 'youtube';
            }
            
            const liveResources = await fetchLiveResources(userQuery, {
              category,
              skillLevel: 'beginner',
              ageRating: '13+',
              maxResults: 5,
            });
            
            youtubeVideos = liveResources.youtubeVideos.map(v => ({
              title: v.title,
              url: v.url,
              channel: v.channelTitle,
              duration: Math.round(v.duration / 60),
            }));
            
            liveResourcesFetched = true;
            
            // Add live resources to context
            if (liveResources.youtubeVideos.length > 0 || liveResources.webTutorials.length > 0) {
              memoryContext += '\n\n### LIVE LEARNING RESOURCES\n';
              
              if (liveResources.youtubeVideos.length > 0) {
                memoryContext += 'Recommended Videos:\n';
                liveResources.youtubeVideos.slice(0, 3).forEach((v, i) => {
                  memoryContext += `${i + 1}. ${v.title} (${v.channelTitle}, ${Math.round(v.duration / 60)} min)\n`;
                });
              }
              
              if (liveResources.webTutorials.length > 0) {
                memoryContext += '\nTutorials & Documentation:\n';
                liveResources.webTutorials.slice(0, 2).forEach((t, i) => {
                  memoryContext += `${i + 1}. ${t.title} (${t.source}, ${t.readingTime} min read)\n`;
                });
              }
            }
            
            console.log('✅ Live resources fetched:', {
              videos: liveResources.youtubeVideos.length,
              tutorials: liveResources.webTutorials.length,
            });
          } catch (error) {
            console.error('Live resources fetch error:', error);
          }
        }
        
        // Send sources metadata (including live resources, news, movies)
        const sourcesMetadata = JSON.stringify({ 
          type: 'metadata', 
          sources: contextSources, 
          youtubeVideos,
          liveResourcesFetched,
          newsArticles,
          movieResults,
          personResults: movieResults.filter((r: any) => r.type === 'person'),
        });
        controller.enqueue(new TextEncoder().encode(sourcesMetadata + '\n'));
        
        // ==========================================
        // STEP 3: TOOL EXECUTION (if needed)
        // ==========================================
        let toolResults: Record<string, unknown> = {};
        if (plan.needs_tools && plan.tool_actions) {
          console.log('� Executing tools:', plan.tool_actions);
          try {
            toolResults = await toolRouter(plan.tool_actions);
            // Add tool results to context
            memoryContext += '\n\n### TOOL RESULTS\n';
            memoryContext += JSON.stringify(toolResults, null, 2);
          } catch (error) {
            console.error('Tool execution error:', error);
          }
        }
        
        // ==========================================
        // STEP 4: RESPONSE GENERATION
        // ==========================================
        console.log('💬 Generating response...');
        
        // Build enhanced system prompt with memory context
        const enhancedSystemPrompt = dynamicSystemPrompt + memoryContext;
        
        if (model === 'groq' || model === 'pro') {
          // Fast agent only (Koda-A) - single pass for speed
          const result = await streamText({
            model: groqProvider.languageModel('llama-3.1-8b-instant'),
            system: enhancedSystemPrompt,
            messages,
          });
          
          for await (const chunk of result.textStream) {
            try {
              fullResponseText += chunk;
              
              // Self-correction: Detect [NEED_SEARCH: ...] pattern
              const needSearchMatch = fullResponseText.match(/\[NEED_SEARCH:\s*([^\]]+)\]/);
              if (needSearchMatch) {
                const searchQuery = needSearchMatch[1].trim();
                console.log('🔄 Self-correction triggered, searching:', searchQuery);
                
                // Remove the [NEED_SEARCH: ...] from response
                fullResponseText = fullResponseText.replace(/\[NEED_SEARCH:[^\]]+\]/, '');
                
                // Perform the search
                const searchResults = await searchDuckDuckGo(searchQuery, 3);
                if (searchResults.success && searchResults.results.length > 0) {
                  const searchContext = '\n\n**ADDITIONAL SEARCH RESULTS:**\n' + 
                    searchResults.results.map((r, i) => 
                      `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}\n`
                    ).join('\n');
                  
                  // Continue with enriched context
                  const enrichedPrompt = enhancedSystemPrompt + searchContext;
                  const continuedResult = await streamText({
                    model: groqProvider.languageModel('llama-3.1-8b-instant'),
                    system: enrichedPrompt,
                    messages: [...messages, { role: 'assistant', content: fullResponseText }],
                  });
                  
                  for await (const continuedChunk of continuedResult.textStream) {
                    fullResponseText += continuedChunk;
                    controller.enqueue(new TextEncoder().encode(continuedChunk));
                  }
                }
                break;
              }
              
              controller.enqueue(new TextEncoder().encode(chunk));
            } catch (enqueueError) {
              break;
            }
          }
        } else {
          // ==========================================
          // DUAL-LLM PATTERN: nyati-core (slow mode)
          // Step 1: Strategic Reasoning Pass
          // Step 2: Execution Pass
          // ==========================================
          console.log('🎯 Dual-LLM: Starting strategic reasoning...');
          
          // Step 1: Generate strategic draft (ADAPTIVE: use calibrated thresholds)
          const complexity: 'low' | 'medium' | 'high' = plan.confidence < 0.5 ? 'high' : plan.needs_tools ? 'medium' : 'low';
          const useSelfConsistency = shouldUseSelfConsistency(plan, complexity);
          
          if (useSelfConsistency) {
            selfConsistencyUsed = true;
            console.log('🎯 Dual-LLM: Using self-consistency (adaptive threshold)');
          }
          
          const strategicDraft = await generateConsistentStrategicDraft(
            userQuery,
            memoryContext,
            plan,
            useSelfConsistency ? 2 : 1
          );
          
          if (strategicDraft) {
            strategicDraftGenerated = true;
            console.log('📝 Dual-LLM: Strategic draft generated, proceeding to execution...');
            
            // Step 2: Generate final response using strategic draft
            const finalResponse = await generateFinalResponse(
              userQuery,
              strategicDraft,
              memoryContext,
              'nyati'
            );
            
            // Stream the final response
            const chunks = finalResponse.split(/\s+/); // Word-by-word streaming
            for (const chunk of chunks) {
              try {
                fullResponseText += chunk + ' ';
                controller.enqueue(new TextEncoder().encode(chunk + ' '));
                // Small delay for natural streaming feel
                await new Promise(r => setTimeout(r, 10));
              } catch (enqueueError) {
                break;
              }
            }
            
            // Send sources metadata for slow mode too
            const slowSourcesMetadata = JSON.stringify({ 
              type: 'metadata', 
              sources: contextSources, 
              newsArticles,
              movieResults,
              personResults: movieResults.filter((r: any) => r.type === 'person'),
            });
            controller.enqueue(new TextEncoder().encode(slowSourcesMetadata + '\n'));
          } else {
            // Fallback: single-pass for simple queries
            console.log('🔄 Dual-LLM: Skipping strategic draft (simple query), using single-pass...');
            
            const fallbackPrompt = `You are Koda-A, a helpful AI assistant.

Key facts:
- You help with coding, technical questions, learning, and casual chat
- You're a peer, not a servant - talk like a colleague
- Be natural and playful, not robotic
- For greetings like "hey" or "hru": respond casually like "yo, what's up?" or "good, you?"
- Never mention servers, systems, or infrastructure
- Keep responses short and natural

User said: "${userQuery}"

${memoryContext ? 'Context from knowledge: ' + memoryContext.split('### RELEVANT KNOWLEDGE')[1]?.slice(0, 500) : ''}`;
            
            const fallbackResult = await streamText({
              model: nyatiCore.languageModel('llama3.2:1b'),
              system: fallbackPrompt,
              messages,
              temperature: 0.9,
            });
            
            for await (const chunk of fallbackResult.textStream) {
              try {
                fullResponseText += chunk;
                controller.enqueue(new TextEncoder().encode(chunk));
              } catch (enqueueError) {
                break;
              }
            }
            
            // Send sources metadata for slow mode fallback too
            const fallbackSourcesMetadata = JSON.stringify({ 
              type: 'metadata', 
              sources: contextSources, 
              newsArticles,
              movieResults,
              personResults: movieResults.filter((r: any) => r.type === 'person'),
            });
            controller.enqueue(new TextEncoder().encode(fallbackSourcesMetadata + '\n'));
          }
        }
        
        // ==========================================
        // STEP 5: FAILURE DETECTION & VALIDATION
        // ==========================================
        const validation = await validateResponse(userQuery, fullResponseText, memoryContext, plan);
        
        if (!validation.passed) {
          console.log('⚠️ Validation issues detected:', validation.issues);
        }
        
        // Track if memory was actually useful (heuristic: mentioned in response)
        memoryActuallyUsed = memoryRetrieved && 
          sources.some(s => fullResponseText.toLowerCase().includes(s.title.toLowerCase().slice(0, 15)));
        
        // ==========================================
        // STEP 6: ADAPTIVE METRICS RECORDING
        // ==========================================
        const generationTimeMs = Date.now() - generationStartTime;
        
        const performanceMetric: PerformanceMetrics = {
          timestamp: Date.now(),
          sessionId: `${userId || 'anon'}-${Date.now()}`,
          query: userQuery,
          intent: plan.intent,
          complexity: plan.confidence < 0.5 ? 'high' : plan.needs_tools ? 'medium' : 'low',
          planConfidence: plan.confidence,
          planAccuracy: validation.passed, // Proxy: if validation passed, plan was likely accurate
          memoryRetrieved: memoryRetrieved,
          memoryUsed: memoryActuallyUsed,
          memoryContextSize: memoryContext.length,
          strategicDraftGenerated: strategicDraftGenerated,
          selfConsistencyUsed: selfConsistencyUsed,
          strategicDraftConfidence: strategicDraftGenerated ? plan.confidence : 0,
          responseLength: fullResponseText.length,
          generationTimeMs: generationTimeMs,
          directAnswer: validation.directAnswer,
          memoryContradiction: validation.memoryContradiction,
          hallucinationDetected: validation.hallucinationDetected,
          regenerated: false, // Not implemented yet
          failureType: validation.hallucinationDetected ? 'hallucination' : 
                       validation.memoryContradiction ? 'contradiction' :
                       !validation.directAnswer ? 'incomplete' : 'none',
          successEstimate: validation.passed ? plan.confidence : plan.confidence * 0.5,
        };
        
        metricsStore.recordMetric(performanceMetric);
        
        // Trigger calibration periodically (every 20 interactions)
        if (metricsStore.getStats().totalMetrics % 20 === 0) {
          console.log('🔄 Running adaptive threshold calibration...');
          metricsStore.calibrateThresholds();
        }
        
        console.log('📊 Performance metrics recorded:', {
          intent: plan.intent,
          confidence: plan.confidence,
          validation: validation.passed ? 'passed' : 'issues',
          generationTime: `${generationTimeMs}ms`,
          isExploration,
        });
        
        // ==========================================
        // STEP 7: MEMORY EVALUATION & STORAGE (ADAPTIVE)
        // ==========================================
        if (userId) {
          console.log('🧪 Evaluating memory storage (adaptive quality scoring)...');
          const evaluation = evaluateMemoryStorage(userQuery, fullResponseText, plan);
          
          // In exploration mode, be more permissive with memory storage
          if (isExploration && explorationDecision?.adjustments.memoryStorageThresholdDelta < 0) {
            console.log('🔬 Exploration: Lowering memory storage threshold');
          }
          
          if (evaluation.should_store) {
            // Calculate memory quality score
            const factId = `fact-${Date.now()}`;
            const content = `User asked: "${userQuery}" | Response included: ${fullResponseText.slice(0, 200)}...`;
            
            // Get existing facts for novelty/redundancy comparison
            const queryEmbedding = await generateEmbeddingWithRetry(userQuery);
            const existingFacts = await searchUserFacts(userId, queryEmbedding, 5);
            const existingContent = existingFacts.map(f => f.fact);
            
            const qualityScore = calculateMemoryQualityScore(
              factId,
              content,
              existingContent,
              0 // New fact - no retrieval history yet
            );
            
            // In exploration mode, adjust threshold
            const storageThreshold = isExploration && explorationDecision 
              ? 0.6 + explorationDecision.adjustments.memoryStorageThresholdDelta
              : 0.6;
            
            console.log('📊 Memory quality score:', {
              final: qualityScore.finalScore.toFixed(2),
              novelty: qualityScore.noveltyScore.toFixed(2),
              specificity: qualityScore.specificityLevel.toFixed(2),
              threshold: storageThreshold.toFixed(2),
            });
            
            // Only store if quality passes adaptive threshold
            if (qualityScore.finalScore > storageThreshold) {
              console.log('💾 Storing high-quality memory:', evaluation.reason);
              try {
                const embedding = await generateEmbeddingWithRetry(userQuery + ' ' + fullResponseText.slice(0, 500));
                await addUserFact(
                  factId,
                  userId,
                  content,
                  embedding,
                  {
                    category: evaluation.suggested_metadata?.category || 'conversation',
                    confidence: qualityScore.finalScore,
                    extractedFrom: 'intelligent_storage',
                    qualityScore: qualityScore.finalScore,
                  }
                );
                
                // Record the quality score
                metricsStore.setMemoryQuality(factId, qualityScore);
              } catch (error) {
                console.error('Memory storage error:', error);
              }
            } else {
              console.log('🚫 Memory quality too low:', qualityScore.finalScore.toFixed(2));
            }
          } else {
            console.log('🚫 Not storing:', evaluation.reason);
          }
        }
        
        // ==========================================
        // STEP 8: EXPLORATION OUTCOME RECORDING
        // ==========================================
        if (isExploration && explorationDecision) {
          recordExplorationOutcome(
            explorationDecision,
            plan,
            validation.passed,
            plan.confidence,
            generationTimeMs
          );
        }
        
        // ==========================================
        // STEP 6: REFLECTION LOGGING
        // ==========================================
        const reflection = createReflection(plan, fullResponseText, plan.confidence);
        reflection.user_query = userQuery;
        
        console.log('📝 Reflection logged:', {
          used_memory: reflection.used_memory,
          stored_memory: reflection.stored_memory,
          success_estimate: reflection.success_estimate,
        });
        
        // Store reflection (non-blocking)
        try {
          // In production, send to analytics/logging service
          // For now, just log to console
        } catch (error) {
          console.error('Reflection logging error:', error);
        }
        
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
