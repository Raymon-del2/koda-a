/**
 * Nyati Observability Layer + Cognitive Identity
 * 
 * Phase 5: System Awareness - Metrics dashboard, derived intelligence metrics
 * Phase 6: Cognitive Identity - Persistent system profile, self-aware optimization
 * 
 * This module provides:
 * - Real-time telemetry export
 * - Derived intelligence metrics
 * - Cognitive identity state management
 * - Weekly self-summary generation
 * - Controller bias injection
 */

import { metricsStore, type PerformanceMetrics } from './adaptive-intelligence';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// DERIVED INTELLIGENCE METRICS
// ==========================================

export interface DerivedMetrics {
  // Timestamp for this calculation
  timestamp: number;
  windowSize: number; // How many interactions this covers
  
  // 1. COGNITIVE EFFICIENCY
  // Formula: success_rate / tokens_used
  // Measures intelligence per compute unit
  cognitiveEfficiency: {
    value: number; // 0-1, higher is better
    successRate: number;
    avgTokensUsed: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  
  // 2. MEMORY ROI
  // Formula: retrieved_memories_used / stored_memories
  // Detects memory bloat early
  memoryROI: {
    value: number; // Can be > 1 if retrieved memories are reused multiple times
    retrievedCount: number;
    storedCount: number;
    usefulnessRate: number; // % of retrievals that were actually used
    trend: 'improving' | 'stable' | 'degrading';
  };
  
  // 3. PLANNER STABILITY
  // Rolling variance of planner confidence
  // High variance = controller confusion
  plannerStability: {
    variance: number; // Lower is better
    confidenceRange: [number, number]; // [min, max] over window
    oscillationCount: number; // How many times confidence swung significantly
    trend: 'stable' | 'erratic';
  };
  
  // 4. ADAPTIVE SYSTEM HEALTH
  adaptiveHealth: {
    thresholdConvergence: boolean; // Are thresholds stabilizing?
    calibrationFrequency: number; // How often calibration runs
    lastCalibrationEffect: number; // How much thresholds changed
  };
  
  // 5. FAILURE PATTERN ANALYSIS
  failurePatterns: {
    totalFailures: number;
    failureRate: number;
    topFailureTypes: Array<{ type: string; count: number }>;
    failureByIntent: Record<NyatiPlan['intent'], number>;
  };
}

/**
 * Calculate derived metrics from raw performance data
 * This transforms raw metrics into intelligence insights
 */
export function calculateDerivedMetrics(windowSize: number = 100): DerivedMetrics {
  const stats = metricsStore.getStats();
  const recentMetrics = stats.totalMetrics >= windowSize 
    ? stats.totalMetrics 
    : stats.totalMetrics;
  
  // Get intent summaries for all intents
  const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
  const intentSummaries = intents.map(intent => ({
    intent,
    summary: metricsStore.getIntentMetrics(intent, windowSize),
  }));
  
  // Calculate overall success rate
  const totalSuccessful = intentSummaries.reduce(
    (sum, { summary }) => sum + summary.successfulQueries, 
    0
  );
  const totalQueries = intentSummaries.reduce(
    (sum, { summary }) => sum + summary.totalQueries, 
    0
  );
  const successRate = totalQueries > 0 ? totalSuccessful / totalQueries : 0.5;
  
  // Estimate token usage (rough approximation)
  const avgResponseLength = intentSummaries.reduce(
    (sum, { summary }) => sum + summary.avgGenerationTime, 
    0
  ) / (intents.length || 1);
  const avgTokensUsed = avgResponseLength / 4; // Rough chars-to-tokens
  
  // Cognitive Efficiency
  const cognitiveEfficiency = {
    value: avgTokensUsed > 0 ? successRate / (avgTokensUsed / 100) : successRate,
    successRate,
    avgTokensUsed,
    trend: 'stable' as const, // Would need historical comparison
  };
  
  // Memory ROI calculation
  const allMetrics = getRecentMetrics(windowSize);
  const retrievedCount = allMetrics.filter(m => m.memoryRetrieved).length;
  const usedCount = allMetrics.filter(m => m.memoryUsed).length;
  const storedCount = allMetrics.filter(m => m.memoryRetrieved && m.memoryUsed).length;
  
  const memoryROI = {
    value: storedCount > 0 ? usedCount / storedCount : 0,
    retrievedCount,
    storedCount,
    usefulnessRate: retrievedCount > 0 ? usedCount / retrievedCount : 0,
    trend: 'stable' as const,
  };
  
  // Planner Stability - calculate confidence variance
  const confidences = allMetrics.map(m => m.planConfidence);
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / (confidences.length || 1);
  const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / (confidences.length || 1);
  const minConf = Math.min(...confidences, 1);
  const maxConf = Math.max(...confidences, 0);
  
  // Count oscillations (significant confidence swings)
  let oscillations = 0;
  for (let i = 1; i < confidences.length; i++) {
    if (Math.abs(confidences[i] - confidences[i - 1]) > 0.3) {
      oscillations++;
    }
  }
  
  const plannerStability = {
    variance,
    confidenceRange: [minConf, maxConf] as [number, number],
    oscillationCount: oscillations,
    trend: (variance > 0.1 ? 'erratic' : 'stable') as 'stable' | 'erratic',
  };
  
  // Failure patterns
  const failures = allMetrics.filter(m => m.failureType !== 'none');
  const failureByIntent = {} as Record<NyatiPlan['intent'], number>;
  intents.forEach(intent => failureByIntent[intent] = 0);
  failures.forEach(f => failureByIntent[f.intent]++);
  
  const failureTypes = ['hallucination', 'contradiction', 'incomplete', 'off_topic', 'error'];
  const topFailureTypes = failureTypes
    .map(type => ({
      type,
      count: allMetrics.filter(m => m.failureType === type).length,
    }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count);
  
  return {
    timestamp: Date.now(),
    windowSize: recentMetrics,
    cognitiveEfficiency,
    memoryROI,
    plannerStability,
    adaptiveHealth: {
      thresholdConvergence: variance < 0.05,
      calibrationFrequency: Math.floor(recentMetrics / 20), // Every 20 interactions
      lastCalibrationEffect: 0, // Would need to track calibration deltas
    },
    failurePatterns: {
      totalFailures: failures.length,
      failureRate: allMetrics.length > 0 ? failures.length / allMetrics.length : 0,
      topFailureTypes,
      failureByIntent,
    },
  };
}

// Helper to get recent metrics (exposing internal store)
function getRecentMetrics(count: number): PerformanceMetrics[] {
  // Access the metrics array through the store's public interface
  // This is a workaround - in production, expose a method on metricsStore
  const stats = metricsStore.getStats();
  // We can't directly access the private array, so we use intent metrics
  // and reconstruct what we can
  const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
  const allMetrics: PerformanceMetrics[] = [];
  
  // This is a simplification - in production, add getRecentMetrics to MetricsStore
  return allMetrics;
}

// ==========================================
// TELEMETRY DASHBOARD API
// ==========================================

export interface DashboardData {
  // Real-time snapshot
  snapshot: {
    totalInteractions: number;
    last24Hours: number;
    avgResponseTime: number;
    currentThresholds: ReturnType<typeof metricsStore.getThresholds>;
  };
  
  // Intelligence metrics
  derived: DerivedMetrics;
  
  // Intent breakdown
  intents: Array<{
    intent: NyatiPlan['intent'];
    totalQueries: number;
    successRate: number;
    avgConfidence: number;
    hallucinationRate: number;
  }>;
  
  // Recent alerts
  alerts: string[];
  
  // System health score (0-100)
  healthScore: number;
}

/**
 * Generate dashboard data for the observability UI
 */
export function generateDashboardData(): DashboardData {
  const stats = metricsStore.getStats();
  const derived = calculateDerivedMetrics(100);
  const thresholds = metricsStore.getThresholds();
  
  // Calculate intent breakdown
  const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
  const intentBreakdown = intents.map(intent => {
    const summary = metricsStore.getIntentMetrics(intent, 50);
    return {
      intent,
      totalQueries: summary.totalQueries,
      successRate: summary.successRate,
      avgConfidence: summary.avgConfidence,
      hallucinationRate: summary.hallucinationRate,
    };
  }).filter(i => i.totalQueries > 0);
  
  // Generate alerts
  const alerts: string[] = [];
  
  if (derived.plannerStability.trend === 'erratic') {
    alerts.push('⚠️ Planner confidence is erratic - controller may need tuning');
  }
  
  if (derived.memoryROI.usefulnessRate < 0.3 && derived.memoryROI.retrievedCount > 10) {
    alerts.push('📊 Low memory usefulness - consider raising storage threshold');
  }
  
  if (derived.failurePatterns.failureRate > 0.2) {
    alerts.push('🚨 High failure rate detected - review recent interactions');
  }
  
  if (!derived.adaptiveHealth.thresholdConvergence) {
    alerts.push('🔄 Thresholds still converging - system adapting to usage patterns');
  }
  
  // Calculate health score
  const healthScore = Math.round(
    (derived.cognitiveEfficiency.value * 30) +
    (Math.min(1, derived.memoryROI.value) * 25) +
    ((1 - derived.plannerStability.variance) * 25) +
    ((1 - derived.failurePatterns.failureRate) * 20)
  );
  
  return {
    snapshot: {
      totalInteractions: stats.totalMetrics,
      last24Hours: stats.totalMetrics, // Simplified - track actual time in production
      avgResponseTime: derived.cognitiveEfficiency.avgTokensUsed * 10, // Rough estimate
      currentThresholds: thresholds,
    },
    derived,
    intents: intentBreakdown,
    alerts,
    healthScore: Math.max(0, Math.min(100, healthScore)),
  };
}

// ==========================================
// COGNITIVE IDENTITY SYSTEM
// ==========================================

export interface CognitiveIdentity {
  // Static properties (rarely change)
  version: string;
  createdAt: number;
  
  // Dynamic properties (updated weekly)
  lastUpdated: number;
  
  // Self-assessed capabilities
  strengths: string[];
  weaknesses: string[];
  
  // Behavioral tendencies
  preferredReasoningDepth: number; // 1-10
  confidenceBias: number; // -0.2 to +0.2 (negative = conservative)
  
  // Learning phase
  learningPhase: 'exploration' | 'optimization' | 'mature';
  
  // Intent-specific proficiency
  intentProficiency: Record<NyatiPlan['intent'], {
    proficiency: number; // 0-1
    reliability: number; // 0-1
    lastAssessed: number;
  }>;
  
  // Historical trajectory
  improvementTrajectory: 'rising' | 'stable' | 'plateau' | 'declining';
  
  // Self-summary (generated weekly)
  selfSummary: string;
}

// In-memory identity store (would be persisted to Firestore in production)
let cognitiveIdentity: CognitiveIdentity | null = null;

/**
 * Initialize or load cognitive identity
 */
export function getCognitiveIdentity(): CognitiveIdentity {
  if (cognitiveIdentity) return cognitiveIdentity;
  
  // Default identity for new systems
  cognitiveIdentity = {
    version: '1.0.0',
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    strengths: ['structured reasoning', 'technical explanations', 'code generation'],
    weaknesses: ['open-ended creative tasks', 'ambiguous queries', 'emotional nuance'],
    preferredReasoningDepth: 5,
    confidenceBias: 0,
    learningPhase: 'exploration',
    intentProficiency: {
      question: { proficiency: 0.8, reliability: 0.85, lastAssessed: Date.now() },
      learn: { proficiency: 0.9, reliability: 0.9, lastAssessed: Date.now() },
      task: { proficiency: 0.7, reliability: 0.75, lastAssessed: Date.now() },
      conversation: { proficiency: 0.6, reliability: 0.7, lastAssessed: Date.now() },
      search: { proficiency: 0.75, reliability: 0.8, lastAssessed: Date.now() },
    },
    improvementTrajectory: 'stable',
    selfSummary: 'I am Nyati, an AI assistant focused on structured reasoning and technical tasks. I am currently in exploration phase, learning from interactions to improve my capabilities.',
  };
  
  return cognitiveIdentity;
}

// ==========================================
// IDENTITY DAMPING - Phase 9: Stabilization
// ==========================================

// Store previous identity for damping calculation
let previousIdentitySnapshot: CognitiveIdentity | null = null;
const DAMPING_FACTOR = 0.9; // 90% old, 10% new

/**
 * Apply damping to identity properties to prevent oscillation
 * Formula: newIdentity = 0.9 * oldIdentity + 0.1 * weeklyReflection
 */
function applyIdentityDamping(
  current: CognitiveIdentity,
  proposed: Partial<CognitiveIdentity>
): CognitiveIdentity {
  if (!previousIdentitySnapshot) {
    previousIdentitySnapshot = { ...current };
    return { ...current, ...proposed };
  }
  
  // Damp confidence bias
  if (proposed.confidenceBias !== undefined) {
    current.confidenceBias = 
      DAMPING_FACTOR * previousIdentitySnapshot.confidenceBias + 
      (1 - DAMPING_FACTOR) * proposed.confidenceBias;
  }
  
  // Damp proficiency values
  if (proposed.intentProficiency) {
    for (const intent of Object.keys(proposed.intentProficiency) as NyatiPlan['intent'][]) {
      const oldProf = previousIdentitySnapshot.intentProficiency[intent];
      const newProf = proposed.intentProficiency[intent];
      
      current.intentProficiency[intent] = {
        proficiency: DAMPING_FACTOR * oldProf.proficiency + (1 - DAMPING_FACTOR) * newProf.proficiency,
        reliability: DAMPING_FACTOR * oldProf.reliability + (1 - DAMPING_FACTOR) * newProf.reliability,
        lastAssessed: Date.now(),
      };
    }
  }
  
  // Update snapshot for next damping cycle
  previousIdentitySnapshot = { ...current };
  
  return current;
}

/**
 * Force damping reset - call when significant change detected
 */
export function resetIdentityDamping(): void {
  previousIdentitySnapshot = null;
  console.log('🔄 Identity damping reset');
}

/**
 * Update cognitive identity based on weekly reflection
 * This should run as a scheduled job (e.g., weekly cron)
 * NOW WITH DAMPING - Phase 9
 */
export function updateCognitiveIdentity(): CognitiveIdentity {
  const identity = getCognitiveIdentity();
  const derived = calculateDerivedMetrics(200); // Look at last 200 interactions
  
  // Store proposed changes before damping
  const proposedChanges: Partial<CognitiveIdentity> = {};
  
  // Update strengths based on high-performing intents
  const newStrengths: string[] = [];
  const newWeaknesses: string[] = [];
  
  const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
  
  intents.forEach(intent => {
    const summary = metricsStore.getIntentMetrics(intent, 50);
    if (summary.totalQueries >= 5) {
      const proficiency = summary.successRate;
      const reliability = 1 - summary.hallucinationRate;
      
      // Classify as strength or weakness
      if (proficiency > 0.85 && reliability > 0.9) {
        newStrengths.push(intentToStrength(intent));
      } else if (proficiency < 0.6 || reliability < 0.7) {
        newWeaknesses.push(intentToWeakness(intent));
      }
    }
  });
  
  // Update strengths/weaknesses (no damping - these are discrete categories)
  if (newStrengths.length > 0) identity.strengths = [...new Set([...identity.strengths.slice(0, 2), ...newStrengths])].slice(0, 5);
  if (newWeaknesses.length > 0) identity.weaknesses = [...new Set([...newWeaknesses])].slice(0, 3);
  
  // Calculate proposed confidence bias
  let proposedConfidenceBias = identity.confidenceBias;
  if (derived.plannerStability.trend === 'erratic') {
    proposedConfidenceBias = Math.max(-0.2, identity.confidenceBias - 0.05);
  } else if (derived.cognitiveEfficiency.trend === 'improving') {
    proposedConfidenceBias = Math.min(0.1, identity.confidenceBias + 0.02);
  }
  proposedChanges.confidenceBias = proposedConfidenceBias;
  
  // Calculate proposed proficiency
  proposedChanges.intentProficiency = {} as Record<NyatiPlan['intent'], { proficiency: number; reliability: number; lastAssessed: number }>;
  intents.forEach(intent => {
    const summary = metricsStore.getIntentMetrics(intent, 50);
    if (summary.totalQueries >= 5) {
      proposedChanges.intentProficiency![intent] = {
        proficiency: summary.successRate,
        reliability: 1 - summary.hallucinationRate,
        lastAssessed: Date.now(),
      };
    }
  });
  
  // Apply damping to continuous values
  applyIdentityDamping(identity, proposedChanges);
  
  // Determine learning phase (discrete - no damping)
  const totalInteractions = metricsStore.getStats().totalMetrics;
  if (totalInteractions < 100) {
    identity.learningPhase = 'exploration';
  } else if (totalInteractions < 500 && derived.adaptiveHealth.thresholdConvergence) {
    identity.learningPhase = 'optimization';
  } else if (derived.adaptiveHealth.thresholdConvergence) {
    identity.learningPhase = 'mature';
  }
  
  // Calculate trajectory (discrete - no damping)
  if (derived.cognitiveEfficiency.trend === 'improving') {
    identity.improvementTrajectory = 'rising';
  } else if (derived.plannerStability.trend === 'stable' && derived.failurePatterns.failureRate < 0.1) {
    identity.improvementTrajectory = 'plateau';
  } else if (derived.failurePatterns.failureRate > 0.25) {
    identity.improvementTrajectory = 'declining';
  } else {
    identity.improvementTrajectory = 'stable';
  }
  
  // Generate self-summary
  identity.selfSummary = generateSelfSummary(identity, derived);
  
  identity.lastUpdated = Date.now();
  
  console.log('🧠 Cognitive identity updated:', {
    phase: identity.learningPhase,
    trajectory: identity.improvementTrajectory,
    confidenceBias: identity.confidenceBias.toFixed(2),
    strengths: identity.strengths.length,
    damping: '90/10 applied',
  });
  
  return identity;
}

function intentToStrength(intent: NyatiPlan['intent']): string {
  const map: Record<NyatiPlan['intent'], string> = {
    question: 'answering structured questions',
    learn: 'learning from user input',
    task: 'completing defined tasks',
    conversation: 'maintaining conversation flow',
    search: 'retrieving relevant information',
  };
  return map[intent];
}

function intentToWeakness(intent: NyatiPlan['intent']): string {
  const map: Record<NyatiPlan['intent'], string> = {
    question: 'handling ambiguous questions',
    learn: 'identifying valuable learning opportunities',
    task: 'complex multi-step tasks',
    conversation: 'open-ended social conversation',
    search: 'optimizing search queries',
  };
  return map[intent];
}

function generateSelfSummary(identity: CognitiveIdentity, derived: DerivedMetrics): string {
  const phaseDescriptions: Record<string, string> = {
    exploration: 'exploring different types of queries and learning patterns',
    optimization: 'optimizing my response patterns and calibration',
    mature: 'operating with stable, well-calibrated responses',
  };
  
  const topStrengths = identity.strengths.slice(0, 3).join(', ');
  const topWeaknesses = identity.weaknesses.slice(0, 2).join(', ');
  
  return `I am Nyati, currently in ${identity.learningPhase} phase, ${phaseDescriptions[identity.learningPhase]}. My key strengths include ${topStrengths}. I am working to improve in areas like ${topWeaknesses}. My cognitive efficiency is ${(derived.cognitiveEfficiency.value * 100).toFixed(0)}% and my planner stability is ${derived.plannerStability.trend}.`;
}

// ==========================================
// CONTROLLER BIAS INJECTION
// ==========================================

/**
 * Generate controller prompt augmentation based on cognitive identity
 * This is injected into the planning phase
 */
export function generateControllerBias(): string {
  const identity = getCognitiveIdentity();
  
  const biasLines: string[] = [];
  
  // Add self-knowledge
  biasLines.push(`SELF-ASSESSMENT: ${identity.selfSummary}`);
  
  // Add capability guidance
  if (identity.strengths.length > 0) {
    biasLines.push(`STRONG AT: ${identity.strengths.join(', ')}`);
  }
  
  if (identity.weaknesses.length > 0) {
    biasLines.push(`CAREFUL WITH: ${identity.weaknesses.join(', ')}`);
  }
  
  // Add confidence adjustment guidance
  if (identity.confidenceBias < -0.05) {
    biasLines.push(`CALIBRATION: Recent performance suggests being more conservative. Lower confidence estimates by ${Math.abs(identity.confidenceBias * 100).toFixed(0)}%.`);
  } else if (identity.confidenceBias > 0.02) {
    biasLines.push(`CALIBRATION: Recent performance allows slight optimism. Confidence estimates are well-calibrated.`);
  }
  
  // Add intent-specific guidance
  const weakIntents = Object.entries(identity.intentProficiency)
    .filter(([_, data]) => data.proficiency < 0.7)
    .map(([intent, _]) => intent);
  
  if (weakIntents.length > 0) {
    biasLines.push(`USE SELF-CONSISTENCY FOR: ${weakIntents.join(', ')} queries due to lower reliability.`);
  }
  
  return biasLines.join('\n');
}

/**
 * Get intent-specific adjustments for the current query
 */
export function getIntentBias(intent: NyatiPlan['intent']): {
  confidenceAdjustment: number;
  forceSelfConsistency: boolean;
  extraCautions: string[];
} {
  const identity = getCognitiveIdentity();
  const proficiency = identity.intentProficiency[intent];
  
  let confidenceAdjustment = identity.confidenceBias;
  let forceSelfConsistency = false;
  const extraCautions: string[] = [];
  
  // Low proficiency = be more conservative
  if (proficiency.proficiency < 0.6) {
    confidenceAdjustment -= 0.1;
    forceSelfConsistency = true;
    extraCautions.push('This intent type has historically lower success. Consider extra verification.');
  }
  
  // Low reliability = always use self-consistency
  if (proficiency.reliability < 0.75) {
    forceSelfConsistency = true;
  }
  
  return {
    confidenceAdjustment,
    forceSelfConsistency,
    extraCautions,
  };
}

// ==========================================
// WEEKLY SELF-SUMMARY JOB
// ==========================================

/**
 * Run weekly self-reflection and identity update
 * Call this from a cron job or scheduled function
 */
export async function runWeeklyReflection(): Promise<{
  identity: CognitiveIdentity;
  changes: string[];
}> {
  const previousIdentity = { ...getCognitiveIdentity() };
  
  // Update identity based on metrics
  const newIdentity = updateCognitiveIdentity();
  
  // Detect what changed
  const changes: string[] = [];
  
  if (newIdentity.learningPhase !== previousIdentity.learningPhase) {
    changes.push(`Phase transition: ${previousIdentity.learningPhase} → ${newIdentity.learningPhase}`);
  }
  
  if (newIdentity.improvementTrajectory !== previousIdentity.improvementTrajectory) {
    changes.push(`Trajectory changed to: ${newIdentity.improvementTrajectory}`);
  }
  
  if (Math.abs(newIdentity.confidenceBias - previousIdentity.confidenceBias) > 0.03) {
    changes.push(`Confidence bias adjusted: ${previousIdentity.confidenceBias.toFixed(2)} → ${newIdentity.confidenceBias.toFixed(2)}`);
  }
  
  const newStrengths = newIdentity.strengths.filter(s => !previousIdentity.strengths.includes(s));
  if (newStrengths.length > 0) {
    changes.push(`New strengths identified: ${newStrengths.join(', ')}`);
  }
  
  const lostWeaknesses = previousIdentity.weaknesses.filter(w => !newIdentity.weaknesses.includes(w));
  if (lostWeaknesses.length > 0) {
    changes.push(`Improved in: ${lostWeaknesses.join(', ')}`);
  }
  
  console.log('📅 Weekly reflection complete:', {
    changes: changes.length,
    phase: newIdentity.learningPhase,
    trajectory: newIdentity.improvementTrajectory,
  });
  
  return { identity: newIdentity, changes };
}

// ==========================================
// EXPORT FOR DASHBOARD API
// ==========================================

export function getObservabilityData(): DashboardData & { identity: CognitiveIdentity } {
  return {
    ...generateDashboardData(),
    identity: getCognitiveIdentity(),
  };
}

// Type exports
export type { PerformanceMetrics };
