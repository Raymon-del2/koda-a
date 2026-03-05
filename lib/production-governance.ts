/**
 * Production Governance Infrastructure
 * 
 * Post-Phase 14: Operational Maturity & Safety Systems
 * 
 * After cognitive architecture completion, the focus shifts to:
 * - Reliability (failure containment)
 * - Predictability (behavioral consistency)  
 * - Auditability (decision tracing)
 * - Trust (measurable user confidence)
 * 
 * This module provides:
 * 1. HARD GUARDRAILS - Non-adaptive limits that never change
 * 2. SAFE MODE - Circuit breaker for system instability
 * 3. BEHAVIORAL CONTRACTS - Consistency enforcement
 * 4. ACTION TRACE - Complete auditability per interaction
 * 5. COGNITIVE TRUST INDEX - The metric that matters
 */

import { metricsStore } from './adaptive-intelligence';
import { getObservabilityData, getCognitiveIdentity, resetIdentityDamping } from './observability';
import { getRealityAnchorStatus } from './reality-anchors';
import { goalManager } from './goal-hierarchy';
import { explorationState } from './exploration-engine';
import { ENERGY_COSTS, energyTracker } from './cognitive-energy';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// 1. HARD GUARDRAILS (Non-Adaptive Limits)
// ==========================================

/**
 * These limits are STATIC. They never adapt.
 * They exist to prevent runaway evolution.
 */
export const HARD_GUARDRAILS = {
  // Memory limits
  MAX_MEMORY_INSERTS_PER_HOUR: 50,
  MAX_MEMORY_SIZE_BYTES: 10000,
  MIN_MEMORY_QUALITY_SCORE: 0.4,
  
  // Identity limits (prevent identity drift)
  MAX_IDENTITY_SHIFT_PER_CYCLE: 0.15, // Max 15% change per weekly cycle
  MAX_CONFIDENCE_BIAS_MAGNITUDE: 0.25, // Never exceed ±0.25 bias
  
  // Threshold limits (prevent oscillation)
  MAX_THRESHOLD_CHANGE_PERCENT: 0.2, // Max 20% change per calibration
  MIN_SELF_CONSISTENCY_THRESHOLD: 0.5, // Never below 0.5
  MAX_SELF_CONSISTENCY_THRESHOLD: 0.95, // Never above 0.95
  
  // Tool limits (prevent premature autonomy)
  MAX_TOOL_AUTONOMY_LEVEL_PER_WEEK: 1, // Only advance 1 stage per week
  MIN_INTERACTIONS_BEFORE_TOOL_ADVANCE: 100,
  
  // Exploration limits (prevent chaos)
  MAX_EXPLORATION_RATE: 0.15, // Never exceed 15%
  MIN_EXPLORATION_RATE: 0.02, // Never below 2%
  MAX_CONSECUTIVE_EXPLORATIONS: 3, // Never explore 3x in a row
  
  // Energy limits (prevent runaway computation)
  MAX_ENERGY_PER_INTERACTION: 25,
  MIN_ENERGY_RESERVED_FOR_CORE: 5, // Always keep 5 for basic response
  
  // Goal limits (prevent destructive competition)
  MAX_ACTIVE_GOALS: 5,
  MIN_GOAL_ACHIEVEMENT_RATE: 0.3, // At least 30% of goals must be on track
  
  // Safety limits
  MAX_HALLUCINATION_RATE_BEFORE_SAFE_MODE: 0.25,
  MIN_PLANNER_ACCURACY_BEFORE_SAFE_MODE: 0.6,
  MAX_USER_CONFUSION_BEFORE_SAFE_MODE: 0.4,
} as const;

/**
 * Enforce all hard guardrails
 * Returns violations that were clamped
 */
export function enforceGuardrails(): {
  violations: string[];
  actionsTaken: string[];
  systemStable: boolean;
} {
  const violations: string[] = [];
  const actionsTaken: string[] = [];
  
  // Check identity bias magnitude
  const identity = getCognitiveIdentity();
  if (Math.abs(identity.confidenceBias) > HARD_GUARDRAILS.MAX_CONFIDENCE_BIAS_MAGNITUDE) {
    violations.push(`Confidence bias ${identity.confidenceBias.toFixed(2)} exceeds limit ${HARD_GUARDRAILS.MAX_CONFIDENCE_BIAS_MAGNITUDE}`);
    // Clamp it
    const clamped = Math.max(-HARD_GUARDRAILS.MAX_CONFIDENCE_BIAS_MAGNITUDE, 
                             Math.min(HARD_GUARDRAILS.MAX_CONFIDENCE_BIAS_MAGNITUDE, identity.confidenceBias));
    identity.confidenceBias = clamped;
    actionsTaken.push(`Clamped confidence bias to ${clamped.toFixed(2)}`);
  }
  
  // Check exploration rate
  if (explorationState.explorationRate > HARD_GUARDRAILS.MAX_EXPLORATION_RATE) {
    violations.push(`Exploration rate ${explorationState.explorationRate.toFixed(2)} exceeds limit ${HARD_GUARDRAILS.MAX_EXPLORATION_RATE}`);
    explorationState.explorationRate = HARD_GUARDRAILS.MAX_EXPLORATION_RATE;
    actionsTaken.push(`Clamped exploration rate to ${HARD_GUARDRAILS.MAX_EXPLORATION_RATE}`);
  }
  if (explorationState.explorationRate < HARD_GUARDRAILS.MIN_EXPLORATION_RATE) {
    violations.push(`Exploration rate ${explorationState.explorationRate.toFixed(2)} below limit ${HARD_GUARDRAILS.MIN_EXPLORATION_RATE}`);
    explorationState.explorationRate = HARD_GUARDRAILS.MIN_EXPLORATION_RATE;
    actionsTaken.push(`Raised exploration rate to ${HARD_GUARDRAILS.MIN_EXPLORATION_RATE}`);
  }
  
  // Check threshold bounds
  const thresholds = metricsStore.getThresholds();
  for (const intent of ['question', 'learn', 'task', 'conversation', 'search'] as const) {
    const intentThreshold = thresholds.intentThresholds[intent].selfConsistency;
    if (intentThreshold < HARD_GUARDRAILS.MIN_SELF_CONSISTENCY_THRESHOLD) {
      violations.push(`Intent ${intent} threshold ${intentThreshold.toFixed(2)} below minimum`);
      thresholds.intentThresholds[intent].selfConsistency = HARD_GUARDRAILS.MIN_SELF_CONSISTENCY_THRESHOLD;
      actionsTaken.push(`Raised ${intent} threshold to minimum`);
    }
    if (intentThreshold > HARD_GUARDRAILS.MAX_SELF_CONSISTENCY_THRESHOLD) {
      violations.push(`Intent ${intent} threshold ${intentThreshold.toFixed(2)} above maximum`);
      thresholds.intentThresholds[intent].selfConsistency = HARD_GUARDRAILS.MAX_SELF_CONSISTENCY_THRESHOLD;
      actionsTaken.push(`Lowered ${intent} threshold to maximum`);
    }
  }
  
  // Check goal count
  const activeGoals = goalManager.getActiveGoals();
  if (activeGoals.length > HARD_GUARDRAILS.MAX_ACTIVE_GOALS) {
    violations.push(`Active goals ${activeGoals.length} exceeds limit ${HARD_GUARDRAILS.MAX_ACTIVE_GOALS}`);
    actionsTaken.push(`System will prioritize top ${HARD_GUARDRAILS.MAX_ACTIVE_GOALS} goals`);
  }
  
  const systemStable = violations.length === 0;
  
  if (!systemStable) {
    console.log('🛡️ Guardrail violations detected:', {
      count: violations.length,
      actions: actionsTaken.length,
    });
  }
  
  return { violations, actionsTaken, systemStable };
}

// ==========================================
// 2. SAFE MODE (Circuit Breaker)
// ==========================================

export type SystemMode = 'normal' | 'safe' | 'critical';

interface SafeModeState {
  mode: SystemMode;
  triggeredAt: number | null;
  triggerReason: string | null;
  previousMode: SystemMode;
  
  // Safe mode restrictions
  restrictions: {
    explorationDisabled: boolean;
    identityUpdatesDisabled: boolean;
    reasoningDepthLimited: number | null;
    cacheOnlyPreferred: boolean;
    toolExecutionBlocked: boolean;
  };
}

let safeModeState: SafeModeState = {
  mode: 'normal',
  triggeredAt: null,
  triggerReason: null,
  previousMode: 'normal',
  restrictions: {
    explorationDisabled: false,
    identityUpdatesDisabled: false,
    reasoningDepthLimited: null,
    cacheOnlyPreferred: false,
    toolExecutionBlocked: false,
  },
};

/**
 * Check if safe mode should be triggered
 */
export function checkSafeModeTrigger(): {
  shouldTrigger: boolean;
  reason: string | null;
  severity: 'safe' | 'critical';
} {
  const obs = getObservabilityData();
  const anchors = getRealityAnchorStatus();
  const stats = metricsStore.getStats();
  
  // Critical triggers (immediate safe mode)
  if (anchors.userConfusion > HARD_GUARDRAILS.MAX_USER_CONFUSION_BEFORE_SAFE_MODE) {
    return {
      shouldTrigger: true,
      reason: `User confusion rate ${(anchors.userConfusion * 100).toFixed(0)}% exceeds critical threshold`,
      severity: 'critical',
    };
  }
  
  if (stats.drift.plannerAccuracy < HARD_GUARDRAILS.MIN_PLANNER_ACCURACY_BEFORE_SAFE_MODE) {
    return {
      shouldTrigger: true,
      reason: `Planner accuracy ${(stats.drift.plannerAccuracy * 100).toFixed(0)}% below critical threshold`,
      severity: 'critical',
    };
  }
  
  // Safe mode triggers (concerning but not critical)
  let issues: string[] = [];
  
  // Check hallucination rate across intents
  const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
  let maxHallucinationRate = 0;
  for (const intent of intents) {
    const metrics = metricsStore.getIntentMetrics(intent, 50);
    maxHallucinationRate = Math.max(maxHallucinationRate, metrics.hallucinationRate);
  }
  
  if (maxHallucinationRate > HARD_GUARDRAILS.MAX_HALLUCINATION_RATE_BEFORE_SAFE_MODE) {
    issues.push(`Hallucination rate ${(maxHallucinationRate * 100).toFixed(0)}% elevated`);
  }
  
  if (anchors.anchorStatus === 'recalibration-required') {
    issues.push('Reality anchors require recalibration');
  }
  
  if (obs.derived.plannerStability.trend === 'erratic') {
    issues.push('Planner stability erratic');
  }
  
  if (obs.healthScore < 60) {
    issues.push(`Health score ${obs.healthScore} below threshold`);
  }
  
  // Multiple issues = trigger safe mode
  if (issues.length >= 2) {
    return {
      shouldTrigger: true,
      reason: issues.join('; '),
      severity: 'safe',
    };
  }
  
  return { shouldTrigger: false, reason: null, severity: 'safe' };
}

/**
 * Enter safe mode with specified restrictions
 */
export function enterSafeMode(reason: string, severity: 'safe' | 'critical'): void {
  safeModeState.previousMode = safeModeState.mode;
  safeModeState.mode = severity === 'critical' ? 'critical' : 'safe';
  safeModeState.triggeredAt = Date.now();
  safeModeState.triggerReason = reason;
  
  // Apply restrictions based on severity
  if (severity === 'critical') {
    safeModeState.restrictions = {
      explorationDisabled: true,
      identityUpdatesDisabled: true,
      reasoningDepthLimited: 3, // Severely limit
      cacheOnlyPreferred: true,
      toolExecutionBlocked: true,
    };
  } else {
    safeModeState.restrictions = {
      explorationDisabled: true,
      identityUpdatesDisabled: true,
      reasoningDepthLimited: 5, // Moderately limit
      cacheOnlyPreferred: false,
      toolExecutionBlocked: false,
    };
  }
  
  // Immediately disable exploration
  explorationState.explorationRate = 0;
  
  console.log('🚨 SAFE MODE ACTIVATED:', {
    severity: safeModeState.mode,
    reason: safeModeState.triggerReason,
    restrictions: safeModeState.restrictions,
  });
}

/**
 * Exit safe mode and return to normal
 */
export function exitSafeMode(): void {
  if (safeModeState.mode === 'normal') return;
  
  console.log('✅ Exiting safe mode, returning to:', safeModeState.previousMode);
  
  safeModeState.mode = safeModeState.previousMode === 'critical' ? 'safe' : 'normal';
  safeModeState.triggeredAt = null;
  safeModeState.triggerReason = null;
  safeModeState.restrictions = {
    explorationDisabled: false,
    identityUpdatesDisabled: false,
    reasoningDepthLimited: null,
    cacheOnlyPreferred: false,
    toolExecutionBlocked: false,
  };
  
  // Restore exploration at minimum rate
  explorationState.explorationRate = HARD_GUARDRAILS.MIN_EXPLORATION_RATE;
}

/**
 * Get current safe mode status
 */
export function getSafeModeStatus(): SafeModeState {
  return { ...safeModeState };
}

/**
 * Check if an action is allowed in current mode
 */
export function isActionAllowed(action: 'exploration' | 'identityUpdate' | 'deepReasoning' | 'toolExecution' | 'cacheOnly'): boolean {
  if (safeModeState.mode === 'normal') return true;
  
  switch (action) {
    case 'exploration':
      return !safeModeState.restrictions.explorationDisabled;
    case 'identityUpdate':
      return !safeModeState.restrictions.identityUpdatesDisabled;
    case 'deepReasoning':
      return safeModeState.restrictions.reasoningDepthLimited === null || 
             safeModeState.restrictions.reasoningDepthLimited >= 5;
    case 'toolExecution':
      return !safeModeState.restrictions.toolExecutionBlocked;
    case 'cacheOnly':
      return true; // Always allowed, but preference varies
  }
}

// ==========================================
// 3. BEHAVIORAL CONTRACTS (Consistency)
// ==========================================

export interface BehavioralContract {
  // Response style consistency
  responseStyle: {
    maxVariance: number; // 0-1, how much style can vary
    toneStability: 'high' | 'medium' | 'low'; // How stable tone should be
    explanationDepth: {
      byIntent: Record<NyatiPlan['intent'], { min: number; max: number }>;
    };
  };
  
  // Confidence expression
  confidenceExpression: {
    calibrationAccuracy: number; // 0-1, how accurate confidence should be
    uncertaintyAcknowledgment: boolean; // Must admit when uncertain
    confidenceRange: { min: number; max: number }; // Never outside this range
  };
  
  // Latency consistency
  latency: {
    maxVariancePercent: number; // Max variance from average
    targetLatencyMs: number;
  };
}

const DEFAULT_CONTRACT: BehavioralContract = {
  responseStyle: {
    maxVariance: 0.2,
    toneStability: 'high',
    explanationDepth: {
      byIntent: {
        question: { min: 1, max: 5 },
        learn: { min: 2, max: 6 },
        task: { min: 2, max: 4 },
        conversation: { min: 1, max: 3 },
        search: { min: 2, max: 5 },
      },
    },
  },
  confidenceExpression: {
    calibrationAccuracy: 0.8,
    uncertaintyAcknowledgment: true,
    confidenceRange: { min: 0.3, max: 0.95 },
  },
  latency: {
    maxVariancePercent: 0.3, // 30% variance allowed
    targetLatencyMs: 3000,
  },
};

let currentContract: BehavioralContract = { ...DEFAULT_CONTRACT };

/**
 * Validate a response against behavioral contract
 */
export function validateBehavioralContract(
  plan: NyatiPlan,
  response: string,
  generationTimeMs: number,
  confidence: number
): {
  compliant: boolean;
  violations: string[];
  adjustments: string[];
} {
  const violations: string[] = [];
  const adjustments: string[] = [];
  
  // Check confidence range
  if (confidence < currentContract.confidenceExpression.confidenceRange.min) {
    violations.push(`Confidence ${confidence.toFixed(2)} below minimum ${currentContract.confidenceExpression.confidenceRange.min}`);
  }
  if (confidence > currentContract.confidenceExpression.confidenceRange.max) {
    violations.push(`Confidence ${confidence.toFixed(2)} above maximum ${currentContract.confidenceExpression.confidenceRange.max}`);
    adjustments.push(`Reduce confidence to ${currentContract.confidenceExpression.confidenceRange.max}`);
  }
  
  // Check latency
  const maxAllowedLatency = currentContract.latency.targetLatencyMs * (1 + currentContract.latency.maxVariancePercent);
  if (generationTimeMs > maxAllowedLatency) {
    violations.push(`Latency ${generationTimeMs}ms exceeds max ${maxAllowedLatency.toFixed(0)}ms`);
    adjustments.push('Use simpler reasoning path next time');
  }
  
  // Check explanation depth
  const depthLimits = currentContract.responseStyle.explanationDepth.byIntent[plan.intent];
  const paragraphCount = response.split('\n\n').length;
  if (paragraphCount < depthLimits.min) {
    violations.push(`Response too brief (${paragraphCount} paragraphs) for ${plan.intent} intent`);
  }
  if (paragraphCount > depthLimits.max) {
    violations.push(`Response too verbose (${paragraphCount} paragraphs) for ${plan.intent} intent`);
    adjustments.push('Condense response in future');
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    adjustments,
  };
}

/**
 * Get behavioral contract for injection into prompts
 */
export function generateBehavioralBias(): string {
  return `BEHAVIORAL CONTRACT:
- Tone: ${currentContract.responseStyle.toneStability} stability required
- Confidence: Always ${currentContract.confidenceExpression.uncertaintyAcknowledgment ? 'acknowledge uncertainty when below 0.7' : 'calibrated'}
- Depth: Match intent type expectations
- Latency: Respond within ${currentContract.latency.targetLatencyMs}ms target`;
}

// ==========================================
// 4. ACTION TRACE (Auditability)
// ==========================================

export interface ActionTrace {
  // Identification
  interactionId: string;
  timestamp: number;
  sessionId: string;
  
  // Input
  userQuery: string;
  context: {
    messageHistory: number;
    userId?: string;
  };
  
  // Decision chain
  decisions: {
    plan: NyatiPlan;
    energyAllocation: Array<{ action: string; cost: number; reason: string }>;
    goalsApplied: string[];
    explorationTriggered: boolean;
    explorationFocus?: string;
    toolsConsidered: string[];
    toolsUsed: string[];
    safeModeActive: boolean;
    guardrailViolations: string[];
  };
  
  // Execution
  execution: {
    memoryRetrieved: boolean;
    memoryUsed: boolean;
    reasoningSteps: number;
    selfConsistencyUsed: boolean;
    strategicDraftGenerated: boolean;
    responseLength: number;
    generationTimeMs: number;
  };
  
  // Validation
  validation: {
    validationPassed: boolean;
    directAnswer: boolean;
    hallucinationDetected: boolean;
    userConfusionEstimate: number;
    behavioralContractCompliant: boolean;
  };
  
  // Outcome
  outcome: {
    success: boolean;
    confidence: number;
    userFeedback?: 'positive' | 'negative' | 'neutral';
    conversationContinued: boolean;
  };
  
  // Meta
  identity: {
    phase: string;
    confidenceBias: number;
    trajectory: string;
  };
  
  system: {
    mode: SystemMode;
    healthScore: number;
    explorationRate: number;
  };
}

const actionTraces: ActionTrace[] = [];
const MAX_TRACES = 1000;

/**
 * Record a complete action trace
 */
export function recordActionTrace(trace: ActionTrace): void {
  actionTraces.push(trace);
  
  // Prune old traces
  if (actionTraces.length > MAX_TRACES) {
    actionTraces.shift();
  }
  
  // Log summary
  console.log('📝 Action trace recorded:', {
    interactionId: trace.interactionId.slice(0, 8),
    mode: trace.system.mode,
    exploration: trace.decisions.explorationTriggered,
    success: trace.outcome.success,
  });
}

/**
 * Query action traces for debugging
 */
export function queryTraces(filters: {
  interactionId?: string;
  sessionId?: string;
  failedOnly?: boolean;
  explorationOnly?: boolean;
  timeRange?: { start: number; end: number };
  limit?: number;
}): ActionTrace[] {
  let results = [...actionTraces];
  
  if (filters.interactionId) {
    results = results.filter(t => t.interactionId === filters.interactionId);
  }
  
  if (filters.sessionId) {
    results = results.filter(t => t.sessionId === filters.sessionId);
  }
  
  if (filters.failedOnly) {
    results = results.filter(t => !t.outcome.success || !t.validation.validationPassed);
  }
  
  if (filters.explorationOnly) {
    results = results.filter(t => t.decisions.explorationTriggered);
  }
  
  if (filters.timeRange) {
    results = results.filter(t => 
      t.timestamp >= filters.timeRange!.start && 
      t.timestamp <= filters.timeRange!.end
    );
  }
  
  return results.slice(-(filters.limit || 100));
}

/**
 * Generate explanation for why a decision was made
 */
export function explainDecision(interactionId: string): string {
  const trace = actionTraces.find(t => t.interactionId === interactionId);
  if (!trace) return 'Trace not found';
  
  const lines: string[] = [
    `DECISION EXPLANATION for ${interactionId.slice(0, 8)}:`,
    '',
    `System Mode: ${trace.system.mode}`,
    `Identity Phase: ${trace.identity.phase} (bias: ${trace.identity.confidenceBias.toFixed(2)})`,
    '',
    'Plan Decision:',
    `  - Intent: ${trace.decisions.plan.intent}`,
    `  - Confidence: ${trace.decisions.plan.confidence.toFixed(2)}`,
    `  - Needs Memory: ${trace.decisions.plan.needs_memory}`,
    `  - Needs Tools: ${trace.decisions.plan.needs_tools}`,
    '',
    'Applied Goals:',
    ...trace.decisions.goalsApplied.map(g => `  - ${g}`),
    '',
    'Energy Allocation:',
    ...trace.decisions.energyAllocation.map(e => `  - ${e.action}: ${e.cost} units (${e.reason})`),
    '',
    `Exploration: ${trace.decisions.explorationTriggered ? `YES (${trace.decisions.explorationFocus})` : 'NO'}`,
    `Safe Mode: ${trace.decisions.safeModeActive ? 'ACTIVE' : 'inactive'}`,
    '',
    'Outcome:',
    `  - Success: ${trace.outcome.success}`,
    `  - Validation: ${trace.validation.validationPassed ? 'passed' : 'failed'}`,
    `  - User confusion estimate: ${(trace.validation.userConfusionEstimate * 100).toFixed(0)}%`,
  ];
  
  return lines.join('\n');
}

// ==========================================
// 5. COGNITIVE TRUST INDEX
// ==========================================

export interface CognitiveTrustIndex {
  // Overall score (0-100)
  score: number;
  
  // Components
  components: {
    correctness: number; // 0-100, validation pass rate
    consistency: number; // 0-100, behavioral contract compliance
    clarity: number;     // 0-100, inverse of confusion signals
    latencyStability: number; // 0-100, response time consistency
    continuationRate: number; // 0-100, conversation continuation
  };
  
  // Trend
  trend: 'rising' | 'stable' | 'falling';
  
  // Assessment
  trustLevel: 'high' | 'moderate' | 'low' | 'critical';
  
  // Timestamp
  calculatedAt: number;
}

/**
 * Calculate the Cognitive Trust Index
 * This is THE metric that matters for production
 */
export function calculateCognitiveTrustIndex(windowSize: number = 100): CognitiveTrustIndex {
  const traces = actionTraces.slice(-windowSize);
  
  if (traces.length < 10) {
    return {
      score: 50,
      components: {
        correctness: 50,
        consistency: 50,
        clarity: 50,
        latencyStability: 50,
        continuationRate: 50,
      },
      trend: 'stable',
      trustLevel: 'moderate',
      calculatedAt: Date.now(),
    };
  }
  
  // Correctness: validation pass rate
  const validationPassed = traces.filter(t => t.validation.validationPassed).length;
  const correctness = (validationPassed / traces.length) * 100;
  
  // Consistency: behavioral contract compliance
  const contractCompliant = traces.filter(t => t.validation.behavioralContractCompliant).length;
  const consistency = (contractCompliant / traces.length) * 100;
  
  // Clarity: inverse of confusion signals (from reality anchors)
  const anchors = getRealityAnchorStatus();
  const clarity = (1 - anchors.userConfusion) * 100;
  
  // Latency stability: variance in generation time
  const times = traces.map(t => t.execution.generationTimeMs);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((s, t) => s + Math.pow(t - avgTime, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const latencyStability = Math.max(0, 100 - (stdDev / avgTime) * 100);
  
  // Continuation rate
  const continued = traces.filter(t => t.outcome.conversationContinued).length;
  const continuationRate = (continued / traces.length) * 100;
  
  // Calculate weighted score
  const score = (
    correctness * 0.25 +
    consistency * 0.20 +
    clarity * 0.25 +
    latencyStability * 0.15 +
    continuationRate * 0.15
  );
  
  // Determine trend
  const half = Math.floor(traces.length / 2);
  const firstHalf = traces.slice(0, half);
  const secondHalf = traces.slice(half);
  
  const firstScore = firstHalf.filter(t => t.outcome.success).length / firstHalf.length;
  const secondScore = secondHalf.filter(t => t.outcome.success).length / secondHalf.length;
  
  let trend: CognitiveTrustIndex['trend'] = 'stable';
  if (secondScore > firstScore + 0.1) trend = 'rising';
  if (secondScore < firstScore - 0.1) trend = 'falling';
  
  // Determine trust level
  let trustLevel: CognitiveTrustIndex['trustLevel'] = 'moderate';
  if (score >= 80) trustLevel = 'high';
  else if (score >= 60) trustLevel = 'moderate';
  else if (score >= 40) trustLevel = 'low';
  else trustLevel = 'critical';
  
  return {
    score,
    components: {
      correctness,
      consistency,
      clarity,
      latencyStability,
      continuationRate,
    },
    trend,
    trustLevel,
    calculatedAt: Date.now(),
  };
}

// ==========================================
// PRODUCTION GOVERNANCE API
// ==========================================

export interface GovernanceStatus {
  // Overall system health
  systemMode: SystemMode;
  cognitiveTrustIndex: CognitiveTrustIndex;
  
  // Safety systems
  guardrails: {
    violations: string[];
    actionsTaken: string[];
    systemStable: boolean;
  };
  
  // Operational metrics
  operational: {
    totalTraces: number;
    safeModeTriggers: number;
    currentExplorationRate: number;
    activeGoalCount: number;
  };
  
  // Recommendations
  recommendations: string[];
}

/**
 * Get complete governance status for dashboard
 */
export function getGovernanceStatus(): GovernanceStatus {
  // Enforce guardrails first
  const guardrails = enforceGuardrails();
  
  // Check if we need to trigger safe mode
  const safeCheck = checkSafeModeTrigger();
  if (safeCheck.shouldTrigger && safeModeState.mode === 'normal') {
    enterSafeMode(safeCheck.reason!, safeCheck.severity);
  }
  
  // Calculate trust index
  const trustIndex = calculateCognitiveTrustIndex(100);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (trustIndex.trustLevel === 'critical') {
    recommendations.push('CRITICAL: Cognitive Trust Index below 40 - immediate intervention required');
  } else if (trustIndex.trustLevel === 'low') {
    recommendations.push('WARNING: Trust index declining - review recent traces for anomalies');
  }
  
  if (safeModeState.mode !== 'normal') {
    recommendations.push(`System in ${safeModeState.mode} mode due to: ${safeModeState.triggerReason}`);
    recommendations.push('Monitor metrics - exit safe mode only when stable for 50+ interactions');
  }
  
  if (!guardrails.systemStable) {
    recommendations.push('Guardrail violations detected - system auto-corrected');
  }
  
  if (trustIndex.trend === 'falling') {
    recommendations.push('Trust index trending down - consider temporary safe mode');
  }
  
  return {
    systemMode: safeModeState.mode,
    cognitiveTrustIndex: trustIndex,
    guardrails,
    operational: {
      totalTraces: actionTraces.length,
      safeModeTriggers: actionTraces.filter(t => t.decisions.safeModeActive).length,
      currentExplorationRate: explorationState.explorationRate,
      activeGoalCount: goalManager.getActiveGoals().length,
    },
    recommendations,
  };
}
