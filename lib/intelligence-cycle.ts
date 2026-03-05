/**
 * Weekly Intelligence Cycle Job
 * 
 * Phase 10: Intelligence Flywheel
 * 
 * Formalizes the self-improving loop:
 * Interactions → Metrics → Identity Update → Controller Bias Change → Different Planning → New Outcomes
 * 
 * This is a scheduled job that runs weekly and outputs:
 * - New adaptive thresholds
 * - Identity adjustments
 * - Exploration rate tuning
 * - Memory pruning targets
 * 
 * Improvement becomes automatic.
 */

import { metricsStore, calculateMemoryQualityScore, shouldStoreMemory } from './adaptive-intelligence';
import { updateCognitiveIdentity, getCognitiveIdentity, resetIdentityDamping, runWeeklyReflection, type CognitiveIdentity } from './observability';
import { explorationState, getExplorationInsights, recordExplorationOutcome } from './exploration-engine';
import { cognitiveCache, getCacheStrategy } from './cognitive-cache';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// INTELLIGENCE CYCLE OUTPUTS
// ==========================================

export interface IntelligenceCycleOutputs {
  // Threshold adjustments
  adaptiveThresholds: {
    selfConsistencyThreshold: number;
    memoryStorageThreshold: number;
    explorationRate: number;
  };
  
  // Identity adjustments
  identity: {
    confidenceBiasDelta: number;
    phase: CognitiveIdentity['learningPhase'];
    trajectory: CognitiveIdentity['improvementTrajectory'];
    changes: string[];
  };
  
  // System tuning
  systemTuning: {
    cacheStrategy: 'conservative' | 'balanced' | 'aggressive';
    memoryPruningTarget: number;
    explorationRate: number;
  };
  
  // Targets for next cycle
  nextCycleTargets: {
    targetHealthScore: number;
    targetPlannerAccuracy: number;
    targetMemoryROI: number;
  };
  
  // When cycle ran
  timestamp: number;
  weekNumber: number;
}

// ==========================================
// GOAL LAYER (Phase 11)
// ==========================================

export interface SystemGoal {
  id: string;
  name: string;
  description: string;
  metric: 'cognitive_efficiency' | 'planner_accuracy' | 'memory_roi' | 'hallucination_rate' | 'response_time';
  targetValue: number;
  currentValue: number;
  priority: 'high' | 'medium' | 'low';
  deadline?: number; // timestamp
  status: 'active' | 'achieved' | 'abandoned';
  strategies: string[]; // How to achieve this goal
}

// Active system goals
let systemGoals: SystemGoal[] = [
  {
    id: 'goal-1',
    name: 'Improve Explanation Clarity',
    description: 'Reduce hallucination signals and increase direct answer rate',
    metric: 'hallucination_rate',
    targetValue: 0.05, // < 5% hallucination rate
    currentValue: 0.15,
    priority: 'high',
    status: 'active',
    strategies: ['Increase self-consistency threshold', 'Validate responses more strictly', 'Cache successful patterns'],
  },
  {
    id: 'goal-2',
    name: 'Optimize Memory ROI',
    description: 'Increase percentage of stored memories that get retrieved and used',
    metric: 'memory_roi',
    targetValue: 0.6, // 60% of stored memories should be useful
    currentValue: 0.3,
    priority: 'medium',
    status: 'active',
    strategies: ['Raise memory quality threshold', 'Prune low-quality memories', 'Improve memory retrieval accuracy'],
  },
  {
    id: 'goal-3',
    name: 'Stabilize Planner Confidence',
    description: 'Reduce variance in planner confidence scores',
    metric: 'planner_accuracy',
    targetValue: 0.85, // 85% planner accuracy
    currentValue: 0.75,
    priority: 'high',
    status: 'active',
    strategies: ['Apply identity damping', 'Adjust confidence bias', 'Validate plan outcomes'],
  },
];

/**
 * Get current system goals
 */
export function getSystemGoals(): SystemGoal[] {
  return [...systemGoals];
}

/**
 * Add or update a system goal
 */
export function setSystemGoal(goal: SystemGoal): void {
  const existingIndex = systemGoals.findIndex(g => g.id === goal.id);
  if (existingIndex >= 0) {
    systemGoals[existingIndex] = goal;
  } else {
    systemGoals.push(goal);
  }
}

/**
 * Update goal progress based on current metrics
 */
export function updateGoalProgress(): void {
  const stats = metricsStore.getStats();
  const drift = stats.drift;
  
  // Update planner accuracy goal
  const plannerGoal = systemGoals.find(g => g.metric === 'planner_accuracy');
  if (plannerGoal) {
    plannerGoal.currentValue = drift.plannerAccuracy;
    if (plannerGoal.currentValue >= plannerGoal.targetValue) {
      plannerGoal.status = 'achieved';
    }
  }
  
  // Other goals would be updated similarly based on their metrics
  console.log('🎯 Goal progress updated:', systemGoals.map(g => ({
    name: g.name,
    current: g.currentValue.toFixed(2),
    target: g.targetValue.toFixed(2),
    status: g.status,
  })));
}

/**
 * Get goal-aware bias injection
 * Injects goal optimization guidance into controller
 */
export function generateGoalBias(): string {
  const activeGoals = systemGoals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) return '';
  
  const biasLines: string[] = ['OPTIMIZATION GOALS:'];
  
  for (const goal of activeGoals.slice(0, 2)) { // Focus on top 2 goals
    biasLines.push(`- ${goal.name}: Target ${(goal.targetValue * 100).toFixed(0)}% (currently ${(goal.currentValue * 100).toFixed(0)}%)`);
    
    // Add specific guidance based on goal type
    if (goal.metric === 'hallucination_rate') {
      biasLines.push('  → Use self-consistency for uncertain queries');
      biasLines.push('  → Validate responses before delivery');
    } else if (goal.metric === 'memory_roi') {
      biasLines.push('  → Only store high-quality memories');
      biasLines.push('  → Prefer retrieving over generating');
    }
  }
  
  return biasLines.join('\n');
}

// ==========================================
// WEEKLY INTELLIGENCE CYCLE
// ==========================================

/**
 * Run the complete intelligence flywheel cycle
 * Call this weekly via cron job
 */
export async function runWeeklyIntelligenceCycle(): Promise<IntelligenceCycleOutputs> {
  console.log('🔄 Starting weekly intelligence cycle...');
  const startTime = Date.now();
  
  // Step 1: Update identity with damping
  console.log('  Step 1: Updating cognitive identity...');
  const identityResult = await runWeeklyReflection();
  
  // Step 2: Update goal progress
  console.log('  Step 2: Updating goal progress...');
  updateGoalProgress();
  
  // Step 3: Calibrate adaptive thresholds
  console.log('  Step 3: Calibrating thresholds...');
  metricsStore.calibrateThresholds();
  const thresholds = metricsStore.getThresholds();
  
  // Step 4: Analyze exploration outcomes
  console.log('  Step 4: Analyzing exploration...');
  const explorationInsights = getExplorationInsights();
  
  // Adjust exploration rate based on maturity
  const totalInteractions = metricsStore.getStats().totalMetrics;
  const maturityFactor = Math.min(1, totalInteractions / 1000);
  const newExplorationRate = 0.08 * (1 - maturityFactor * 0.5); // Decay to 4%
  explorationState.explorationRate = newExplorationRate;
  
  // Step 5: Determine cache strategy
  console.log('  Step 5: Determining cache strategy...');
  const cacheStats = cognitiveCache.getStats();
  let cacheStrategy: IntelligenceCycleOutputs['systemTuning']['cacheStrategy'] = 'balanced';
  if (cacheStats.hitRate < 0.2) {
    cacheStrategy = 'aggressive';
  } else if (cacheStats.hitRate > 0.6) {
    cacheStrategy = 'conservative';
  }
  
  // Step 6: Calculate memory pruning target
  console.log('  Step 6: Calculating pruning targets...');
  const memoryPruningTarget = cacheStats.size > 400 ? 50 : 0; // Prune if cache large
  
  // Step 7: Generate outputs
  const outputs: IntelligenceCycleOutputs = {
    adaptiveThresholds: {
      selfConsistencyThreshold: thresholds.selfConsistencyThreshold,
      memoryStorageThreshold: thresholds.memoryStorageThreshold,
      explorationRate: newExplorationRate,
    },
    identity: {
      confidenceBiasDelta: identityResult.identity.confidenceBias,
      phase: identityResult.identity.learningPhase,
      trajectory: identityResult.identity.improvementTrajectory,
      changes: identityResult.changes,
    },
    systemTuning: {
      cacheStrategy,
      memoryPruningTarget,
      explorationRate: newExplorationRate,
    },
    nextCycleTargets: {
      targetHealthScore: 85,
      targetPlannerAccuracy: 0.85,
      targetMemoryROI: 0.6,
    },
    timestamp: Date.now(),
    weekNumber: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
  };
  
  const duration = Date.now() - startTime;
  
  console.log('✅ Weekly intelligence cycle complete:', {
    duration: `${duration}ms`,
    identityChanges: outputs.identity.changes.length,
    newExplorationRate: outputs.adaptiveThresholds.explorationRate.toFixed(3),
    cacheStrategy: outputs.systemTuning.cacheStrategy,
  });
  
  return outputs;
}

// ==========================================
// EXPORTS
// ==========================================

export {
  systemGoals,
};
