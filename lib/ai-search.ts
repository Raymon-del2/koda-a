/**
 * AI Search Layer - Semantic Search with Embeddings
 * 
 * Integrates Qdrant vector search, live resources, and LLM re-ranking
 * for intelligent resource discovery
 * 
 * Features:
 * - Semantic search using Qdrant embeddings
 * - Hybrid search (vector + keyword)
 * - LLM-assisted re-ranking
 * - Resource freshness scoring
 * - Multi-modal search (videos, articles, tutorials)
 */

import { generateEmbeddingWithRetry } from './embeddings';
import { 
  searchUserFacts, 
  searchLearningMaterials, 
  qdrantClient, 
  COLLECTIONS 
} from './qdrant';
import { fetchLiveResources, getRelatedVideos, type YouTubeVideo } from './live-resources';
import { scrapeMultipleSources, type ScrapingResult } from './multi-source-scraper';
import { validateResourceUrl } from './security';
import { 
  detectDevIntent, 
  generateDevRecommendation, 
  type DevRecommendation 
} from './dev-recommendations';
import { resourceService, type LearningResource, type SkillLevel, type ContentCategory } from './learning-platform';
import { searchDuckDuckGo, type DuckDuckGoResult } from './duckduckgo-search';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type SearchMode = 'semantic' | 'hybrid' | 'experimental' | 'dev';

export interface SearchParams {
  query: string;
  userId: string;
  mode?: SearchMode;
  skillLevel?: SkillLevel;
  category?: ContentCategory;
  ageRating?: '8+' | '13+' | '18+';
  limit?: number;
  includeCached?: boolean;
  includeLive?: boolean;
  includeDevRecommendations?: boolean;
}

export interface SearchResult {
  resources: EnrichedResource[];
  totalResults: number;
  semanticScore: number;
  freshnessScore: number;
  confidence: 'low' | 'medium' | 'high';
  query: string;
  searchTime: number;
  sources: string[];
  devRecommendation?: DevRecommendation;
  relatedQueries: string[];
  disclaimer?: string;
}

export interface EnrichedResource extends LearningResource {
  semanticScore: number;
  relevanceScore: number;
  freshnessScore: number;
  safetyScore: number;
  overallScore: number;
  rank: number;
  relatedResources?: string[];
  aiSummary?: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface EmbeddingDocument {
  id: string;
  text: string;
  vector: number[];
  metadata: {
    title: string;
    description: string;
    category: string;
    skillLevel: string;
    source: string;
    url: string;
    timestamp: number;
    type: 'video' | 'article' | 'tutorial' | 'workflow' | 'doc';
  };
}

// ==========================================
// SEMANTIC SEARCH
// ==========================================

/**
 * Perform semantic search using Qdrant embeddings
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<Array<{id: string; score: number; payload: any}>> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbeddingWithRetry(query);
    
    // Search in knowledge base
    const results = await qdrantClient.search(COLLECTIONS.KNOWLEDGE_BASE, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
    });
    
    return results.map((hit: any) => ({
      id: hit.id,
      score: hit.score,
      payload: hit.payload,
    }));
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return [];
  }
}

/**
 * Hybrid search combining semantic + keyword filtering
 */
export async function hybridSearch(
  query: string,
  params: {
    category?: ContentCategory;
    skillLevel?: SkillLevel;
    limit?: number;
  }
): Promise<Array<{id: string; score: number; payload: any}>> {
  const { category, skillLevel, limit = 10 } = params;
  
  try {
    const queryEmbedding = await generateEmbeddingWithRetry(query);
    
    // Build filter conditions
    const mustConditions: any[] = [];
    
    if (category) {
      mustConditions.push({
        key: 'category',
        match: { value: category },
      });
    }
    
    if (skillLevel) {
      mustConditions.push({
        key: 'skillLevel',
        match: { value: skillLevel },
      });
    }
    
    const results = await qdrantClient.search(COLLECTIONS.KNOWLEDGE_BASE, {
      vector: queryEmbedding,
      limit,
      filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
      with_payload: true,
    });
    
    return results.map((hit: any) => ({
      id: hit.id,
      score: hit.score,
      payload: hit.payload,
    }));
  } catch (error) {
    console.error('❌ Hybrid search failed:', error);
    return [];
  }
}

// ==========================================
// AI-GUIDED RESOURCE SELECTION
// ==========================================

/**
 * Main AI search function - orchestrates multiple search strategies
 */
export async function aiSearch(params: SearchParams): Promise<SearchResult> {
  const startTime = Date.now();
  const {
    query,
    userId,
    mode = 'hybrid',
    skillLevel = 'beginner',
    category,
    ageRating = '13+',
    limit = 10,
    includeCached = true,
    includeLive = true,
    includeDevRecommendations = true,
  } = params;
  
  console.log(`🔍 AI Search: "${query}" (mode: ${mode})`);
  
  const allResources: EnrichedResource[] = [];
  const sources: string[] = [];
  let devRecommendation: DevRecommendation | undefined;
  
  // 1. Check for development intent
  const devIntent = detectDevIntent(query);
  if (devIntent.intent === 'build' && includeDevRecommendations) {
    devRecommendation = generateDevRecommendation(query);
    sources.push('dev-recommendations');
  }
  
  // 2. Semantic search from knowledge base
  if (mode === 'semantic' || mode === 'hybrid') {
    const semanticResults = await hybridSearch(query, {
      category,
      skillLevel,
      limit: limit * 2,
    });
    
    for (const result of semanticResults) {
      const resource = await enrichResourceFromPayload(result.payload, result.score);
      if (resource) {
        allResources.push(resource);
      }
    }
    
    sources.push('semantic-search');
  }
  
  // 3. User's personal learning materials
  const queryEmbedding = await generateEmbeddingWithRetry(query);
  const personalMaterials = await searchLearningMaterials(userId, queryEmbedding, limit);
  
  for (const material of personalMaterials) {
    const resource: EnrichedResource = {
      id: material.id,
      title: material.topic,
      description: material.content.slice(0, 200),
      category: 'coding',
      skillLevel: material.level as SkillLevel,
      ageRating: '13+',
      url: material.pdfUrl || '',
      source: 'personal',
      type: 'article',
      duration: 0,
      rating: 0.9,
      tags: [material.topic],
      prerequisites: [],
      lastVerified: material.timestamp || Date.now(),
      safetyChecked: true,
      language: 'en',
      isFree: true,
      semanticScore: 0.85,
      relevanceScore: 0.9,
      freshnessScore: calculateFreshnessScore(material.timestamp),
      safetyScore: 1.0,
      overallScore: 0.88,
      rank: 0,
      confidence: 'high',
    };
    allResources.push(resource);
  }
  
  sources.push('personal-materials');
  
  // 4. Live resources (YouTube) with caching
  if (includeLive && (mode === 'hybrid' || mode === 'experimental')) {
    const liveResult = await fetchLiveResources(query, {
      category: category as any,
      skillLevel,
      ageRating,
      maxResults: limit,
    });
    
    for (const video of liveResult.youtubeVideos) {
      const resource: EnrichedResource = {
        id: `yt_${video.id}`,
        title: video.title,
        description: video.description.slice(0, 200),
        category: category || 'coding',
        skillLevel,
        ageRating,
        url: video.url,
        source: 'youtube',
        type: 'video',
        duration: video.duration,
        rating: video.viewCount > 10000 ? 0.9 : 0.7,
        tags: video.tags.slice(0, 5),
        prerequisites: [],
        lastVerified: new Date(video.publishedAt).getTime(),
        safetyChecked: true,
        language: 'en',
        isFree: true,
        semanticScore: 0.7,
        relevanceScore: 0.75,
        freshnessScore: calculateFreshnessScore(new Date(video.publishedAt).getTime()),
        safetyScore: 1.0,
        overallScore: 0.75,
        rank: 0,
        relatedResources: getRelatedVideos(video.id, query, category, skillLevel).map(v => `yt_${v.id}`),
        confidence: video.viewCount > 50000 ? 'high' : 'medium',
      };
      allResources.push(resource);
    }
    
    sources.push('live-resources');
  }
  
  // 5. DuckDuckGo web search (always enabled for hybrid mode)
  if (mode === 'hybrid' || mode === 'experimental') {
    console.log('🔍 Searching DuckDuckGo...');
    const ddgResults = await searchDuckDuckGo(query, limit);
    
    if (ddgResults.success && ddgResults.results.length > 0) {
      for (const result of ddgResults.results) {
        const resource: EnrichedResource = {
          id: `ddg_${Buffer.from(result.url).toString('base64').slice(0, 20)}`,
          title: result.title,
          description: result.snippet,
          category: category || 'coding',
          skillLevel,
          ageRating,
          url: result.url,
          source: result.domain,
          type: 'article',
          duration: 0,
          rating: 0.7,
          tags: ['web-search'],
          prerequisites: [],
          lastVerified: Date.now(),
          safetyChecked: true,
          language: 'en',
          isFree: true,
          semanticScore: 0.6,
          relevanceScore: 0.7,
          freshnessScore: 1.0, // Just fetched
          safetyScore: 0.9,
          overallScore: 0.7,
          rank: 0,
          confidence: 'medium',
        };
        allResources.push(resource);
      }
      sources.push('duckduckgo');
    }
  }
  
  // 6. Curated resources from learning platform
  const curatedResources = resourceService.searchResources({
    query,
    category: category as any,
    skillLevel,
    ageRating,
    limit: limit * 2,
  });
  
  for (const res of curatedResources) {
    const enriched: EnrichedResource = {
      ...res,
      semanticScore: 0.6,
      relevanceScore: 0.7,
      freshnessScore: calculateFreshnessScore(res.lastVerified),
      safetyScore: 1.0,
      overallScore: 0.68,
      rank: 0,
      confidence: (res.rating ?? 0) > 0.8 ? 'high' : 'medium',
    };
    allResources.push(enriched);
  }
  
  sources.push('curated-db');
  
  // 7. Multi-source scraping for experimental mode
  if (mode === 'experimental') {
    const scrapingResult = await scrapeMultipleSources(query, {
      maxSources: 5,
      timeoutMs: 5000,
    });
    
    for (const source of scrapingResult.sources) {
      const resource: EnrichedResource = {
        id: `web_${Buffer.from(source.url).toString('base64').slice(0, 20)}`,
        title: source.title,
        description: source.content.slice(0, 200),
        category: category || 'coding',
        skillLevel,
        ageRating,
        url: source.url,
        source: source.source,
        type: 'article',
        duration: 0,
        rating: source.reliability,
        tags: [source.sourceType],
        prerequisites: [],
        lastVerified: source.fetchedAt,
        safetyChecked: true,
        language: 'en',
        isFree: true,
        semanticScore: source.reliability * 0.8,
        relevanceScore: 0.65,
        freshnessScore: 1.0, // Just fetched
        safetyScore: 0.95,
        overallScore: source.reliability * 0.75,
        rank: 0,
        confidence: source.confidence,
      };
      allResources.push(resource);
    }
    
    sources.push('web-scraping');
  }
  
  // 7. Deduplicate and re-rank using LLM-assisted scoring
  const uniqueResources = deduplicateResources(allResources);
  const rankedResources = await llmRerankResources(uniqueResources, query, limit);
  
  // Calculate scores
  const searchTime = Date.now() - startTime;
  const avgSemanticScore = rankedResources.reduce((sum, r) => sum + r.semanticScore, 0) / rankedResources.length || 0;
  const avgFreshnessScore = rankedResources.reduce((sum, r) => sum + r.freshnessScore, 0) / rankedResources.length || 0;
  
  // Determine overall confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (avgSemanticScore > 0.8 && rankedResources.filter(r => r.confidence === 'high').length > 3) {
    confidence = 'high';
  } else if (avgSemanticScore < 0.5 || rankedResources.length < 3) {
    confidence = 'low';
  }
  
  // Generate related queries for follow-up
  const relatedQueries = generateRelatedQueries(query, category, skillLevel);
  
  return {
    resources: rankedResources,
    totalResults: rankedResources.length,
    semanticScore: avgSemanticScore,
    freshnessScore: avgFreshnessScore,
    confidence,
    query,
    searchTime,
    sources: [...new Set(sources)],
    devRecommendation,
    relatedQueries,
    disclaimer: mode === 'experimental' ? 
      '⚠️ This search used experimental web sources. Verify critical information independently.' : 
      undefined,
  };
}

/**
 * Enrich resource from Qdrant payload
 */
async function enrichResourceFromPayload(
  payload: any,
  semanticScore: number
): Promise<EnrichedResource | null> {
  if (!payload) return null;
  
  const now = Date.now();
  const timestamp = payload.timestamp || now;
  
  return {
    id: payload.id || `kb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title: payload.title || 'Untitled',
    description: payload.description || payload.text?.slice(0, 200) || '',
    category: payload.category || 'coding',
    skillLevel: payload.skillLevel || 'beginner',
    ageRating: payload.ageRating || '13+',
    url: payload.url || '',
    source: payload.source || 'knowledge-base',
    type: payload.type || 'article',
    duration: payload.duration || 0,
    rating: 0.75,
    tags: payload.tags || [],
    prerequisites: [],
    lastVerified: timestamp,
    safetyChecked: true,
    language: 'en',
    isFree: true,
    semanticScore,
    relevanceScore: semanticScore * 0.9,
    freshnessScore: calculateFreshnessScore(timestamp),
    safetyScore: payload.safetyScore || 1.0,
    overallScore: 0.7,
    rank: 0,
    confidence: semanticScore > 0.8 ? 'high' : semanticScore > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Calculate freshness score (0-1 based on age)
 */
function calculateFreshnessScore(timestamp: number): number {
  const age = Date.now() - timestamp;
  const year = 365 * 24 * 60 * 60 * 1000;
  
  if (age < 30 * 24 * 60 * 60 * 1000) return 1.0; // < 1 month
  if (age < 6 * 30 * 24 * 60 * 60 * 1000) return 0.9; // < 6 months
  if (age < year) return 0.7; // < 1 year
  if (age < 2 * year) return 0.5; // < 2 years
  return 0.3; // > 2 years
}

/**
 * Deduplicate resources by URL
 */
function deduplicateResources(resources: EnrichedResource[]): EnrichedResource[] {
  const seen = new Set<string>();
  const unique: EnrichedResource[] = [];
  
  for (const resource of resources) {
    const url = resource.url.toLowerCase();
    if (!seen.has(url) && url.length > 0) {
      seen.add(url);
      unique.push(resource);
    }
  }
  
  return unique;
}

/**
 * LLM-assisted re-ranking of resources
 */
async function llmRerankResources(
  resources: EnrichedResource[],
  query: string,
  limit: number
): Promise<EnrichedResource[]> {
  // In production, this would call an LLM to re-rank
  // For now, use weighted scoring
  
  const scored = resources.map(r => ({
    ...r,
    overallScore: (
      r.semanticScore * 0.4 +
      r.relevanceScore * 0.3 +
      r.freshnessScore * 0.2 +
      r.safetyScore * 0.1
    ),
  }));
  
  // Sort by overall score
  scored.sort((a, b) => b.overallScore - a.overallScore);
  
  // Assign ranks
  scored.forEach((r, i) => {
    r.rank = i + 1;
  });
  
  return scored.slice(0, limit);
}

/**
 * Generate related queries for exploration
 */
function generateRelatedQueries(
  query: string,
  category?: ContentCategory,
  skillLevel?: SkillLevel
): string[] {
  const related: string[] = [];
  const base = query.toLowerCase();
  
  if (category) {
    related.push(`${category} tutorial for ${skillLevel || 'beginners'}`);
    related.push(`best ${category} resources`);
  }
  
  if (!base.includes('example')) {
    related.push(`${query} examples`);
  }
  
  if (!base.includes('project')) {
    related.push(`${query} project ideas`);
  }
  
  if (!base.includes('advanced')) {
    related.push(`advanced ${query}`);
  }
  
  return related.slice(0, 4);
}

// ==========================================
// DOCUMENT INDEXING
// ==========================================

/**
 * Index a resource document in Qdrant for semantic search
 */
export async function indexResourceDocument(
  doc: Omit<EmbeddingDocument, 'id'>,
  userId: string
): Promise<boolean> {
  try {
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    await qdrantClient.upsert(COLLECTIONS.KNOWLEDGE_BASE, {
      points: [
        {
          id,
          vector: doc.vector,
          payload: {
            ...doc.metadata,
            text: doc.text,
            user_id: userId,
            indexed_at: Date.now(),
          },
        },
      ],
    });
    
    console.log('✅ Indexed document:', doc.metadata.title);
    return true;
  } catch (error) {
    console.error('❌ Failed to index document:', error);
    return false;
  }
}

/**
 * Batch index multiple resources
 */
export async function batchIndexResources(
  docs: Omit<EmbeddingDocument, 'id'>[],
  userId: string
): Promise<number> {
  let successCount = 0;
  
  for (const doc of docs) {
    const success = await indexResourceDocument(doc, userId);
    if (success) successCount++;
  }
  
  return successCount;
}

// ==========================================
// EXPORTS
// ==========================================

export {
  calculateFreshnessScore,
  deduplicateResources,
};
