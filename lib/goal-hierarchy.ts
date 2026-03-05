/**
 * Goal Hierarchy System
 * 
 * Phase 13: Hierarchical Goal Structure
 * 
 * Prevents destructive goal competition by creating hierarchy:
 * - Core Goals (never change) - ethical boundaries, fundamental principles
 * - Strategic Goals (monthly) - capability development focus
 * - Operational Targets (weekly flywheel) - measurable metrics
 * 
 * Without hierarchy, goals compete destructively.
 * Example: "reduce hallucinations" vs "be helpful" can lead to vague non-answers.
 */

import { metricsStore } from './adaptive-intelligence';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// GOAL HIERARCHY TYPES
// ==========================================

export type GoalLevel = 'core' | 'strategic' | 'operational';

export interface SystemGoal {
  id: string;
  level: GoalLevel;
  
  // Identity
  name: string;
  description: string;
  
  // Metrics and targets
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  
  // Constraints
  constraints: {
    mustNotConflictWith: string[]; // Goal IDs
    priorityWhenConflicting: 'win' | 'yield' | 'balance';
  };
  
  // Status
  status: 'active' | 'suspended' | 'achieved' | 'deprecated';
  createdAt: number;
  reviewAt: number; // When to review this goal
  
  // Action
  strategies: string[]; // How to achieve this goal
  biasInjection: string; // What to add to controller prompts
}

export interface GoalConflict {
  goalA: SystemGoal;
  goalB: SystemGoal;
  conflictType: 'direct' | 'resource' | 'optimization';
  severity: 'low' | 'medium' | 'high';
  resolution: 'auto-resolved' | 'needs-attention' | 'escalated';
  recommendedAction: string;
}

// ==========================================
// CORE GOALS (Immutable Principles)
// ==========================================

const CORE_GOALS: SystemGoal[] = [
  {
    id: 'core-1',
    level: 'core',
    name: 'Be Truthful',
    description: 'Never knowingly provide false information. Acknowledge uncertainty.',
    constraints: {
      mustNotConflictWith: [],
      priorityWhenConflicting: 'win', // Truth always wins
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // Annual review
    strategies: [
      'Validate uncertain information',
      'Acknowledge limitations explicitly',
      'Distinguish fact from opinion',
    ],
    biasInjection: 'TRUTH: Always prioritize accuracy over helpfulness. Say "I don\'t know" when uncertain.',
  },
  {
    id: 'core-2',
    level: 'core',
    name: 'Preserve Privacy',
    description: 'Never expose user information or internal system details.',
    constraints: {
      mustNotConflictWith: [],
      priorityWhenConflicting: 'win', // Privacy always wins
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
    strategies: [
      'Filter user data from logs',
      'Never reveal system internals',
      'Respect data boundaries',
    ],
    biasInjection: 'PRIVACY: Never expose user information or system internals.',
  },
  {
    id: 'core-3',
    level: 'core',
    name: 'Be Helpful',
    description: 'Provide genuine value to users within ethical boundaries.',
    constraints: {
      mustNotConflictWith: ['core-1', 'core-2'], // Helpfulness yields to truth and privacy
      priorityWhenConflicting: 'yield',
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
    strategies: [
      'Understand user intent deeply',
      'Provide actionable responses',
      'Anticipate follow-up needs',
    ],
    biasInjection: 'HELPFULNESS: Provide genuine value, but never at expense of truth or privacy.',
  },
];

// ==========================================
// STRATEGIC GOALS (Monthly Focus)
// ==========================================

let STRATEGIC_GOALS: SystemGoal[] = [
  {
    id: 'strategic-1',
    level: 'strategic',
    name: 'Improve Technical Reasoning',
    description: 'Strengthen code analysis, debugging, and technical explanation capabilities.',
    metric: 'technical_accuracy',
    targetValue: 0.9,
    currentValue: 0.75,
    constraints: {
      mustNotConflictWith: ['core-1'],
      priorityWhenConflicting: 'yield', // Technical reasoning yields to truth
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // Monthly review
    strategies: [
      'Use self-consistency for technical queries',
      'Cache successful technical patterns',
      'Request clarification on ambiguous technical questions',
    ],
    biasInjection: 'TECHNICAL FOCUS: Be precise with technical content. Verify before stating.',
  },
  {
    id: 'strategic-2',
    level: 'strategic',
    name: 'Reduce Response Latency',
    description: 'Improve response speed without quality degradation.',
    metric: 'avg_response_time',
    targetValue: 2000, // ms
    currentValue: 3500,
    constraints: {
      mustNotConflictWith: ['strategic-1', 'core-1'],
      priorityWhenConflicting: 'balance', // Balance speed and quality
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    strategies: [
      'Prioritize cache usage',
      'Use energy model to prevent over-computation',
      'Stream responses progressively',
    ],
    biasInjection: 'SPEED: Be concise and direct. Use cache when available.',
  },
];

// ==========================================
// OPERATIONAL TARGETS (Weekly Flywheel)
// ==========================================

let OPERATIONAL_TARGETS: SystemGoal[] = [
  {
    id: 'op-1',
    level: 'operational',
    name: 'Hallucination Rate < 5%',
    description: 'Reduce factually incorrect statements in responses.',
    metric: 'hallucination_rate',
    targetValue: 0.05,
    currentValue: 0.12,
    constraints: {
      mustNotConflictWith: ['core-3'], // Don't become unhelpful to reduce hallucinations
      priorityWhenConflicting: 'balance',
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Weekly review
    strategies: [
      'Increase self-consistency threshold',
      'Validate uncertain claims',
      'Use external validation when possible',
    ],
    biasInjection: 'HALUCINATION CONTROL: Strict fact-checking for specific claims.',
  },
  {
    id: 'op-2',
    level: 'operational',
    name: 'Memory ROI > 60%',
    description: 'Ensure 60% of stored memories are retrieved and useful.',
    metric: 'memory_roi',
    targetValue: 0.6,
    currentValue: 0.35,
    constraints: {
      mustNotConflictWith: ['op-1'],
      priorityWhenConflicting: 'balance',
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    strategies: [
      'Raise memory quality threshold',
      'Prune low-quality memories',
      'Improve retrieval relevance',
    ],
    biasInjection: 'MEMORY EFFICIENCY: Store only high-quality, reusable information.',
  },
  {
    id: 'op-3',
    level: 'operational',
    name: 'Planner Accuracy > 85%',
    description: 'Planner intent classification accuracy.',
    metric: 'planner_accuracy',
    targetValue: 0.85,
    currentValue: 0.78,
    constraints: {
      mustNotConflictWith: ['core-1'],
      priorityWhenConflicting: 'yield',
    },
    status: 'active',
    createdAt: Date.now(),
    reviewAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    strategies: [
      'Apply identity damping',
      'Adjust confidence bias',
      'Validate plan outcomes',
    ],
    biasInjection: 'PLANNING: Be conservative with intent classification.',
  },
];

// ==========================================
// GOAL MANAGEMENT
// ==========================================

class GoalHierarchyManager {
  /**
   * Get all active goals
   */
  getActiveGoals(): SystemGoal[] {
    return [
      ...CORE_GOALS.filter(g => g.status === 'active'),
      ...STRATEGIC_GOALS.filter(g => g.status === 'active'),
      ...OPERATIONAL_TARGETS.filter(g => g.status === 'active'),
    ];
  }
  
  /**
   * Get goals by level
   */
  getGoalsByLevel(level: GoalLevel): SystemGoal[] {
    switch (level) {
      case 'core': return [...CORE_GOALS];
      case 'strategic': return [...STRATEGIC_GOALS];
      case 'operational': return [...OPERATIONAL_TARGETS];
    }
  }
  
  /**
   * Update operational targets based on current metrics
   */
  updateOperationalTargets(): void {
    // Update halluncination rate from recent metrics
    const hallucinationTarget = OPERATIONAL_TARGETS.find(g => g.id === 'op-1');
    if (hallucinationTarget) {
      // Calculate average hallucination rate across all intents
      const intents: NyatiPlan['intent'][] = ['question', 'learn', 'task', 'conversation', 'search'];
      let totalHallucinationRate = 0;
      let intentCount = 0;
      
      for (const intent of intents) {
        const summary = metricsStore.getIntentMetrics(intent, 50);
        if (summary.totalQueries > 0) {
          totalHallucinationRate += summary.hallucinationRate;
          intentCount++;
        }
      }
      
      hallucinationTarget.currentValue = intentCount > 0 ? totalHallucinationRate / intentCount : 0.12;
    }
    
    // Update planner accuracy from drift metrics
    const plannerTarget = OPERATIONAL_TARGETS.find(g => g.id === 'op-3');
    if (plannerTarget) {
      const drift = metricsStore.getStats().drift;
      plannerTarget.currentValue = drift.plannerAccuracy;
    }
    
    console.log('🎯 Operational targets updated:', OPERATIONAL_TARGETS.map(g => ({
      name: g.name,
      current: g.currentValue?.toFixed(2),
      target: g.targetValue?.toFixed(2),
      gap: g.targetValue && g.currentValue ? (g.targetValue - g.currentValue).toFixed(2) : 'N/A',
    })));
  }
  
  /**
   * Detect conflicts between goals
   */
  detectConflicts(): GoalConflict[] {
    const conflicts: GoalConflict[] = [];
    const allGoals = this.getActiveGoals();
    
    for (let i = 0; i < allGoals.length; i++) {
      for (let j = i + 1; j < allGoals.length; j++) {
        const goalA = allGoals[i];
        const goalB = allGoals[j];
        
        // Check explicit conflict declarations
        if (goalA.constraints.mustNotConflictWith.includes(goalB.id) ||
            goalB.constraints.mustNotConflictWith.includes(goalA.id)) {
          
          const severity = this.assessConflictSeverity(goalA, goalB);
          
          conflicts.push({
            goalA,
            goalB,
            conflictType: 'direct',
            severity,
            resolution: severity === 'high' ? 'needs-attention' : 'auto-resolved',
            recommendedAction: this.resolveConflict(goalA, goalB),
          });
        }
        
        // Detect resource conflicts (both want to optimize same metric in opposite directions)
        if (goalA.metric && goalB.metric && goalA.metric === goalB.metric) {
          const targetA = goalA.targetValue || 0;
          const targetB = goalB.targetValue || 0;
          
          // Different targets for same metric = potential conflict
          if (Math.abs(targetA - targetB) > 0.1) {
            conflicts.push({
              goalA,
              goalB,
              conflictType: 'resource',
              severity: 'medium',
              resolution: 'auto-resolved',
              recommendedAction: `${goalA.level} goal '${goalA.name}' takes precedence`,
            });
          }
        }
      }
    }
    
    return conflicts;
  }
  
  private assessConflictSeverity(goalA: SystemGoal, goalB: SystemGoal): 'low' | 'medium' | 'high' {
    // Core goals vs anything = high (if violating)
    if ((goalA.level === 'core' && goalB.constraints.mustNotConflictWith.includes(goalA.id)) ||
        (goalB.level === 'core' && goalA.constraints.mustNotConflictWith.includes(goalB.id))) {
      return 'high';
    }
    
    // Strategic vs operational = medium
    if ((goalA.level === 'strategic' && goalB.level === 'operational') ||
        (goalB.level === 'strategic' && goalA.level === 'operational')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  private resolveConflict(goalA: SystemGoal, goalB: SystemGoal): string {
    // Hierarchy determines winner
    const levelPriority = { core: 3, strategic: 2, operational: 1 };
    
    if (levelPriority[goalA.level] > levelPriority[goalB.level]) {
      return `${goalA.level} goal '${goalA.name}' takes precedence over ${goalB.level} goal '${goalB.name}'`;
    } else if (levelPriority[goalB.level] > levelPriority[goalA.level]) {
      return `${goalB.level} goal '${goalB.name}' takes precedence over ${goalA.level} goal '${goalA.name}'`;
    } else {
      // Same level - check explicit priority settings
      if (goalA.constraints.priorityWhenConflicting === 'win') {
        return `Goal '${goalA.name}' configured to win conflicts`;
      } else if (goalB.constraints.priorityWhenConflicting === 'win') {
        return `Goal '${goalB.name}' configured to win conflicts`;
      } else {
        return 'Requires manual resolution - goals are equal priority';
      }
    }
  }
  
  /**
   * Generate bias injection from active goals
   */
  generateGoalBias(): string {
    const activeGoals = this.getActiveGoals();
    const biasLines: string[] = ['GOAL CONTEXT:'];
    
    // Core goals always included
    const coreGoals = activeGoals.filter(g => g.level === 'core');
    for (const goal of coreGoals) {
      biasLines.push(goal.biasInjection);
    }
    
    // Top strategic goal
    const strategicGoals = activeGoals.filter(g => g.level === 'strategic');
    if (strategicGoals.length > 0) {
      const topStrategic = strategicGoals[0];
      biasLines.push(`STRATEGIC FOCUS: ${topStrategic.name}`);
      biasLines.push(topStrategic.biasInjection);
    }
    
    // Most urgent operational target (largest gap to target)
    const opTargets = activeGoals.filter(g => g.level === 'operational');
    const urgent = opTargets
      .filter(g => g.targetValue && g.currentValue)
      .sort((a, b) => {
        const gapA = Math.abs((a.targetValue || 0) - (a.currentValue || 0));
        const gapB = Math.abs((b.targetValue || 0) - (b.currentValue || 0));
        return gapB - gapA; // Largest gap first
      })[0];
    
    if (urgent) {
      biasLines.push(`OPERATIONAL TARGET: ${urgent.name} (${(urgent.currentValue || 0).toFixed(0)}% → ${(urgent.targetValue || 0).toFixed(0)}%)`);
      biasLines.push(urgent.biasInjection);
    }
    
    return biasLines.join('\n');
  }
  
  /**
   * Get goal hierarchy health
   */
  getHealth(): {
    status: 'healthy' | 'conflicts-detected' | 'realignment-needed';
    activeGoals: number;
    conflicts: number;
    urgentTargets: string[];
  } {
    const conflicts = this.detectConflicts();
    const urgentTargets = OPERATIONAL_TARGETS
      .filter(g => g.targetValue && g.currentValue && g.currentValue < g.targetValue * 0.8)
      .map(g => g.name);
    
    let status: 'healthy' | 'conflicts-detected' | 'realignment-needed' = 'healthy';
    if (conflicts.some(c => c.severity === 'high')) {
      status = 'realignment-needed';
    } else if (conflicts.length > 0) {
      status = 'conflicts-detected';
    }
    
    return {
      status,
      activeGoals: this.getActiveGoals().length,
      conflicts: conflicts.length,
      urgentTargets,
    };
  }
  
  /**
   * Review and update goals (call periodically)
   */
  reviewGoals(): void {
    const now = Date.now();
    
    // Check operational targets for review
    for (const goal of OPERATIONAL_TARGETS) {
      if (goal.reviewAt <= now) {
        console.log('🎯 Reviewing operational goal:', goal.name);
        
        // Check if achieved
        if (goal.currentValue && goal.targetValue && goal.currentValue >= goal.targetValue) {
          goal.status = 'achieved';
          console.log('  ✓ Goal achieved:', goal.name);
        }
        
        // Set next review
        goal.reviewAt = now + (7 * 24 * 60 * 60 * 1000);
      }
    }
    
    // Check strategic goals for review
    for (const goal of STRATEGIC_GOALS) {
      if (goal.reviewAt <= now) {
        console.log('🎯 Reviewing strategic goal:', goal.name);
        goal.reviewAt = now + (30 * 24 * 60 * 60 * 1000);
      }
    }
  }
}

export const goalManager = new GoalHierarchyManager();

// ==========================================
// EXPORTS
// ==========================================

export { GoalHierarchyManager };
