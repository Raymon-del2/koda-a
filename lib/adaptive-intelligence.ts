/**
 * Adaptive Intelligence Control System
 * 
 * This module implements the meta-layer for intelligence optimization:
 * - Dynamic confidence calibration
 * - Memory quality scoring
 * - Failure detection
 * - Controller drift detection
 * - Reasoning budget control
 * 
 * All metrics are designed to be lightweight and non-blocking.
 */

import type { NyatiPlan } from '@/types/plan';

// ==========================================
// METRICS SCHEMA
// ==========================================

export interface PerformanceMetrics {
  // Temporal tracking
  timestamp: number;
  sessionId: string;
  
  // Query metadata
  query: string;
  intent: NyatiPlan['intent'];
  complexity: 'low' | 'medium' | 'high';
  
  // Planning metrics
  planConfidence: number;
  planAccuracy: boolean; // Did the plan match what was actually needed?
  
  // Memory metrics
  memoryRetrieved: boolean;
  memoryUsed: boolean; // Was retrieved memory actually useful?
  memoryContextSize: number; // tokens/chars
  
  // Dual-LLM metrics
  strategicDraftGenerated: boolean;
  selfConsistencyUsed: boolean;
  strategicDraftConfidence: number;
  
  // Response metrics
  responseLength: number;
  generationTimeMs: number;
  
  // Quality signals (filled by validator)
  directAnswer: boolean | null;
  memoryContradiction: boolean | null;
  hallucinationDetected: boolean | null;
  
  // Failure tracking
  regenerated: boolean;
  failureType: 'none' | 'hallucination' | 'contradiction' | 'off_topic' | 'incomplete' | 'error';
  
  // Success (user feedback or heuristic)
  successEstimate: number; // 0.0-1.0
}

export interface IntentPerformanceSummary {
  intent: NyatiPlan['intent'];
  totalQueries: number;
  successfulQueries: number;
  successRate: number;
  avgConfidence: number;
  avgGenerationTime: number;
  hallucinationRate: number;
  memoryUsefulnessRate: number;
}

export interface AdaptiveThresholds {
  // Confidence thresholds (dynamically adjusted)
  selfConsistencyThreshold: number; // Default: 0.7
  memoryStorageThreshold: number; // Default: 0.5
  
  // Intent-specific adjustments
  intentThresholds: Record<NyatiPlan['intent'], {
    selfConsistency: number;
    confidenceBoost: number;
  }>;
  
  // Memory quality
  memoryScoreThreshold: number; // Default: 0.6
  
  // Reasoning budget
  maxMemoryContextSize: number; // Default: 4000 chars
  maxReasoningDepth: number; // Default: 6 steps
  
  // Controller drift
  minPlannerAccuracy: number; // Default: 0.75
  
  // Updated timestamp
  lastUpdated: number;
}

export interface MemoryQualityScore {
  factId: string;
  noveltyScore: number; // 0-1: How unique is this fact?
  reuseProbability: number; // 0-1: Likelihood of being retrieved again
  specificityLevel: number; // 0-1: Concrete vs vague
  redundancyPenalty: number; // 0-1: How similar to existing memories
  finalScore: number;
}

export interface ControllerDriftMetrics {
  totalPlans: number;
  accuratePlans: number;
  plannerAccuracy: number;
  intentMismatches: Record<NyatiPlan['intent'], number>;
  toolFalsePositives: number; // Planned tools but didn't need them
  toolFalseNegatives: number; // Didn't plan tools but needed them
}

// ==========================================
// IN-MEMORY METRICS STORE (Lightweight)
// ==========================================

class MetricsStore {
  private metrics: PerformanceMetrics[] = [];
  private thresholds: AdaptiveThresholds;
  private driftMetrics: ControllerDriftMetrics;
  private memoryScores: Map<string, MemoryQualityScore> = new Map();
  private readonly MAX_STORED_METRICS = 1000; // Prevent unbounded growth

  constructor() {
    this.thresholds = this.getDefaultThresholds();
    this.driftMetrics = this.getDefaultDriftMetrics();
  }

  private getDefaultThresholds(): AdaptiveThresholds {
    return {
      selfConsistencyThreshold: 0.7,
      memoryStorageThreshold: 0.5,
      intentThresholds: {
        question: { selfConsistency: 0.6, confidenceBoost: 0 },
        learn: { selfConsistency: 0.8, confidenceBoost: 0.1 },
        task: { selfConsistency: 0.85, confidenceBoost: 0.05 },
        conversation: { selfConsistency: 0.5, confidenceBoost: -0.1 },
        search: { selfConsistency: 0.6, confidenceBoost: 0 },
      },
      memoryScoreThreshold: 0.6,
      maxMemoryContextSize: 4000,
      maxReasoningDepth: 6,
      minPlannerAccuracy: 0.75,
      lastUpdated: Date.now(),
    };
  }

  private getDefaultDriftMetrics(): ControllerDriftMetrics {
    return {
      totalPlans: 0,
      accuratePlans: 0,
      plannerAccuracy: 1.0,
      intentMismatches: {
        question: 0,
        learn: 0,
        task: 0,
        conversation: 0,
        search: 0,
      },
      toolFalsePositives: 0,
      toolFalseNegatives: 0,
    };
  }

  // Record a new performance metric
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Prune old metrics to prevent unbounded growth
    if (this.metrics.length > this.MAX_STORED_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_STORED_METRICS);
    }
  }

  // Get metrics for a specific intent
  getIntentMetrics(intent: NyatiPlan['intent'], windowSize: number = 100): IntentPerformanceSummary {
    const recentMetrics = this.metrics
      .filter(m => m.intent === intent)
      .slice(-windowSize);

    const totalQueries = recentMetrics.length;
    if (totalQueries === 0) {
      return {
        intent,
        totalQueries: 0,
        successfulQueries: 0,
        successRate: 0.5, // Default neutral
        avgConfidence: 0.5,
        avgGenerationTime: 0,
        hallucinationRate: 0,
        memoryUsefulnessRate: 0,
      };
    }

    const successfulQueries = recentMetrics.filter(m => m.successEstimate > 0.7).length;
    const hallucinations = recentMetrics.filter(m => m.hallucinationDetected).length;
    const usefulMemory = recentMetrics.filter(m => m.memoryUsed).length;

    return {
      intent,
      totalQueries,
      successfulQueries,
      successRate: successfulQueries / totalQueries,
      avgConfidence: recentMetrics.reduce((sum, m) => sum + m.planConfidence, 0) / totalQueries,
      avgGenerationTime: recentMetrics.reduce((sum, m) => sum + m.generationTimeMs, 0) / totalQueries,
      hallucinationRate: hallucinations / totalQueries,
      memoryUsefulnessRate: totalQueries > 0 ? usefulMemory / recentMetrics.filter(m => m.memoryRetrieved).length || 0 : 0,
    };
  }

  // Get all current thresholds
  getThresholds(): AdaptiveThresholds {
    return { ...this.thresholds };
  }

  // Update thresholds based on performance
  calibrateThresholds(): void {
    const windowSize = 50; // Look at last 50 interactions per intent
    
    for (const intent of ['question', 'learn', 'task', 'conversation', 'search'] as NyatiPlan['intent'][]) {
      const summary = this.getIntentMetrics(intent, windowSize);
      
      // Adjust self-consistency threshold based on success rate
      if (summary.totalQueries >= 10) {
        const currentThreshold = this.thresholds.intentThresholds[intent].selfConsistency;
        
        if (summary.successRate < 0.6 && summary.hallucinationRate > 0.3) {
          // Too many failures - increase threshold (be more conservative)
          this.thresholds.intentThresholds[intent].selfConsistency = Math.min(0.95, currentThreshold + 0.05);
          console.log(`🔧 Calibrated ${intent}: increased self-consistency threshold to ${this.thresholds.intentThresholds[intent].selfConsistency.toFixed(2)}`);
        } else if (summary.successRate > 0.9 && summary.hallucinationRate < 0.1) {
          // Very good performance - can afford to lower threshold for speed
          this.thresholds.intentThresholds[intent].selfConsistency = Math.max(0.5, currentThreshold - 0.03);
          console.log(`🔧 Calibrated ${intent}: decreased self-consistency threshold to ${this.thresholds.intentThresholds[intent].selfConsistency.toFixed(2)}`);
        }
      }
    }

    // Adjust global memory storage threshold based on memory usefulness
    const allMetrics = this.metrics.slice(-100);
    const storedMemories = allMetrics.filter(m => m.memoryRetrieved).length;
    const usefulMemories = allMetrics.filter(m => m.memoryUsed).length;
    
    if (storedMemories > 10) {
      const usefulnessRate = usefulMemories / storedMemories;
      if (usefulnessRate < 0.4) {
        // Memories aren't being used - raise the bar
        this.thresholds.memoryStorageThreshold = Math.min(0.8, this.thresholds.memoryStorageThreshold + 0.05);
        console.log(`🔧 Calibrated memory storage: increased threshold to ${this.thresholds.memoryStorageThreshold.toFixed(2)}`);
      }
    }

    this.thresholds.lastUpdated = Date.now();
  }

  // Record controller plan outcome for drift detection
  recordPlanOutcome(
    plannedIntent: NyatiPlan['intent'],
    plannedNeedsTools: boolean,
    actualIntent: NyatiPlan['intent'],
    toolsActuallyUsed: boolean
  ): void {
    this.driftMetrics.totalPlans++;
    
    // Check intent accuracy
    if (plannedIntent !== actualIntent) {
      this.driftMetrics.intentMismatches[plannedIntent]++;
    } else {
      this.driftMetrics.accuratePlans++;
    }

    // Check tool prediction accuracy
    if (plannedNeedsTools && !toolsActuallyUsed) {
      this.driftMetrics.toolFalsePositives++;
    } else if (!plannedNeedsTools && toolsActuallyUsed) {
      this.driftMetrics.toolFalseNegatives++;
    }

    // Recalculate planner accuracy
    this.driftMetrics.plannerAccuracy = this.driftMetrics.accuratePlans / this.driftMetrics.totalPlans;
  }

  // Get drift metrics
  getDriftMetrics(): ControllerDriftMetrics {
    return { ...this.driftMetrics };
  }

  // Store memory quality score
  setMemoryQuality(factId: string, score: MemoryQualityScore): void {
    this.memoryScores.set(factId, score);
  }

  // Get memory quality score
  getMemoryQuality(factId: string): MemoryQualityScore | undefined {
    return this.memoryScores.get(factId);
  }

  // Get stats for debugging
  getStats(): {
    totalMetrics: number;
    thresholds: AdaptiveThresholds;
    drift: ControllerDriftMetrics;
    memoryScoresCount: number;
  } {
    return {
      totalMetrics: this.metrics.length,
      thresholds: this.getThresholds(),
      drift: this.getDriftMetrics(),
      memoryScoresCount: this.memoryScores.size,
    };
  }
}

// Singleton instance
export const metricsStore = new MetricsStore();

// ==========================================
// DYNAMIC CONFIDENCE CALIBRATION
// ==========================================

export function getCalibratedConfidenceThreshold(
  intent: NyatiPlan['intent'],
  baseConfidence: number
): number {
  const thresholds = metricsStore.getThresholds();
  const intentConfig = thresholds.intentThresholds[intent];
  
  // Apply intent-specific adjustments
  const adjustedThreshold = thresholds.selfConsistencyThreshold + 
    (intentConfig.confidenceBoost || 0);
  
  // Apply intent-specific override if available
  return intentConfig.selfConsistency || adjustedThreshold;
}

export function shouldUseSelfConsistency(
  plan: NyatiPlan,
  complexity: 'low' | 'medium' | 'high'
): boolean {
  const threshold = getCalibratedConfidenceThreshold(plan.intent, plan.confidence);
  
  // Always use self-consistency for high complexity or low confidence
  if (complexity === 'high' || plan.confidence < threshold) {
    return true;
  }
  
  // Check recent performance for this intent
  const summary = metricsStore.getIntentMetrics(plan.intent, 20);
  if (summary.hallucinationRate > 0.25) {
    // Recent hallucinations detected - be more conservative
    return true;
  }
  
  return false;
}

// ==========================================
// MEMORY QUALITY SCORING
// ==========================================

export function calculateMemoryQualityScore(
  factId: string,
  content: string,
  existingFacts: string[],
  retrievalHistory: number // How many times this was retrieved
): MemoryQualityScore {
  // Novelty: How different is this from existing facts?
  const noveltyScore = calculateNovelty(content, existingFacts);
  
  // Reuse probability: Based on retrieval history and specificity
  const reuseProbability = Math.min(1, retrievalHistory * 0.2 + 0.3);
  
  // Specificity: Does it contain concrete details vs generic statements?
  const specificityLevel = calculateSpecificity(content);
  
  // Redundancy: How similar to existing memories?
  const redundancyPenalty = calculateRedundancy(content, existingFacts);
  
  const finalScore = 
    noveltyScore * 0.3 +
    reuseProbability * 0.25 +
    specificityLevel * 0.25 -
    redundancyPenalty * 0.2;
  
  return {
    factId,
    noveltyScore,
    reuseProbability,
    specificityLevel,
    redundancyPenalty,
    finalScore: Math.max(0, Math.min(1, finalScore)),
  };
}

function calculateNovelty(content: string, existingFacts: string[]): number {
  if (existingFacts.length === 0) return 1;
  
  // Simple novelty check: what fraction of words are unique vs existing?
  const contentWords = new Set(content.toLowerCase().split(/\s+/));
  let maxOverlap = 0;
  
  for (const fact of existingFacts.slice(-10)) { // Check against last 10 facts
    const factWords = new Set(fact.toLowerCase().split(/\s+/));
    const intersection = new Set([...contentWords].filter(w => factWords.has(w)));
    const overlap = intersection.size / contentWords.size;
    maxOverlap = Math.max(maxOverlap, overlap);
  }
  
  return 1 - maxOverlap;
}

function calculateSpecificity(content: string): number {
  // Higher specificity if content contains:
  // - Numbers, dates, specific names
  // - Technical terms
  // - Concrete actions
  
  const specificitySignals = [
    /\b\d+\b/, // Numbers
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i, // Months
    /\b(?:use|using|prefer|work with|built|created|developed|implement)\b/i, // Action verbs
    /\b(?:React|Vue|Angular|Node|Python|JavaScript|TypeScript|Next\.js|Express)\b/i, // Tech terms
    /\b(?:project|team|company|client|product)\b/i, // Work context
  ];
  
  const signalCount = specificitySignals.filter(pattern => pattern.test(content)).length;
  return Math.min(1, signalCount / specificitySignals.length + 0.3);
}

function calculateRedundancy(content: string, existingFacts: string[]): number {
  // Similar to novelty but returns penalty score
  const contentWords = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  for (const fact of existingFacts) {
    const factWords = new Set(fact.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = new Set([...contentWords].filter(w => factWords.has(w)));
    
    if (intersection.size / contentWords.size > 0.8) {
      return 1; // High redundancy
    }
  }
  
  return 0;
}

export function shouldStoreMemory(score: MemoryQualityScore): boolean {
  const thresholds = metricsStore.getThresholds();
  return score.finalScore > thresholds.memoryScoreThreshold;
}

// ==========================================
// FAILURE DETECTION LAYER
// ==========================================

export interface ValidationResult {
  passed: boolean;
  directAnswer: boolean;
  memoryContradiction: boolean;
  hallucinationDetected: boolean;
  issues: string[];
}

export async function validateResponse(
  userQuery: string,
  response: string,
  retrievedMemory: string,
  plan: NyatiPlan
): Promise<ValidationResult> {
  const issues: string[] = [];
  
  // 1. Direct Answer Check
  const directAnswer = checkDirectAnswer(userQuery, response);
  if (!directAnswer) {
    issues.push('Response may not directly answer the user query');
  }
  
  // 2. Memory Contradiction Check
  const memoryContradiction = checkMemoryContradiction(response, retrievedMemory);
  if (memoryContradiction) {
    issues.push('Response contradicts retrieved memory');
  }
  
  // 3. Hallucination Detection
  const hallucinationDetected = detectHallucinationSignals(response);
  if (hallucinationDetected) {
    issues.push('Potential hallucination detected');
  }
  
  return {
    passed: issues.length === 0,
    directAnswer,
    memoryContradiction,
    hallucinationDetected,
    issues,
  };
}

function checkDirectAnswer(query: string, response: string): boolean {
  // Heuristic: Response should contain key terms from query
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const responseLower = response.toLowerCase();
  
  const matchingWords = queryWords.filter(w => responseLower.includes(w));
  const matchRatio = queryWords.length > 0 ? matchingWords.length / queryWords.length : 1;
  
  // Response should address at least 30% of key query terms
  return matchRatio > 0.3 || response.length > query.length * 0.5;
}

function checkMemoryContradiction(response: string, memory: string): boolean {
  if (!memory || memory.length < 50) return false;
  
  // Simple contradiction detection
  // Look for negations of memory statements
  const memoryFacts = memory.split(/[.!?]/).filter(s => s.length > 10);
  const responseLower = response.toLowerCase();
  
  const negationPatterns = [
    /not\s+\w+/gi,
    /never\s+\w+/gi,
    /doesn'?t\s+\w+/gi,
    /isn'?t\s+\w+/gi,
    /no\s+\w+/gi,
    /false/gi,
    /incorrect/gi,
    /wrong/gi,
  ];
  
  // If response has strong negations and memory is present, flag for review
  const hasNegations = negationPatterns.some(p => p.test(response));
  
  // Check if negated content overlaps with memory
  if (hasNegations) {
    const negatedSections = responseLower.match(/not\s+[^.!?]+/g) || [];
    for (const section of negatedSections) {
      for (const fact of memoryFacts) {
        const factLower = fact.toLowerCase();
        // If negated content is similar to memory fact
        const words = section.split(/\s+/).filter(w => w.length > 3);
        const matches = words.filter(w => factLower.includes(w));
        if (matches.length / words.length > 0.5) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function detectHallucinationSignals(response: string): boolean {
  const hallucinationPatterns = [
    /I (?:believe|think|feel|seem to recall)/i, // Uncertainty markers
    /(?:might|may|could|possibly|probably) be/i, // Hedging
    /I'm not (?:sure|certain|positive)/i,
    /if I remember correctly/i,
    /as far as I know/i,
    /(?:vague|unclear|unsure) (?:about|regarding|on)/i,
  ];
  
  // Count uncertainty markers
  let uncertaintyCount = 0;
  for (const pattern of hallucinationPatterns) {
    if (pattern.test(response)) uncertaintyCount++;
  }
  
  // Also check for made-up citations
  const fakeCitationPatterns = [
    /\[\d+\]/g, // [1], [2], etc without corresponding sources
    /\(Source:\s*[^)]+\)/i,
    /according to (?:my|the) (?:training|data|knowledge)/i,
  ];
  
  for (const pattern of fakeCitationPatterns) {
    if (pattern.test(response)) uncertaintyCount += 2;
  }
  
  // High uncertainty indicates potential hallucination
  return uncertaintyCount >= 3;
}

// ==========================================
// REASONING BUDGET CONTROL
// ==========================================

export interface ComplexityAnalysis {
  tokenLength: number;
  memoryCount: number;
  toolCount: number;
  complexityScore: number;
  recommendation: 'proceed' | 'prune_memory' | 'reduce_depth' | 'simplify';
}

export function analyzeComplexity(
  userQuery: string,
  memoryContext: string,
  plannedTools: string[] | null
): ComplexityAnalysis {
  // Estimate token length (rough approximation: 4 chars ≈ 1 token)
  const tokenLength = Math.ceil((userQuery.length + memoryContext.length) / 4);
  
  // Count memory items
  const memoryCount = memoryContext.split(/\n\n/).filter(s => s.length > 20).length;
  
  // Count planned tools
  const toolCount = plannedTools?.length || 0;
  
  // Calculate complexity score (normalized 0-1)
  const tokenScore = Math.min(1, tokenLength / 8000); // 8k context window
  const memoryScore = Math.min(1, memoryCount / 10);
  const toolScore = Math.min(1, toolCount / 4);
  
  const complexityScore = tokenScore * 0.5 + memoryScore * 0.3 + toolScore * 0.2;
  
  // Determine recommendation
  let recommendation: ComplexityAnalysis['recommendation'] = 'proceed';
  
  if (complexityScore > 0.85) {
    recommendation = 'simplify';
  } else if (complexityScore > 0.7) {
    recommendation = 'reduce_depth';
  } else if (complexityScore > 0.55) {
    recommendation = 'prune_memory';
  }
  
  return {
    tokenLength,
    memoryCount,
    toolCount,
    complexityScore,
    recommendation,
  };
}

export function pruneMemoryContext(
  memoryContext: string,
  maxSize: number
): string {
  const thresholds = metricsStore.getThresholds();
  
  if (memoryContext.length <= maxSize) return memoryContext;
  
  // Split into memory items
  const items = memoryContext.split(/\n\n###/).filter(s => s.trim());
  
  // Sort by assumed relevance (title match, position)
  // For now, keep first items and truncate last
  let prunedContext = '';
  let currentSize = 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (currentSize + item.length > maxSize) {
      // Add truncation notice
      prunedContext += '\n\n[Additional context truncated for reasoning efficiency]';
      break;
    }
    prunedContext += (i > 0 ? '\n\n###' : '') + item;
    currentSize += item.length;
  }
  
  return prunedContext;
}

export function getReasoningDepthLimit(complexity: ComplexityAnalysis): number {
  const thresholds = metricsStore.getThresholds();
  
  switch (complexity.recommendation) {
    case 'simplify':
      return 3;
    case 'reduce_depth':
      return 4;
    case 'prune_memory':
      return thresholds.maxReasoningDepth - 1;
    default:
      return thresholds.maxReasoningDepth;
  }
}

// ==========================================
// ADAPTIVE CONTROLLER INTEGRATION
// ==========================================

export function getAdaptivePlanAdjustments(plan: NyatiPlan): {
  shouldUseSelfConsistency: boolean;
  memoryScoreThreshold: number;
  maxContextSize: number;
  reasoningDepth: number;
} {
  const thresholds = metricsStore.getThresholds();
  
  // Determine complexity from plan
  const complexity: ComplexityAnalysis['recommendation'] = 
    plan.confidence < 0.5 ? 'simplify' :
    plan.needs_tools ? 'reduce_depth' :
    plan.needs_memory ? 'prune_memory' : 'proceed';
  
  const complexityAnalysis: ComplexityAnalysis = {
    tokenLength: 0,
    memoryCount: 0,
    toolCount: plan.tool_actions?.length || 0,
    complexityScore: plan.confidence < 0.5 ? 0.9 : plan.needs_tools ? 0.75 : 0.4,
    recommendation: complexity,
  };
  
  return {
    shouldUseSelfConsistency: shouldUseSelfConsistency(plan, 
      complexityAnalysis.complexityScore > 0.7 ? 'high' : 
      complexityAnalysis.complexityScore > 0.4 ? 'medium' : 'low'
    ),
    memoryScoreThreshold: thresholds.memoryStorageThreshold,
    maxContextSize: thresholds.maxMemoryContextSize,
    reasoningDepth: getReasoningDepthLimit(complexityAnalysis),
  };
}
