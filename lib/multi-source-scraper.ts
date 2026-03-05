/**
 * Multi-Source Web Scraper with Confidence Scoring
 * 
 * Aggregates information from multiple sources for experimental queries
 * Implements confidence scoring and source validation
 * 
 * Features:
 * - Multi-source aggregation (wikis, docs, blogs, news)
 * - Confidence scoring (low/medium/high)
 * - Source reliability tracking
 * - Content deduplication
 * - Safety validation via security module
 */

import { validateResourceUrl } from './security';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface SourceResult {
  url: string;
  title: string;
  content: string;
  source: string;
  sourceType: 'wiki' | 'doc' | 'blog' | 'news' | 'academic' | 'official';
  fetchedAt: number;
  reliability: number; // 0-1
  confidence: ConfidenceLevel;
}

export interface AggregatedFinding {
  claim: string;
  supportingSources: string[];
  contradictingSources: string[];
  confidence: ConfidenceLevel;
  consensus: number; // Percentage agreement
}

export interface ScrapingConfig {
  maxSources: number;
  timeoutMs: number;
  minReliability: number;
  enableDeduplication: boolean;
  requireHTTPS: boolean;
  trustedDomains: string[];
}

export interface ScrapingResult {
  query: string;
  sources: SourceResult[];
  findings: AggregatedFinding[];
  overallConfidence: ConfidenceLevel;
  disclaimer: string;
  scrapedAt: number;
  totalSources: number;
  validSources: number;
}

// ==========================================
// DEFAULT CONFIGURATION
// ==========================================

const DEFAULT_CONFIG: ScrapingConfig = {
  maxSources: 10,
  timeoutMs: 8000,
  minReliability: 0.6,
  enableDeduplication: true,
  requireHTTPS: true,
  trustedDomains: [
    'wikipedia.org',
    'docs.python.org',
    'developer.mozilla.org',
    'react.dev',
    'vuejs.org',
    'angular.io',
    'blender.org',
    'unity.com',
    'docs.unrealengine.com',
    'create.roblox.com',
    'github.com',
    'stackoverflow.com',
    'medium.com',
    'dev.to',
    'freecodecamp.org',
    'news.ycombinator.com',
    'arxiv.org',
    'ieee.org',
  ],
};

let config: ScrapingConfig = { ...DEFAULT_CONFIG };

// ==========================================
// SOURCE RELIABILITY SCORING
// ==========================================

const sourceReliability: Record<string, number> = {
  'wikipedia.org': 0.85,
  'docs.python.org': 0.95,
  'developer.mozilla.org': 0.95,
  'react.dev': 0.95,
  'vuejs.org': 0.95,
  'angular.io': 0.95,
  'blender.org': 0.9,
  'unity.com': 0.9,
  'docs.unrealengine.com': 0.9,
  'create.roblox.com': 0.9,
  'github.com': 0.85,
  'stackoverflow.com': 0.8,
  'medium.com': 0.7,
  'dev.to': 0.75,
  'freecodecamp.org': 0.85,
  'news.ycombinator.com': 0.7,
  'arxiv.org': 0.9,
  'ieee.org': 0.9,
};

function getSourceReliability(url: string): number {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Check exact match
    if (sourceReliability[domain]) {
      return sourceReliability[domain];
    }
    
    // Check partial match
    for (const [key, value] of Object.entries(sourceReliability)) {
      if (domain.includes(key)) {
        return value;
      }
    }
    
    return 0.5; // Default reliability for unknown sources
  } catch {
    return 0.3; // Low reliability for invalid URLs
  }
}

// ==========================================
// MULTI-SOURCE SCRAPING
// ==========================================

/**
 * Scrape multiple sources for a query with parallel execution
 */
export async function scrapeMultipleSources(
  query: string,
  customConfig?: Partial<ScrapingConfig>
): Promise<ScrapingResult> {
  const cfg = { ...config, ...customConfig };
  const startTime = Date.now();
  
  console.log('🔍 Starting multi-source scrape for:', query);
  
  // Define sources to scrape
  const sourcesToScrape = selectSourcesForQuery(query, cfg);
  
  // Scrape in parallel with timeout
  const scrapePromises = sourcesToScrape.map(source => 
    scrapeWithTimeout(source, cfg.timeoutMs)
  );
  
  const results = await Promise.allSettled(scrapePromises);
  
  // Process results
  const successfulResults: SourceResult[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      const sourceResult = result.value;
      
      // Validate URL safety
      const validation = validateResourceUrl(sourceResult.url);
      if (!validation.isValid) {
        console.warn('❌ Source failed validation:', sourceResult.url);
        return;
      }
      
      // Check minimum reliability
      if (sourceResult.reliability >= cfg.minReliability) {
        successfulResults.push(sourceResult);
      }
    } else if (result.status === 'rejected') {
      console.warn('❌ Source scrape failed:', sourcesToScrape[index].url);
    }
  });
  
  // Deduplicate if enabled
  const uniqueResults = cfg.enableDeduplication 
    ? deduplicateSources(successfulResults)
    : successfulResults;
  
  // Aggregate findings
  const findings = aggregateFindings(uniqueResults);
  
  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(findings, uniqueResults);
  
  const endTime = Date.now();
  
  return {
    query,
    sources: uniqueResults,
    findings,
    overallConfidence,
    disclaimer: generateDisclaimer(overallConfidence, uniqueResults.length),
    scrapedAt: Date.now(),
    totalSources: sourcesToScrape.length,
    validSources: uniqueResults.length,
  };
}

/**
 * Select relevant sources based on query type
 */
function selectSourcesForQuery(
  query: string,
  cfg: ScrapingConfig
): Array<{url: string; type: SourceResult['sourceType']}> {
  const queryLower = query.toLowerCase();
  const sources: Array<{url: string; type: SourceResult['sourceType']}> = [];
  
  // Programming topics
  if (/python|javascript|typescript|react|vue|angular|coding|programming/i.test(queryLower)) {
    sources.push(
      { url: 'https://docs.python.org/3/', type: 'doc' },
      { url: 'https://developer.mozilla.org/en-US/', type: 'doc' },
      { url: 'https://react.dev', type: 'doc' },
      { url: 'https://stackoverflow.com/questions/tagged/' + encodeURIComponent(queryLower.split(' ')[0]), type: 'official' }
    );
  }
  
  // 3D/Animation topics
  if (/blender|3d|animation|modeling/i.test(queryLower)) {
    sources.push(
      { url: 'https://docs.blender.org/manual/en/latest/', type: 'doc' },
      { url: 'https://www.blender.org/support/tutorials/', type: 'official' }
    );
  }
  
  // Game development
  if (/unity|unreal|game dev|roblox|game development/i.test(queryLower)) {
    sources.push(
      { url: 'https://docs.unity3d.com/Manual/index.html', type: 'doc' },
      { url: 'https://docs.unrealengine.com/', type: 'doc' },
      { url: 'https://create.roblox.com/docs', type: 'doc' }
    );
  }
  
  // General knowledge / experimental queries
  sources.push(
    { url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(queryLower.replace(/\s+/g, '_')), type: 'wiki' }
  );
  
  // Limit to max sources
  return sources.slice(0, cfg.maxSources);
}

/**
 * Scrape a single source with timeout
 */
async function scrapeWithTimeout(
  source: {url: string; type: SourceResult['sourceType']},
  timeoutMs: number
): Promise<SourceResult | null> {
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeoutMs);
  });
  
  const scrapePromise = scrapeSource(source.url, source.type);
  
  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (error) {
    console.warn(`⏱️ Timeout or error scraping ${source.url}:`, error);
    return null;
  }
}

/**
 * Scrape content from a URL (simulated - would use actual scraper in production)
 */
async function scrapeSource(
  url: string,
  sourceType: SourceResult['sourceType']
): Promise<SourceResult> {
  // In production, this would use Puppeteer/Playwright or fetch
  // For now, simulate scraping based on URL patterns
  
  const reliability = getSourceReliability(url);
  
  // Simulate content extraction
  const title = extractTitleFromUrl(url);
  const content = simulateContentExtraction(url, sourceType);
  
  return {
    url,
    title,
    content,
    source: new URL(url).hostname,
    sourceType,
    fetchedAt: Date.now(),
    reliability,
    confidence: reliability > 0.8 ? 'high' : reliability > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Extract title from URL
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Clean up path to create title
    const cleanPath = path
      .replace(/^\//, '')
      .replace(/[_-]/g, ' ')
      .replace(/\.\w+$/, '')
      .replace(/\//g, ' - ');
    
    return cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1) || urlObj.hostname;
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Simulate content extraction (production would use actual scraping)
 */
function simulateContentExtraction(url: string, type: SourceResult['sourceType']): string {
  const domain = new URL(url).hostname;
  
  // Return simulated content based on source type
  const simulations: Record<string, string> = {
    'wiki': 'Wikipedia provides comprehensive encyclopedic coverage of this topic with citations.',
    'doc': 'Official documentation provides authoritative technical reference material.',
    'blog': 'Blog posts offer practical insights and community perspectives.',
    'news': 'News articles provide current events and recent developments.',
    'academic': 'Academic sources provide peer-reviewed research findings.',
    'official': 'Official sources provide primary source information.',
  };
  
  return simulations[type] || 'Content from ' + domain;
}

// ==========================================
// DEDUPLICATION & AGGREGATION
// ==========================================

/**
 * Remove duplicate/similar sources
 */
function deduplicateSources(sources: SourceResult[]): SourceResult[] {
  const seen = new Set<string>();
  const unique: SourceResult[] = [];
  
  for (const source of sources) {
    // Create fingerprint from first 100 chars of content
    const fingerprint = source.content.slice(0, 100).toLowerCase().replace(/\s+/g, '');
    
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      unique.push(source);
    }
  }
  
  return unique;
}

/**
 * Aggregate findings from multiple sources
 */
function aggregateFindings(sources: SourceResult[]): AggregatedFinding[] {
  // Group sources by confidence level
  const highConfidence = sources.filter(s => s.confidence === 'high');
  const mediumConfidence = sources.filter(s => s.confidence === 'medium');
  
  const findings: AggregatedFinding[] = [];
  
  // Create finding for high-confidence consensus
  if (highConfidence.length >= 2) {
    findings.push({
      claim: 'Multiple high-reliability sources confirm key information',
      supportingSources: highConfidence.map(s => s.url),
      contradictingSources: [],
      confidence: 'high',
      consensus: Math.min(95, highConfidence.length * 20 + 40),
    });
  }
  
  // Create finding for medium-confidence information
  if (mediumConfidence.length > 0) {
    findings.push({
      claim: 'Additional context available from community sources',
      supportingSources: mediumConfidence.map(s => s.url),
      contradictingSources: [],
      confidence: 'medium',
      consensus: Math.min(75, mediumConfidence.length * 15 + 30),
    });
  }
  
  return findings;
}

/**
 * Calculate overall confidence from findings
 */
function calculateOverallConfidence(
  findings: AggregatedFinding[],
  sources: SourceResult[]
): ConfidenceLevel {
  if (findings.length === 0) return 'low';
  
  const highCount = findings.filter(f => f.confidence === 'high').length;
  const mediumCount = findings.filter(f => f.confidence === 'medium').length;
  
  // Weight by source reliability
  const avgReliability = sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
  
  if (highCount >= 2 && avgReliability > 0.8) return 'high';
  if (mediumCount >= 1 || avgReliability > 0.6) return 'medium';
  return 'low';
}

/**
 * Generate appropriate disclaimer
 */
function generateDisclaimer(
  confidence: ConfidenceLevel,
  sourceCount: number
): string {
  const baseDisclaimer = '⚠️ This is experimental and believed to be true based on available sources, but may not be fully verified.';
  
  switch (confidence) {
    case 'high':
      return `✅ High confidence based on ${sourceCount} reliable sources. ${baseDisclaimer}`;
    case 'medium':
      return `⚠️ Medium confidence based on ${sourceCount} sources. ${baseDisclaimer}`;
    case 'low':
      return `⚠️ Low confidence - insufficient or unreliable sources. ${baseDisclaimer}`;
    default:
      return baseDisclaimer;
  }
}

// ==========================================
// CONFIGURATION EXPORTS
// ==========================================

export function setScrapingConfig(newConfig: Partial<ScrapingConfig>): void {
  config = { ...config, ...newConfig };
}

export function getScrapingConfig(): ScrapingConfig {
  return { ...config };
}

// ==========================================
// CONVENIENCE EXPORTS
// ==========================================

export {
  DEFAULT_CONFIG,
  sourceReliability,
};
