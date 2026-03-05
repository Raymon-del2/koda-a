/**
 * Cognitive Cache Layer
 * 
 * Phase 6.5: Instant Intelligence Amplification
 * 
 * This module implements a semantic response cache that makes Nyati appear
 * instantly smarter without additional inference calls. It caches successful
 * response patterns and retrieves them when similar queries are detected.
 * 
 * How it works:
 * 1. Cache successful responses with their embedding vectors
 * 2. For new queries, search cache for semantically similar past interactions
 * 3. If similarity > threshold and past response was successful, reuse/adapt
 * 4. Fall back to LLM only when no good cache hit
 * 
 * Benefits:
 * - Instant responses for common/repeated queries
 * - Consistent answers to similar questions
 * - Reduced inference costs
 * - Better performance under load
 */

import { generateEmbeddingWithRetry } from './embeddings';
import { metricsStore } from './adaptive-intelligence';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// CACHE TYPES
// ==========================================

export interface CachedResponse {
  id: string;
  query: string;
  queryVector: number[];
  response: string;
  intent: NyatiPlan['intent'];
  
  // Phase 8: Cache as Teacher - reasoning patterns
  reasoningPattern?: {
    problemType: string;
    steps: string[];
    keyConcepts: string[];
    cautions: string[];
    successScore: number;
  };
  
  // Success metrics
  confidence: number;
  validationPassed: boolean;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  successScore: number; // Composite score for teaching quality
  
  // Metadata
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  
  // Context for adaptation
  memoryContext?: string;
  plan?: NyatiPlan;
}

export interface CacheHit {
  found: true;
  cached: CachedResponse;
  similarity: number;
  adaptationNeeded: boolean;
  adaptedResponse?: string;
}

export interface CacheMiss {
  found: false;
  similarQueries: Array<{ query: string; similarity: number }>;
}

export type CacheResult = CacheHit | CacheMiss;

// ==========================================
// IN-MEMORY CACHE STORE
// ==========================================

class CognitiveCache {
  private cache: Map<string, CachedResponse> = new Map();
  private readonly MAX_CACHE_SIZE = 500;
  private readonly SIMILARITY_THRESHOLD = 0.85; // High threshold for quality
  private readonly ADAPTATION_THRESHOLD = 0.92; // Very high = no adaptation needed
  
  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    adaptations: 0,
    evictions: 0,
  };
  
  /**
   * Search cache for semantically similar queries
   */
  async search(queryVector: number[], intent?: NyatiPlan['intent']): Promise<CacheResult> {
    let bestMatch: CachedResponse | null = null;
    let bestSimilarity = 0;
    const similarQueries: Array<{ query: string; similarity: number }> = [];
    
    for (const [_, cached] of this.cache) {
      // Filter by intent if specified
      if (intent && cached.intent !== intent) continue;
      
      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryVector, cached.queryVector);
      
      // Track similar queries for miss case
      if (similarity > 0.7) {
        similarQueries.push({ query: cached.query, similarity });
      }
      
      // Track best match above threshold
      if (similarity > this.SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        // Only consider high-quality cached responses
        if (cached.validationPassed && cached.confidence > 0.7) {
          bestSimilarity = similarity;
          bestMatch = cached;
        }
      }
    }
    
    if (bestMatch) {
      // Update access stats
      bestMatch.accessCount++;
      bestMatch.lastAccessed = Date.now();
      this.stats.hits++;
      
      // Determine if adaptation is needed
      const adaptationNeeded = bestSimilarity < this.ADAPTATION_THRESHOLD;
      
      let adaptedResponse: string | undefined;
      if (adaptationNeeded) {
        adaptedResponse = this.adaptResponse(bestMatch, bestSimilarity);
        this.stats.adaptations++;
      }
      
      return {
        found: true,
        cached: bestMatch,
        similarity: bestSimilarity,
        adaptationNeeded,
        adaptedResponse,
      };
    }
    
    this.stats.misses++;
    
    return {
      found: false,
      similarQueries: similarQueries
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3),
    };
  }
  
  /**
   * Store a successful response in the cache
   */
  async store(
    query: string,
    queryVector: number[],
    response: string,
    plan: NyatiPlan,
    validationPassed: boolean,
    memoryContext?: string
  ): Promise<void> {
    // Don't cache if validation failed or confidence too low
    if (!validationPassed || plan.confidence < 0.6) {
      return;
    }
    
    // Don't cache simple greetings/small talk
    if (plan.intent === 'conversation' && query.length < 20) {
      return;
    }
    
    // Check for near-duplicates
    for (const [_, cached] of this.cache) {
      const similarity = cosineSimilarity(queryVector, cached.queryVector);
      if (similarity > 0.95) {
        // Update existing entry instead of creating duplicate
        cached.response = response;
        cached.confidence = Math.max(cached.confidence, plan.confidence);
        cached.validationPassed = validationPassed;
        cached.lastAccessed = Date.now();
        return;
      }
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }
    
    const id = `cache-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    // Calculate composite success score for teaching quality
    const successScore = (plan.confidence * 0.4) + 
                        (validationPassed ? 0.3 : 0) + 
                        (plan.needs_memory && memoryContext ? 0.15 : 0) +
                        (plan.confidence > 0.8 ? 0.15 : 0);
    
    const entry: CachedResponse = {
      id,
      query,
      queryVector,
      response,
      intent: plan.intent,
      confidence: plan.confidence,
      validationPassed,
      successScore,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      memoryContext,
      plan,
    };
    
    this.cache.set(id, entry);
    
    console.log('💾 Cached response:', {
      id,
      intent: plan.intent,
      confidence: plan.confidence,
      cacheSize: this.cache.size,
    });
  }
  
  /**
   * Adapt a cached response for a slightly different query
   */
  private adaptResponse(cached: CachedResponse, similarity: number): string {
    // Simple adaptation: if very similar, return as-is
    // If moderately similar, add a note about context
    
    if (similarity > 0.88) {
      // Close enough - return with minor acknowledgment
      return cached.response;
    }
    
    // For lower similarity, the caller should decide whether to use cache
    // or generate fresh. We return the original for them to modify.
    return cached.response;
  }
  
  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    let oldest: CachedResponse | null = null;
    let oldestId: string | null = null;
    
    for (const [id, cached] of this.cache) {
      if (!oldest || cached.lastAccessed < oldest.lastAccessed) {
        oldest = cached;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      this.cache.delete(oldestId);
      this.stats.evictions++;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    adaptations: number;
    evictions: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      adaptations: this.stats.adaptations,
      evictions: this.stats.evictions,
    };
  }
  
  /**
   * Get all cached entries (for admin/dashboard)
   */
  getAll(): CachedResponse[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }
  
  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, adaptations: 0, evictions: 0 };
  }
}

// Singleton instance
export const cognitiveCache = new CognitiveCache();

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimension');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// CACHE INTEGRATION API
// ==========================================

/**
 * Try to get a cached response for a query
 * Returns null if no suitable cache hit
 */
export async function tryCachedResponse(
  query: string,
  intent?: NyatiPlan['intent']
): Promise<{ response: string; fromCache: true; similarity: number } | null> {
  const queryVector = await generateEmbeddingWithRetry(query);
  const result = await cognitiveCache.search(queryVector, intent);
  
  if (result.found) {
    // Use adapted response if available, otherwise original
    const response = result.adaptedResponse || result.cached.response;
    
    console.log('⚡ Cache hit:', {
      similarity: result.similarity.toFixed(2),
      adapted: result.adaptationNeeded,
      originalQuery: result.cached.query.slice(0, 50),
    });
    
    return {
      response,
      fromCache: true,
      similarity: result.similarity,
    };
  }
  
  return null;
}

/**
 * Store a successful response in cache
 */
export async function cacheResponse(
  query: string,
  response: string,
  plan: NyatiPlan,
  validationPassed: boolean,
  memoryContext?: string
): Promise<void> {
  const queryVector = await generateEmbeddingWithRetry(query);
  await cognitiveCache.store(query, queryVector, response, plan, validationPassed, memoryContext);
}

/**
 * Phase 8: Cache as Teacher
 * 
 * When similar query appears, inject reasoning pattern into strategic pass.
 * This makes the cache improve reasoning, not just speed.
 */
export async function getTeachingFromCache(
  query: string,
  intent?: NyatiPlan['intent']
): Promise<{
  pattern: CachedResponse['reasoningPattern'];
  similarity: number;
  shouldInject: boolean;
} | null> {
  const queryVector = await generateEmbeddingWithRetry(query);
  const result = await cognitiveCache.search(queryVector, intent);
  
  if (!result.found) {
    return null;
  }
  
  const cached = result.cached;
  
  // Only inject if we have a reasoning pattern and high success score
  if (!cached.reasoningPattern && cached.successScore < 0.8) {
    return null;
  }
  
  // High-quality cache hit - use as teacher
  if (result.similarity > 0.80 && cached.successScore > 0.75) {
    console.log('📚 Cache teaching:', {
      pattern: cached.reasoningPattern?.problemType || 'general',
      successScore: cached.successScore.toFixed(2),
      similarity: result.similarity.toFixed(2),
    });
    
    return {
      pattern: cached.reasoningPattern || {
        problemType: cached.intent,
        steps: ['analyze', 'reason', 'respond'],
        keyConcepts: [],
        cautions: [],
        successScore: cached.successScore,
      },
      similarity: result.similarity,
      shouldInject: true,
    };
  }
  
  return null;
}

/**
 * Store reasoning pattern alongside cached response
 * Call this after successful strategic draft generation
 */
export async function cacheWithReasoningPattern(
  query: string,
  response: string,
  plan: NyatiPlan,
  validationPassed: boolean,
  reasoningPattern: {
    problemType: string;
    steps: string[];
    keyConcepts: string[];
    cautions: string[];
  },
  memoryContext?: string
): Promise<void> {
  const queryVector = await generateEmbeddingWithRetry(query);
  
  // Calculate success score with reasoning pattern bonus
  const successScore = (plan.confidence * 0.35) + 
                      (validationPassed ? 0.25 : 0) + 
                      (0.25) + // Bonus for having reasoning pattern
                      (plan.confidence > 0.8 ? 0.15 : 0);
  
  // Check for near-duplicates
  for (const [_, cached] of cognitiveCache['cache']) {
    const similarity = cosineSimilarity(queryVector, cached.queryVector);
    if (similarity > 0.95) {
      // Update with reasoning pattern
      cached.reasoningPattern = {
        ...reasoningPattern,
        successScore,
      };
      cached.successScore = Math.max(cached.successScore, successScore);
      cached.lastAccessed = Date.now();
      return;
    }
  }
  
  // Evict oldest if at capacity
  if (cognitiveCache['cache'].size >= 500) {
    cognitiveCache['evictLRU']();
  }
  
  const id = `cache-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  const entry: CachedResponse = {
    id,
    query,
    queryVector,
    response,
    intent: plan.intent,
    reasoningPattern: {
      ...reasoningPattern,
      successScore,
    },
    confidence: plan.confidence,
    validationPassed,
    successScore,
    createdAt: Date.now(),
    accessCount: 0,
    lastAccessed: Date.now(),
    memoryContext,
    plan,
  };
  
  cognitiveCache['cache'].set(id, entry);
  
  console.log('💾 Cached with reasoning pattern:', {
    id,
    pattern: reasoningPattern.problemType,
    successScore: successScore.toFixed(2),
  });
}

// ==========================================
// SMART CACHE STRATEGY
// ==========================================

export interface CacheStrategy {
  // When to use cache vs generate fresh
  useCache: boolean;
  minSimilarity: number;
  requireValidation: boolean;
  
  // Adaptation rules
  allowAdaptation: boolean;
  maxAdaptationSimilarity: number;
}

/**
 * Get cache strategy based on system state
 */
export function getCacheStrategy(): CacheStrategy {
  const stats = cognitiveCache.getStats();
  const systemStats = metricsStore.getStats();
  
  // Conservative strategy when cache is small
  if (stats.size < 50) {
    return {
      useCache: true,
      minSimilarity: 0.90, // Very high threshold
      requireValidation: true,
      allowAdaptation: false,
      maxAdaptationSimilarity: 0,
    };
  }
  
  // Balanced strategy for normal operation
  if (stats.hitRate > 0.3) {
    return {
      useCache: true,
      minSimilarity: 0.85,
      requireValidation: true,
      allowAdaptation: true,
      maxAdaptationSimilarity: 0.92,
    };
  }
  
  // Aggressive caching if hit rate is low (try to build cache)
  return {
    useCache: true,
    minSimilarity: 0.80,
    requireValidation: false,
    allowAdaptation: true,
    maxAdaptationSimilarity: 0.90,
  };
}

// ==========================================
// WARM CACHE WITH COMMON PATTERNS
// ==========================================

const WARM_PATTERNS = [
  {
    query: "What can you help me with?",
    response: "I can help with a wide range of tasks including answering questions, writing and debugging code, analyzing data, explaining concepts, and having conversations on technical topics. What would you like to work on?",
    intent: "question" as const,
  },
  {
    query: "Who are you?",
    response: "I'm Nyati, an AI assistant focused on providing structured, accurate responses. I'm designed to be direct and helpful, especially with technical tasks, coding, and analysis. What can I help you with today?",
    intent: "question" as const,
  },
  {
    query: "How do I get started?",
    response: "To get started, just ask me anything! You can ask questions, request code, ask for explanations, or have me analyze something. I'm particularly good at technical tasks and structured problem-solving. What would you like to explore?",
    intent: "question" as const,
  },
];

/**
 * Pre-populate cache with common patterns
 * Call this on system startup
 */
export async function warmCache(): Promise<void> {
  console.log('🔥 Warming cognitive cache...');
  
  for (const pattern of WARM_PATTERNS) {
    const queryVector = await generateEmbeddingWithRetry(pattern.query);
    
    await cognitiveCache.store(
      pattern.query,
      queryVector,
      pattern.response,
      {
        intent: pattern.intent,
        needs_memory: false,
        needs_tools: false,
        store_memory: false,
        confidence: 0.95,
      },
      true
    );
  }
  
  console.log('🔥 Cache warmed with', WARM_PATTERNS.length, 'patterns');
}
