/**
 * Exploration Engine
 * 
 * Phase 7: Controlled Instability for Discovery
 * 
 * The system optimizes, but it must also explore. Without exploration,
 * adaptive systems plateau. This module introduces controlled randomness
 * to discover better strategies.
 * 
 * Exploration Policy (~8% interactions):
 * - Disable cache
 * - Lower confidence bias
 * - Allow deeper reasoning
 * - Increase memory storage tolerance
 * 
 * The learnings from exploration feed back into the adaptation loop,
 * allowing the system to discover better thresholds and strategies.
 */

import { metricsStore } from './adaptive-intelligence';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// EXPLORATION STATE
// ==========================================

interface ExplorationState {
  explorationRate: number; // 0.0-1.0, default 0.08
  lastExploration: number; // timestamp
  totalExplorations: number;
  successfulExplorations: number; // Led to measurable improvement
  
  // Current exploration mode settings
  mode: 'exploit' | 'explore';
  
  // What we're currently exploring
  currentFocus: ExplorationFocus;
}

type ExplorationFocus = 
  | 'threshold_optimization'
  | 'reasoning_depth'
  | 'memory_aggressiveness'
  | 'confidence_calibration'
  | 'cache_strategy';

let explorationState: ExplorationState = {
  explorationRate: 0.08,
  lastExploration: 0,
  totalExplorations: 0,
  successfulExplorations: 0,
  mode: 'exploit',
  currentFocus: 'threshold_optimization',
};

// ==========================================
// EXPLORATION DECISION
// ==========================================

export interface ExplorationDecision {
  shouldExplore: boolean;
  focus: ExplorationFocus;
  adjustments: ExplorationAdjustments;
  reason: string;
}

export interface ExplorationAdjustments {
  // Cache behavior
  disableCache: boolean;
  
  // Confidence adjustments
  confidenceBiasDelta: number; // Can be positive or negative
  
  // Reasoning depth
  reasoningDepthBonus: number; // Additional steps allowed
  
  // Memory storage
  memoryStorageThresholdDelta: number; // Lower = more permissive
  
  // Self-consistency
  forceSelfConsistency: boolean;
  
  // Mark as exploration for metrics
  isExploration: boolean;
}

/**
 * Decide whether to explore on this interaction
 * Uses epsilon-greedy strategy with decay
 */
export function decideExploration(
  plan: NyatiPlan,
  recentPerformance: number // 0-1, recent success rate
): ExplorationDecision {
  const now = Date.now();
  const timeSinceLastExploration = now - explorationState.lastExploration;
  
  // Dynamic exploration rate based on system maturity
  // More mature systems explore less frequently
  const totalInteractions = metricsStore.getStats().totalMetrics;
  const maturityFactor = Math.min(1, totalInteractions / 500);
  const adjustedRate = explorationState.explorationRate * (1 - maturityFactor * 0.5);
  
  // Don't explore twice in a row (minimum gap)
  if (timeSinceLastExploration < 60000) { // 1 minute minimum
    return {
      shouldExplore: false,
      focus: explorationState.currentFocus,
      adjustments: getDefaultAdjustments(),
      reason: 'Too soon since last exploration',
    };
  }
  
  // Epsilon-greedy: explore with probability epsilon
  const shouldExplore = Math.random() < adjustedRate;
  
  if (!shouldExplore) {
    return {
      shouldExplore: false,
      focus: explorationState.currentFocus,
      adjustments: getDefaultAdjustments(),
      reason: 'Exploitation mode (optimal behavior)',
    };
  }
  
  // We're exploring - pick a focus based on system needs
  const focus = selectExplorationFocus(plan, recentPerformance);
  
  // Generate adjustments for this exploration
  const adjustments = generateExplorationAdjustments(focus, plan);
  
  explorationState.lastExploration = now;
  explorationState.totalExplorations++;
  explorationState.mode = 'explore';
  
  console.log('🔬 Exploration triggered:', {
    focus,
    rate: adjustedRate.toFixed(3),
    total: explorationState.totalExplorations,
  });
  
  return {
    shouldExplore: true,
    focus,
    adjustments,
    reason: `Exploring ${focus} to discover optimization opportunities`,
  };
}

/**
 * Select what to explore based on system state
 */
function selectExplorationFocus(
  plan: NyatiPlan,
  recentPerformance: number
): ExplorationFocus {
  const options: ExplorationFocus[] = [
    'threshold_optimization',
    'reasoning_depth',
    'memory_aggressiveness',
    'confidence_calibration',
    'cache_strategy',
  ];
  
  // Weight options based on current system state
  const weights: Record<ExplorationFocus, number> = {
    threshold_optimization: 0.25,
    reasoning_depth: 0.20,
    memory_aggressiveness: 0.20,
    confidence_calibration: 0.20,
    cache_strategy: 0.15,
  };
  
  // Adjust weights based on detected issues
  const stats = metricsStore.getStats();
  const thresholds = metricsStore.getThresholds();
  
  // If thresholds aren't converging, explore that more
  if (!stats.thresholds.lastUpdated || Date.now() - stats.thresholds.lastUpdated > 86400000) {
    weights.threshold_optimization = 0.40;
  }
  
  // If planner is erratic, explore confidence calibration
  const drift = stats.drift;
  if (drift.plannerAccuracy < 0.75) {
    weights.confidence_calibration = 0.35;
  }
  
  // Weighted random selection
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const option of options) {
    random -= weights[option];
    if (random <= 0) {
      explorationState.currentFocus = option;
      return option;
    }
  }
  
  return options[options.length - 1];
}

/**
 * Generate exploration adjustments based on focus
 */
function generateExplorationAdjustments(
  focus: ExplorationFocus,
  plan: NyatiPlan
): ExplorationAdjustments {
  const base: ExplorationAdjustments = {
    disableCache: true,
    confidenceBiasDelta: 0,
    reasoningDepthBonus: 0,
    memoryStorageThresholdDelta: 0,
    forceSelfConsistency: false,
    isExploration: true,
  };
  
  switch (focus) {
    case 'threshold_optimization':
      return {
        ...base,
        confidenceBiasDelta: Math.random() > 0.5 ? 0.05 : -0.05,
        forceSelfConsistency: true, // Test if more consistency helps
        reason: 'Testing threshold boundaries',
      } as ExplorationAdjustments;
    
    case 'reasoning_depth':
      return {
        ...base,
        reasoningDepthBonus: 2, // Allow 2 extra reasoning steps
        forceSelfConsistency: true,
        reason: 'Testing deeper reasoning',
      } as ExplorationAdjustments;
    
    case 'memory_aggressiveness':
      return {
        ...base,
        memoryStorageThresholdDelta: -0.15, // More permissive
        reason: 'Testing aggressive memory storage',
      } as ExplorationAdjustments;
    
    case 'confidence_calibration':
      return {
        ...base,
        confidenceBiasDelta: -0.1, // Be more conservative
        forceSelfConsistency: true,
        reason: 'Testing conservative confidence',
      } as ExplorationAdjustments;
    
    case 'cache_strategy':
      return {
        ...base,
        disableCache: false, // Actually test cache strategies
        confidenceBiasDelta: 0.05, // More optimistic for cache hits
        reason: 'Testing cache behavior',
      } as ExplorationAdjustments;
    
    default:
      return base;
  }
}

function getDefaultAdjustments(): ExplorationAdjustments {
  return {
    disableCache: false,
    confidenceBiasDelta: 0,
    reasoningDepthBonus: 0,
    memoryStorageThresholdDelta: 0,
    forceSelfConsistency: false,
    isExploration: false,
  };
}

// ==========================================
// EXPLORATION OUTCOME TRACKING
// ==========================================

interface ExplorationOutcome {
  focus: ExplorationFocus;
  timestamp: number;
  query: string;
  intent: NyatiPlan['intent'];
  
  // What was adjusted
  adjustments: ExplorationAdjustments;
  
  // Results
  validationPassed: boolean;
  confidence: number;
  generationTime: number;
  
  // Success assessment
  wasSuccessful: boolean;
  learnings: string;
}

const explorationOutcomes: ExplorationOutcome[] = [];

/**
 * Record the outcome of an exploration
 */
export function recordExplorationOutcome(
  decision: ExplorationDecision,
  plan: NyatiPlan,
  validationPassed: boolean,
  confidence: number,
  generationTime: number
): void {
  if (!decision.shouldExplore) return;
  
  // Assess if this exploration was successful
  const wasSuccessful = validationPassed && confidence > 0.75;
  
  if (wasSuccessful) {
    explorationState.successfulExplorations++;
  }
  
  const outcome: ExplorationOutcome = {
    focus: decision.focus,
    timestamp: Date.now(),
    query: '', // Set by caller
    intent: plan.intent,
    adjustments: decision.adjustments,
    validationPassed,
    confidence,
    generationTime,
    wasSuccessful,
    learnings: generateLearnings(decision.focus, wasSuccessful, confidence),
  };
  
  explorationOutcomes.push(outcome);
  
  // Keep only recent outcomes
  if (explorationOutcomes.length > 50) {
    explorationOutcomes.shift();
  }
  
  // Return to exploitation mode
  explorationState.mode = 'exploit';
  
  console.log('🔬 Exploration outcome:', {
    focus: decision.focus,
    success: wasSuccessful,
    successRate: (explorationState.successfulExplorations / explorationState.totalExplorations).toFixed(2),
  });
}

function generateLearnings(
  focus: ExplorationFocus,
  wasSuccessful: boolean,
  confidence: number
): string {
  if (wasSuccessful) {
    return `Exploration of ${focus} succeeded with confidence ${confidence.toFixed(2)}. Consider adopting these parameters.`;
  } else {
    return `Exploration of ${focus} underperformed. Current parameters likely optimal for this context.`;
  }
}

// ==========================================
// EXPLORATION INSIGHTS
// ==========================================

export interface ExplorationInsights {
  totalExplorations: number;
  successRate: number;
  currentRate: number;
  mode: 'exploit' | 'explore';
  currentFocus: ExplorationFocus;
  timeSinceLastExploration: number;
  recentOutcomes: Array<{
    focus: ExplorationFocus;
    success: boolean;
    timestamp: number;
  }>;
  recommendations: string[];
}

/**
 * Get insights from exploration history
 */
export function getExplorationInsights(): ExplorationInsights {
  const now = Date.now();
  const recentOutcomes = explorationOutcomes
    .slice(-10)
    .map(o => ({
      focus: o.focus,
      success: o.wasSuccessful,
      timestamp: o.timestamp,
    }));
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  const focusSuccessRates: Record<string, { success: number; total: number }> = {};
  
  for (const outcome of explorationOutcomes) {
    if (!focusSuccessRates[outcome.focus]) {
      focusSuccessRates[outcome.focus] = { success: 0, total: 0 };
    }
    focusSuccessRates[outcome.focus].total++;
    if (outcome.wasSuccessful) {
      focusSuccessRates[outcome.focus].success++;
    }
  }
  
  for (const [focus, rates] of Object.entries(focusSuccessRates)) {
    const rate = rates.success / rates.total;
    if (rate > 0.7 && rates.total >= 3) {
      recommendations.push(`Consider permanent adoption of ${focus} parameters (success rate: ${(rate * 100).toFixed(0)}%)`);
    } else if (rate < 0.3 && rates.total >= 3) {
      recommendations.push(`Avoid ${focus} adjustments - consistently underperforming`);
    }
  }
  
  if (explorationState.totalExplorations < 10) {
    recommendations.push('Insufficient exploration data - continue current rate');
  }
  
  return {
    totalExplorations: explorationState.totalExplorations,
    successRate: explorationState.totalExplorations > 0
      ? explorationState.successfulExplorations / explorationState.totalExplorations
      : 0,
    currentRate: explorationState.explorationRate,
    mode: explorationState.mode,
    currentFocus: explorationState.currentFocus,
    timeSinceLastExploration: now - explorationState.lastExploration,
    recentOutcomes,
    recommendations,
  };
}

// ==========================================
// EXPORT
// ==========================================

export type { ExplorationFocus, ExplorationOutcome };
export { explorationState };
