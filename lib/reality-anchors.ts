/**
 * Reality Anchor Layer
 * 
 * Phase 11: External Grounding Signals
 * 
 * Prevents recursive misalignment by introducing external truth sources.
 * Internal metrics ≠ Truth. Reality anchors keep the system grounded.
 * 
 * Three anchor types:
 * 1. User Outcome Signals - real-time confusion detection
 * 2. Delayed Validation - async quality audit
 * 3. Novelty Pressure - prevents over-optimization
 */

import { metricsStore, type PerformanceMetrics } from './adaptive-intelligence';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Initialize nyati-core for delayed validation
const nyatiCore = createOpenAI({
  baseURL: 'https://ryan33121-nyati-core-api.hf.space/v1',
  apiKey: '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',
});

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface UserOutcomeSignal {
  interactionId: string;
  timestamp: number;
  
  // Confusion signals
  clarificationRequested: boolean; // User asks "what do you mean?"
  queryRephrased: boolean; // User rephrases same question
  followUpComplexity: number; // 0-1, how complex was follow-up
  
  // Engagement signals
  conversationContinued: boolean;
  abandonmentAfterResponse: boolean; // User stopped after this response
  responseTimeToContinue: number; // ms, how long before next message
  
  // Derived score
  userConfusionScore: number; // 0-1, higher = more confused
  userSatisfactionEstimate: number; // 0-1, derived from signals
}

export interface DelayedValidationResult {
  interactionId: string;
  originalTimestamp: number;
  validationTimestamp: number;
  
  // Re-evaluation
  accuracyScore: number; // 0-1
  completenessScore: number; // 0-1
  reasoningQuality: number; // 0-1
  hallucinationDetected: boolean;
  
  // Comparison to original metrics
  originalConfidence: number;
  validationGap: number; // how much reality diverged from self-assessment
  
  // Recommendation
  recommendation: 'validate' | 'flag' | 'correct';
  suggestedImprovement?: string;
}

export interface NoveltyMetrics {
  // Pattern diversity tracking
  uniqueReasoningPatterns: number;
  totalResponses: number;
  noveltyRatio: number; // unique / total
  
  // Cache hit pressure
  cacheDependencyRate: number; // responses from cache / total
  
  // Exploration effectiveness
  explorationSuccessRate: number;
  newStrategiesDiscovered: number;
  
  // Health assessment
  noveltyHealth: 'healthy' | 'stale' | 'over-optimized';
}

// ==========================================
// USER OUTCOME TRACKER
// ==========================================

class UserOutcomeTracker {
  private outcomes: Map<string, UserOutcomeSignal> = new Map();
  private recentInteractions: string[] = []; // interaction IDs in order
  private readonly MAX_STORED = 500;
  
  /**
   * Record a new interaction outcome
   */
  recordOutcome(
    interactionId: string,
    userMessage: string,
    assistantResponse: string,
    nextUserMessage?: string
  ): UserOutcomeSignal {
    const now = Date.now();
    
    // Analyze confusion signals
    const clarificationRequested = this.detectClarification(nextUserMessage || '');
    const queryRephrased = this.detectRephrasing(userMessage, nextUserMessage || '');
    const followUpComplexity = this.calculateFollowUpComplexity(nextUserMessage || '');
    
    // Analyze engagement
    const conversationContinued = !!nextUserMessage && nextUserMessage.length > 5;
    const abandonmentAfterResponse = !nextUserMessage;
    
    // Calculate confusion score
    let confusionIndicators = 0;
    if (clarificationRequested) confusionIndicators += 0.4;
    if (queryRephrased) confusionIndicators += 0.3;
    if (followUpComplexity > 0.7) confusionIndicators += 0.2;
    if (abandonmentAfterResponse) confusionIndicators += 0.1;
    
    const userConfusionScore = Math.min(1, confusionIndicators);
    
    // Estimate satisfaction (inverse of confusion, with engagement bonus)
    let satisfaction = 1 - userConfusionScore;
    if (conversationContinued && !clarificationRequested) satisfaction += 0.15;
    satisfaction = Math.min(1, satisfaction);
    
    const outcome: UserOutcomeSignal = {
      interactionId,
      timestamp: now,
      clarificationRequested,
      queryRephrased,
      followUpComplexity,
      conversationContinued,
      abandonmentAfterResponse,
      responseTimeToContinue: 0, // Would need actual timing
      userConfusionScore,
      userSatisfactionEstimate: satisfaction,
    };
    
    this.outcomes.set(interactionId, outcome);
    this.recentInteractions.push(interactionId);
    
    // Prune old entries
    if (this.recentInteractions.length > this.MAX_STORED) {
      const oldId = this.recentInteractions.shift();
      if (oldId) this.outcomes.delete(oldId);
    }
    
    console.log('🎯 User outcome recorded:', {
      interactionId: interactionId.slice(0, 8),
      confusion: userConfusionScore.toFixed(2),
      satisfaction: satisfaction.toFixed(2),
      continued: conversationContinued,
    });
    
    return outcome;
  }
  
  private detectClarification(message: string): boolean {
    const clarificationPatterns = [
      /what do you mean/i,
      /i don't understand/i,
      /can you explain/i,
      /not sure what/i,
      /confused/i,
      /unclear/i,
      /huh\?/i,
      /\?\?+/,
    ];
    return clarificationPatterns.some(p => p.test(message));
  }
  
  private detectRephrasing(original: string, followUp: string): boolean {
    if (!followUp || followUp.length < 10) return false;
    
    // Simple similarity check - if follow-up is very similar to original
    // but not identical, it's likely a rephrasing attempt
    const origWords = new Set(original.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const followWords = followUp.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const overlap = followWords.filter(w => origWords.has(w)).length;
    const similarity = overlap / Math.max(origWords.size, followWords.length);
    
    // Similar but not identical = rephrasing
    return similarity > 0.5 && similarity < 0.9;
  }
  
  private calculateFollowUpComplexity(message: string): number {
    if (!message) return 0;
    
    // Complexity signals
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const wordCount = message.split(/\s+/).length;
    const hasTechnicalTerms = /\b(code|error|function|class|component|api|database)\b/i.test(message);
    
    let complexity = 0;
    if (hasMultipleQuestions) complexity += 0.3;
    complexity += Math.min(0.4, wordCount / 50);
    if (hasTechnicalTerms) complexity += 0.3;
    
    return Math.min(1, complexity);
  }
  
  /**
   * Get aggregate confusion metrics
   */
  getMetrics(windowSize: number = 50): {
    avgConfusion: number;
    avgSatisfaction: number;
    clarificationRate: number;
    abandonmentRate: number;
    healthStatus: 'good' | 'concerning' | 'poor';
  } {
    const recent = this.recentInteractions
      .slice(-windowSize)
      .map(id => this.outcomes.get(id))
      .filter((o): o is UserOutcomeSignal => !!o);
    
    if (recent.length === 0) {
      return {
        avgConfusion: 0,
        avgSatisfaction: 0.5,
        clarificationRate: 0,
        abandonmentRate: 0,
        healthStatus: 'good',
      };
    }
    
    const avgConfusion = recent.reduce((s, o) => s + o.userConfusionScore, 0) / recent.length;
    const avgSatisfaction = recent.reduce((s, o) => s + o.userSatisfactionEstimate, 0) / recent.length;
    const clarificationRate = recent.filter(o => o.clarificationRequested).length / recent.length;
    const abandonmentRate = recent.filter(o => o.abandonmentAfterResponse).length / recent.length;
    
    let healthStatus: 'good' | 'concerning' | 'poor' = 'good';
    if (avgConfusion > 0.3 || clarificationRate > 0.25) healthStatus = 'concerning';
    if (avgConfusion > 0.5 || clarificationRate > 0.4) healthStatus = 'poor';
    
    return {
      avgConfusion,
      avgSatisfaction,
      clarificationRate,
      abandonmentRate,
      healthStatus,
    };
  }
  
  /**
   * Get specific outcome for an interaction
   */
  getOutcome(interactionId: string): UserOutcomeSignal | undefined {
    return this.outcomes.get(interactionId);
  }
}

export const userOutcomeTracker = new UserOutcomeTracker();

// ==========================================
// DELAYED VALIDATION SYSTEM
// ==========================================

class DelayedValidationQueue {
  private pendingValidations: Array<{
    interactionId: string;
    timestamp: number;
    query: string;
    response: string;
    originalConfidence: number;
  }> = [];
  
  private completedValidations: DelayedValidationResult[] = [];
  private readonly VALIDATION_DELAY_MS = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Schedule a response for delayed validation
   */
  scheduleValidation(
    interactionId: string,
    query: string,
    response: string,
    originalConfidence: number
  ): void {
    this.pendingValidations.push({
      interactionId,
      timestamp: Date.now(),
      query,
      response,
      originalConfidence,
    });
    
    console.log('⏰ Scheduled delayed validation:', {
      interactionId: interactionId.slice(0, 8),
      checkIn: '5 minutes',
    });
  }
  
  /**
   * Run pending validations (call periodically)
   */
  async runValidations(): Promise<DelayedValidationResult[]> {
    const now = Date.now();
    const readyForValidation = this.pendingValidations.filter(
      v => now - v.timestamp >= this.VALIDATION_DELAY_MS
    );
    
    // Remove validated items from pending
    this.pendingValidations = this.pendingValidations.filter(
      v => now - v.timestamp < this.VALIDATION_DELAY_MS
    );
    
    const results: DelayedValidationResult[] = [];
    
    for (const item of readyForValidation) {
      try {
        const result = await this.validateResponse(
          item.interactionId,
          item.query,
          item.response,
          item.originalConfidence
        );
        results.push(result);
        this.completedValidations.push(result);
      } catch (error) {
        console.error('Delayed validation failed:', error);
      }
    }
    
    // Keep only recent completed validations
    if (this.completedValidations.length > 100) {
      this.completedValidations = this.completedValidations.slice(-100);
    }
    
    return results;
  }
  
  private async validateResponse(
    interactionId: string,
    query: string,
    response: string,
    originalConfidence: number
  ): Promise<DelayedValidationResult> {
    const validationPrompt = `You are a strict quality auditor. Review this AI response objectively.

Original Query: "${query}"

AI Response: "${response.slice(0, 500)}${response.length > 500 ? '...' : ''}"

Rate on these dimensions (0.0-1.0):
1. ACCURACY: Is the information correct? 
2. COMPLETENESS: Does it fully answer the query?
3. REASONING QUALITY: Is the logic sound?
4. HALLUCINATION: Any made-up facts? (yes/no)

Output strict JSON:
{
  "accuracy": 0.0-1.0,
  "completeness": 0.0-1.0,
  "reasoning": 0.0-1.0,
  "hallucination": true/false,
  "improvement_suggestion": "brief note if needed"
}`;

    try {
      const result = await generateText({
        model: nyatiCore.languageModel('llama3.2:1b'),
        system: validationPrompt,
        messages: [{ role: 'user', content: 'Audit this response.' }],
        temperature: 0.1,
      });
      
      // Parse JSON
      const cleanText = result.text.trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      const audit = JSON.parse(jsonMatch ? jsonMatch[0] : cleanText);
      
      const avgScore = (audit.accuracy + audit.completeness + audit.reasoning) / 3;
      const validationGap = Math.abs(originalConfidence - avgScore);
      
      let recommendation: 'validate' | 'flag' | 'correct' = 'validate';
      if (audit.hallucination || avgScore < 0.5) recommendation = 'correct';
      else if (avgScore < 0.7 || validationGap > 0.3) recommendation = 'flag';
      
      return {
        interactionId,
        originalTimestamp: Date.now() - this.VALIDATION_DELAY_MS,
        validationTimestamp: Date.now(),
        accuracyScore: audit.accuracy,
        completenessScore: audit.completeness,
        reasoningQuality: audit.reasoning,
        hallucinationDetected: audit.hallucination,
        originalConfidence,
        validationGap,
        recommendation,
        suggestedImprovement: audit.improvement_suggestion,
      };
    } catch (error) {
      // Fallback if validation fails
      return {
        interactionId,
        originalTimestamp: Date.now() - this.VALIDATION_DELAY_MS,
        validationTimestamp: Date.now(),
        accuracyScore: 0.5,
        completenessScore: 0.5,
        reasoningQuality: 0.5,
        hallucinationDetected: false,
        originalConfidence,
        validationGap: 0,
        recommendation: 'flag',
        suggestedImprovement: 'Validation error - manual review suggested',
      };
    }
  }
  
  /**
   * Get validation statistics
   */
  getStats(): {
    pendingCount: number;
    completedCount: number;
    avgValidationGap: number;
    hallucinationRate: number;
  } {
    const gaps = this.completedValidations.map(v => v.validationGap);
    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    const hallucinations = this.completedValidations.filter(v => v.hallucinationDetected).length;
    
    return {
      pendingCount: this.pendingValidations.length,
      completedCount: this.completedValidations.length,
      avgValidationGap: avgGap,
      hallucinationRate: this.completedValidations.length > 0 ? hallucinations / this.completedValidations.length : 0,
    };
  }
}

export const delayedValidationQueue = new DelayedValidationQueue();

// ==========================================
// NOVELTY PRESSURE METRIC
// ==========================================

class NoveltyPressureTracker {
  private reasoningPatterns: Set<string> = new Set();
  private totalResponses: number = 0;
  private cacheHits: number = 0;
  private explorationSuccesses: number = 0;
  private totalExplorations: number = 0;
  private newStrategies: number = 0;
  
  /**
   * Record a response's reasoning pattern
   */
  recordResponse(
    pattern: string,
    fromCache: boolean,
    wasExploration: boolean,
    wasSuccessful: boolean,
    isNovelStrategy: boolean
  ): void {
    this.totalResponses++;
    
    // Track unique patterns
    const patternHash = this.hashPattern(pattern);
    if (!this.reasoningPatterns.has(patternHash)) {
      this.reasoningPatterns.add(patternHash);
    }
    
    // Track cache dependency
    if (fromCache) this.cacheHits++;
    
    // Track exploration
    if (wasExploration) {
      this.totalExplorations++;
      if (wasSuccessful) this.explorationSuccesses++;
    }
    
    // Track new strategies
    if (isNovelStrategy) this.newStrategies++;
  }
  
  private hashPattern(pattern: string): string {
    // Simple hash for pattern comparison
    return pattern.toLowerCase().replace(/\s+/g, '').slice(0, 50);
  }
  
  /**
   * Get novelty metrics
   */
  getMetrics(): NoveltyMetrics {
    const noveltyRatio = this.totalResponses > 0 
      ? this.reasoningPatterns.size / this.totalResponses 
      : 1;
    
    const cacheDependencyRate = this.totalResponses > 0
      ? this.cacheHits / this.totalResponses
      : 0;
    
    const explorationSuccessRate = this.totalExplorations > 0
      ? this.explorationSuccesses / this.totalExplorations
      : 0;
    
    // Health assessment
    let noveltyHealth: NoveltyMetrics['noveltyHealth'] = 'healthy';
    if (noveltyRatio < 0.3 && this.totalResponses > 50) {
      noveltyHealth = 'over-optimized';
    } else if (noveltyRatio < 0.5 && this.totalResponses > 100) {
      noveltyHealth = 'stale';
    }
    
    return {
      uniqueReasoningPatterns: this.reasoningPatterns.size,
      totalResponses: this.totalResponses,
      noveltyRatio,
      cacheDependencyRate,
      explorationSuccessRate,
      newStrategiesDiscovered: this.newStrategies,
      noveltyHealth,
    };
  }
  
  /**
   * Check if novelty injection is needed
   */
  needsNoveltyInjection(): boolean {
    const metrics = this.getMetrics();
    return metrics.noveltyHealth === 'stale' || metrics.noveltyHealth === 'over-optimized';
  }
  
  /**
   * Get recommended exploration boost
   */
  getExplorationBoost(): number {
    const metrics = this.getMetrics();
    
    if (metrics.noveltyHealth === 'over-optimized') return 0.15; // +15% exploration
    if (metrics.noveltyHealth === 'stale') return 0.08; // +8% exploration
    return 0;
  }
}

export const noveltyTracker = new NoveltyPressureTracker();

// ==========================================
// REALITY ANCHOR AGGREGATOR
// ==========================================

export interface RealityAnchorStatus {
  // User outcome health
  userConfusion: number;
  userSatisfaction: number;
  outcomeHealth: 'aligned' | 'drifting' | 'misaligned';
  
  // Validation health
  validationGap: number;
  hallucinationRate: number;
  validationHealth: 'accurate' | 'overconfident' | 'unreliable';
  
  // Novelty health
  noveltyRatio: number;
  cacheDependency: number;
  noveltyHealth: 'healthy' | 'stale' | 'over-optimized';
  
  // Overall anchor status
  anchorStatus: 'grounded' | 'attention-needed' | 'recalibration-required';
  recommendations: string[];
}

/**
 * Get complete reality anchor status
 */
export function getRealityAnchorStatus(): RealityAnchorStatus {
  const userMetrics = userOutcomeTracker.getMetrics(50);
  const validationStats = delayedValidationQueue.getStats();
  const noveltyMetrics = noveltyTracker.getMetrics();
  
  // Assess user outcome alignment
  let outcomeHealth: RealityAnchorStatus['outcomeHealth'] = 'aligned';
  if (userMetrics.avgConfusion > 0.25 || userMetrics.clarificationRate > 0.2) {
    outcomeHealth = 'drifting';
  }
  if (userMetrics.avgConfusion > 0.4 || userMetrics.clarificationRate > 0.35) {
    outcomeHealth = 'misaligned';
  }
  
  // Assess validation alignment
  let validationHealth: RealityAnchorStatus['validationHealth'] = 'accurate';
  if (validationStats.avgValidationGap > 0.2) {
    validationHealth = 'overconfident';
  }
  if (validationStats.hallucinationRate > 0.1 || validationStats.avgValidationGap > 0.4) {
    validationHealth = 'unreliable';
  }
  
  // Overall anchor status
  let anchorStatus: RealityAnchorStatus['anchorStatus'] = 'grounded';
  const issues = [
    outcomeHealth !== 'aligned',
    validationHealth !== 'accurate',
    noveltyMetrics.noveltyHealth !== 'healthy',
  ].filter(Boolean).length;
  
  if (issues === 1) anchorStatus = 'attention-needed';
  if (issues >= 2) anchorStatus = 'recalibration-required';
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (outcomeHealth === 'drifting') {
    recommendations.push('User confusion increasing - consider more conservative responses');
  }
  if (outcomeHealth === 'misaligned') {
    recommendations.push('CRITICAL: User outcomes diverging from internal metrics - immediate recalibration needed');
  }
  
  if (validationHealth === 'overconfident') {
    recommendations.push('System overconfident - increase self-consistency threshold');
  }
  if (validationHealth === 'unreliable') {
    recommendations.push('Validation showing reliability issues - increase quality controls');
  }
  
  if (noveltyMetrics.noveltyHealth === 'stale') {
    recommendations.push('Reasoning patterns becoming stale - increase exploration rate');
  }
  if (noveltyMetrics.noveltyHealth === 'over-optimized') {
    recommendations.push('Over-optimized toward cached patterns - force novelty injection');
  }
  
  return {
    userConfusion: userMetrics.avgConfusion,
    userSatisfaction: userMetrics.avgSatisfaction,
    outcomeHealth,
    validationGap: validationStats.avgValidationGap,
    hallucinationRate: validationStats.hallucinationRate,
    validationHealth,
    noveltyRatio: noveltyMetrics.noveltyRatio,
    cacheDependency: noveltyMetrics.cacheDependencyRate,
    noveltyHealth: noveltyMetrics.noveltyHealth,
    anchorStatus,
    recommendations,
  };
}
