/**
 * Streaming Chat Module
 * 
 * Implements async streaming responses using ReadableStream/SSE
 * for fast, interactive chat experiences with Nyati
 * 
 * Features:
 * - Server-Sent Events (SSE) streaming
 * - Cache-first, fetch-second architecture
 * - Partial response generation (Dual-LLM)
 * - Live resource injection during streaming
 * - Experimental mode support
 */

import { fetchLiveResources, getRelatedVideos, type ResourceFetchResult } from './live-resources';
import { performSecurityCheck } from './security';
import { generateEmbeddingWithRetry } from './embeddings';
import { searchUserFacts } from './qdrant';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface StreamContext {
  userId: string;
  sessionId: string;
  query: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  ageRating: '8+' | '13+' | '18+';
  category?: string;
  experimental?: boolean;
  streaming?: boolean;
}

export interface StreamChunk {
  type: 'text' | 'resource' | 'resource_update' | 'experimental' | 'complete' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface StreamingOptions {
  enableCache?: boolean;
  enableLiveResources?: boolean;
  enableExperimental?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface CachedChatResponse {
  content: string;
  resources?: ResourceFetchResult;
  experimental?: boolean;
  confidence?: number;
  timestamp: number;
  query: string;
}

// ==========================================
// CACHE LAYER
// ==========================================

const chatCache = new Map<string, CachedChatResponse>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for chat responses

/**
 * Generate cache key for chat queries
 */
export function generateChatCacheKey(query: string, context: Partial<StreamContext>): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalized}_${context.skillLevel || 'any'}_${context.category || 'any'}`;
}

/**
 * Get cached chat response if valid
 */
export function getCachedChatResponse(query: string, context: Partial<StreamContext>): CachedChatResponse | null {
  const key = generateChatCacheKey(query, context);
  const cached = chatCache.get(key);
  
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    chatCache.delete(key);
    return null;
  }
  
  return cached;
}

/**
 * Cache chat response
 */
export function cacheChatResponse(
  query: string,
  context: Partial<StreamContext>,
  response: Omit<CachedChatResponse, 'timestamp' | 'query'>
): void {
  const key = generateChatCacheKey(query, context);
  
  // Enforce max cache size
  if (chatCache.size >= 100) {
    const oldestKey = chatCache.keys().next().value;
    if (oldestKey) chatCache.delete(oldestKey);
  }
  
  chatCache.set(key, {
    ...response,
    timestamp: Date.now(),
    query,
  });
}

// ==========================================
// STREAMING RESPONSE GENERATOR
// ==========================================

/**
 * Create streaming response with cache-first, fetch-second architecture
 */
export async function createStreamingChatResponse(
  context: StreamContext,
  options: StreamingOptions = {}
): Promise<ReadableStream> {
  const {
    enableCache = true,
    enableLiveResources = true,
    enableExperimental = false,
    maxTokens = 2000,
    temperature = 0.7,
  } = options;
  
  const encoder = new TextEncoder();
  
  // Security check
  const security = performSecurityCheck(context.query, context.userId, true);
  if (!security.passed) {
    return new ReadableStream({
      start(controller) {
        const chunk: StreamChunk = {
          type: 'error',
          content: security.message,
          timestamp: Date.now(),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        controller.close();
      },
    });
  }
  
  return new ReadableStream({
    async start(controller) {
      const sendChunk = (chunk: StreamChunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };
      
      try {
        // 1. Check cache first
        if (enableCache) {
          const cached = getCachedChatResponse(context.query, context);
          if (cached && !enableExperimental) {
            // Stream cached content in chunks for interactivity
            const words = cached.content.split(' ');
            const chunkSize = 5;
            
            for (let i = 0; i < words.length; i += chunkSize) {
              const chunk: StreamChunk = {
                type: 'text',
                content: words.slice(i, i + chunkSize).join(' ') + ' ',
                timestamp: Date.now(),
              };
              sendChunk(chunk);
              // Small delay for natural streaming feel
              await delay(50);
            }
            
            // Send cached resources
            if (cached.resources) {
              const resourceChunk: StreamChunk = {
                type: 'resource',
                content: 'Cached resources available',
                metadata: { resources: cached.resources },
                timestamp: Date.now(),
              };
              sendChunk(resourceChunk);
            }
            
            sendChunk({ type: 'complete', content: '', timestamp: Date.now() });
            controller.close();
            return;
          }
        }
        
        // 2. Start streaming response generation
        const responseBuffer: string[] = [];
        
        // Simulate streaming text generation (replace with actual LLM streaming)
        const generateStream = async () => {
          // In production, this would use actual LLM streaming
          // For now, simulate progressive generation
          const simulatedResponse = await generatePartialResponse(context, maxTokens);
          
          for (const segment of simulatedResponse.segments) {
            responseBuffer.push(segment.text);
            
            const chunk: StreamChunk = {
              type: segment.type,
              content: segment.text,
              metadata: segment.metadata,
              timestamp: Date.now(),
            };
            sendChunk(chunk);
            
            await delay(segment.delay || 100);
          }
          
          return simulatedResponse.fullText;
        };
        
        // 3. Fetch live resources in parallel (if enabled)
        let resourcePromise: Promise<ResourceFetchResult | null> = Promise.resolve(null);
        if (enableLiveResources && context.category) {
          resourcePromise = fetchLiveResourcesWithTimeout(context);
        }
        
        // 4. Run generation and resource fetch concurrently
        const [fullResponse, resources] = await Promise.all([
          generateStream(),
          resourcePromise,
        ]);
        
        // 5. Send resource update if available
        if (resources && resources.totalResults > 0) {
          const resourceChunk: StreamChunk = {
            type: 'resource_update',
            content: `Found ${resources.totalResults} live resources`,
            metadata: { 
              resources,
              relatedVideos: resources.youtubeVideos.map(v => ({
                id: v.id,
                title: v.title,
                related: getRelatedVideos(v.id, context.query, context.category as any, context.skillLevel as any),
              })),
            },
            timestamp: Date.now(),
          };
          sendChunk(resourceChunk);
        }
        
        // 6. Cache the complete response
        if (enableCache) {
          cacheChatResponse(context.query, context, {
            content: fullResponse,
            resources: resources || undefined,
            experimental: enableExperimental,
          });
        }
        
        // 7. Send completion
        sendChunk({ type: 'complete', content: '', timestamp: Date.now() });
        controller.close();
        
      } catch (error) {
        console.error('Streaming error:', error);
        sendChunk({
          type: 'error',
          content: error instanceof Error ? error.message : 'Stream failed',
          timestamp: Date.now(),
        });
        controller.close();
      }
    },
  });
}

/**
 * Generate partial response segments (simulates Dual-LLM streaming)
 */
async function generatePartialResponse(
  context: StreamContext,
  maxTokens: number
): Promise<{ segments: Array<{type: 'text', text: string, delay?: number, metadata?: Record<string, unknown>}>, fullText: string }> {
  
  // In production, this would call actual LLM with streaming
  // For now, simulate progressive response generation
  
  const segments: Array<{type: 'text', text: string, delay?: number, metadata?: Record<string, unknown>}> = [];
  
  // Simulate strategic draft phase
  segments.push({
    type: 'text',
    text: `Thinking about ${context.query}... `,
    delay: 200,
    metadata: { phase: 'draft' },
  });
  
  // Simulate execution phase with progressive output
  const responseParts = [
    "Based on your question, ",
    "I can help you learn about this topic. ",
    "Here's what you need to know: ",
    "\n\n1. Start with the basics\n",
    "2. Practice with examples\n",
    "3. Build real projects\n\n",
    "Would you like me to suggest some specific resources?",
  ];
  
  for (const part of responseParts) {
    segments.push({
      type: 'text',
      text: part,
      delay: part.includes('\n') ? 300 : 150,
    });
  }
  
  return {
    segments,
    fullText: segments.map(s => s.text).join(''),
  };
}

/**
 * Fetch live resources with timeout
 */
async function fetchLiveResourcesWithTimeout(
  context: StreamContext,
  timeoutMs: number = 5000
): Promise<ResourceFetchResult | null> {
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Resource fetch timeout')), timeoutMs);
  });
  
  try {
    const fetchPromise = fetchLiveResources(context.query, {
      category: context.category as any,
      skillLevel: context.skillLevel,
      ageRating: context.ageRating,
      maxResults: 5,
    });
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Live resource fetch failed or timed out:', error);
    return null;
  }
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// EXPERIMENTAL MODE
// ==========================================

/**
 * Detect if query is experimental (truth-seeking)
 */
export function detectExperimentalIntent(query: string): boolean {
  const experimentalKeywords = [
    'tell me about',
    'is it true that',
    'experimental',
    'what do you think',
    'research',
    'investigate',
    'find out',
    'learn about',
    'discover',
  ];
  
  const queryLower = query.toLowerCase();
  return experimentalKeywords.some(kw => queryLower.includes(kw));
}

/**
 * Create experimental streaming response with multi-source aggregation
 */
export async function createExperimentalStream(
  context: StreamContext,
  sources: string[]
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const sendChunk = (chunk: StreamChunk) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };
      
      try {
        sendChunk({
          type: 'experimental',
          content: '🔬 Experimental Mode: Researching multiple sources...',
          metadata: { sources },
          timestamp: Date.now(),
        });
        
        // Aggregate sources (simulated)
        const findings = await aggregateSources(context.query, sources);
        
        // Stream findings with confidence scoring
        for (const finding of findings) {
          sendChunk({
            type: 'text',
            content: finding.text,
            metadata: {
              confidence: finding.confidence,
              source: finding.source,
            },
            timestamp: Date.now(),
          });
          await delay(200);
        }
        
        // Disclaimer
        sendChunk({
          type: 'experimental',
          content: '\n\n⚠️ This is experimental and believed to be true based on available sources, but may not be fully verified.',
          metadata: { disclaimer: true },
          timestamp: Date.now(),
        });
        
        sendChunk({ type: 'complete', content: '', timestamp: Date.now() });
        controller.close();
        
      } catch (error) {
        sendChunk({
          type: 'error',
          content: 'Experimental research failed',
          timestamp: Date.now(),
        });
        controller.close();
      }
    },
  });
}

/**
 * Aggregate multiple sources (placeholder for actual implementation)
 */
async function aggregateSources(
  query: string,
  sources: string[]
): Promise<Array<{text: string; confidence: 'low' | 'medium' | 'high'; source: string}>> {
  // In production, this would scrape/search multiple sources
  // and use LLM to synthesize findings
  
  return [
    {
      text: `Researching "${query}" across ${sources.length} sources...\n\n`,
      confidence: 'medium',
      source: 'aggregator',
    },
    {
      text: 'Initial findings suggest multiple perspectives exist on this topic.\n',
      confidence: 'medium',
      source: 'synthesis',
    },
    {
      text: 'Further investigation may be needed for definitive conclusions.',
      confidence: 'low',
      source: 'analysis',
    },
  ];
}

// ==========================================
// EXPORTS
// ==========================================

export {
  chatCache,
  CACHE_TTL_MS,
};
