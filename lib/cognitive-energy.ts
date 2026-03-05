/**
 * Cognitive Energy Model
 * 
 * Phase 12: Unified Decision Cost Abstraction
 * 
 * Every action costs cognitive energy. The planner must stay within budget.
 * This creates predictable latency, stable reasoning depth, graceful scaling.
 * 
 * Energy costs per action:
 * - cache reuse: 1
 * - memory retrieval: 2
 * - single-pass reasoning: 3
 * - dual reasoning: 5
 * - self-consistency: 8
 * - exploration: 6
 * - tool execution: 4
 * 
 * Budget determined by identity phase and system load.
 */

import { getCognitiveIdentity, type CognitiveIdentity } from './observability';
import { metricsStore } from './adaptive-intelligence';

// ==========================================
// ENERGY COSTS
// ==========================================

export const ENERGY_COSTS = {
  cacheReuse: 1,
  memoryRetrieval: 2,
  singlePassReasoning: 3,
  dualReasoning: 5,
  selfConsistency: 8,
  exploration: 6,
  toolExecution: 4,
  validation: 2,
  memoryStorage: 1,
} as const;

export type EnergyCost = typeof ENERGY_COSTS[keyof typeof ENERGY_COSTS];

// ==========================================
// ENERGY BUDGET CONFIGURATION
// ==========================================

interface EnergyBudgetConfig {
  baseBudget: number;
  maxBudget: number;
  minBudget: number;
  phaseMultipliers: Record<CognitiveIdentity['learningPhase'], number>;
}

const BUDGET_CONFIG: EnergyBudgetConfig = {
  baseBudget: 10, // Default energy units per request
  maxBudget: 20,  // Hard cap to prevent runaway
  minBudget: 5,   // Minimum for basic functionality
  phaseMultipliers: {
    exploration: 1.2,    // More energy when exploring
    optimization: 1.0, // Normal
    mature: 0.9,       // Can be more efficient when stable
  },
};

// ==========================================
// ENERGY TRACKER
// ==========================================

export interface EnergyExpenditure {
  interactionId: string;
  timestamp: number;
  budget: number;
  spent: number;
  remaining: number;
  
  // Breakdown
  actions: Array<{
    action: keyof typeof ENERGY_COSTS;
    cost: number;
    reason: string;
  }>;
  
  // Outcome
  success: boolean;
  wasThrottled: boolean;
}

class CognitiveEnergyTracker {
  private expenditures: EnergyExpenditure[] = [];
  private currentInteractionId: string | null = null;
  private currentBudget: number = BUDGET_CONFIG.baseBudget;
  private spent: number = 0;
  private actions: EnergyExpenditure['actions'] = [];
  
  /**
   * Initialize energy budget for new interaction
   */
  startInteraction(interactionId: string): number {
    const identity = getCognitiveIdentity();
    const phaseMultiplier = BUDGET_CONFIG.phaseMultipliers[identity.learningPhase];
    
    // Adjust based on system load
    const stats = metricsStore.getStats();
    const loadFactor = stats.totalMetrics > 100 ? 0.9 : 1.0;
    
    this.currentBudget = Math.min(
      BUDGET_CONFIG.maxBudget,
      Math.max(
        BUDGET_CONFIG.minBudget,
        BUDGET_CONFIG.baseBudget * phaseMultiplier * loadFactor
      )
    );
    
    this.currentInteractionId = interactionId;
    this.spent = 0;
    this.actions = [];
    
    console.log('⚡ Energy budget allocated:', {
      interactionId: interactionId.slice(0, 8),
      budget: this.currentBudget.toFixed(1),
      phase: identity.learningPhase,
    });
    
    return this.currentBudget;
  }
  
  /**
   * Spend energy on an action
   * Returns true if successful, false if insufficient budget
   */
  spendEnergy(
    action: keyof typeof ENERGY_COSTS,
    reason: string
  ): { success: boolean; remaining: number; wasThrottled: boolean } {
    if (!this.currentInteractionId) {
      console.warn('No active interaction for energy tracking');
      return { success: true, remaining: 0, wasThrottled: false };
    }
    
    const cost = ENERGY_COSTS[action];
    const projectedSpend = this.spent + cost;
    
    // Check if we have budget
    if (projectedSpend > this.currentBudget) {
      // Emergency: allow critical actions but flag throttling
      const isCritical = action === 'singlePassReasoning' || action === 'cacheReuse';
      
      if (!isCritical) {
        console.log('⚠️ Energy budget exhausted:', {
          action,
          needed: cost,
          remaining: this.currentBudget - this.spent,
        });
        return { 
          success: false, 
          remaining: this.currentBudget - this.spent,
          wasThrottled: true,
        };
      }
      
      // Allow critical actions with throttling flag
      this.actions.push({ action, cost, reason: `${reason} [THROTTLED]` });
      this.spent += cost;
      
      return { 
        success: true, 
        remaining: this.currentBudget - this.spent,
        wasThrottled: true,
      };
    }
    
    // Normal spend
    this.actions.push({ action, cost, reason });
    this.spent += cost;
    
    return { 
      success: true, 
      remaining: this.currentBudget - this.spent,
      wasThrottled: false,
    };
  }
  
  /**
   * End interaction and record expenditure
   */
  endInteraction(success: boolean): EnergyExpenditure {
    if (!this.currentInteractionId) {
      throw new Error('No active interaction to end');
    }
    
    const expenditure: EnergyExpenditure = {
      interactionId: this.currentInteractionId,
      timestamp: Date.now(),
      budget: this.currentBudget,
      spent: this.spent,
      remaining: this.currentBudget - this.spent,
      actions: [...this.actions],
      success,
      wasThrottled: this.spent > this.currentBudget,
    };
    
    this.expenditures.push(expenditure);
    
    // Prune old entries
    if (this.expenditures.length > 100) {
      this.expenditures.shift();
    }
    
    // Reset
    this.currentInteractionId = null;
    
    console.log('⚡ Energy expenditure:', {
      spent: expenditure.spent.toFixed(1),
      budget: expenditure.budget.toFixed(1),
      remaining: expenditure.remaining.toFixed(1),
      efficiency: ((expenditure.spent / expenditure.budget) * 100).toFixed(0) + '%',
    });
    
    return expenditure;
  }
  
  /**
   * Get remaining budget for current interaction
   */
  getRemaining(): number {
    if (!this.currentInteractionId) return 0;
    return this.currentBudget - this.spent;
  }
  
  /**
   * Get efficiency metrics
   */
  getMetrics(windowSize: number = 50): {
    avgEfficiency: number; // 0-1, spent/budget
    avgThrottlingRate: number;
    optimalBudgetSuggestion: number;
    costByAction: Record<string, { total: number; count: number }>;
  } {
    const recent = this.expenditures.slice(-windowSize);
    
    if (recent.length === 0) {
      return {
        avgEfficiency: 0.7,
        avgThrottlingRate: 0,
        optimalBudgetSuggestion: BUDGET_CONFIG.baseBudget,
        costByAction: {},
      };
    }
    
    const avgEfficiency = recent.reduce((s, e) => s + (e.spent / e.budget), 0) / recent.length;
    const throttlingRate = recent.filter(e => e.wasThrottled).length / recent.length;
    
    // Calculate cost breakdown
    const costByAction: Record<string, { total: number; count: number }> = {};
    for (const exp of recent) {
      for (const action of exp.actions) {
        if (!costByAction[action.action]) {
          costByAction[action.action] = { total: 0, count: 0 };
        }
        costByAction[action.action].total += action.cost;
        costByAction[action.action].count++;
      }
    }
    
    // Suggest optimal budget based on actual usage
    const avgSpent = recent.reduce((s, e) => s + e.spent, 0) / recent.length;
    const optimalBudget = Math.min(
      BUDGET_CONFIG.maxBudget,
      Math.max(BUDGET_CONFIG.minBudget, avgSpent * 1.1) // 10% buffer
    );
    
    return {
      avgEfficiency,
      avgThrottlingRate: throttlingRate,
      optimalBudgetSuggestion: optimalBudget,
      costByAction,
    };
  }
}

export const energyTracker = new CognitiveEnergyTracker();

// ==========================================
// ENERGY-AWARE PLANNING
// ==========================================

export interface EnergyPlan {
  // What the system wants to do
  desiredActions: Array<{
    action: keyof typeof ENERGY_COSTS;
    priority: 'required' | 'preferred' | 'optional';
    reason: string;
  }>;
  
  // What the system can actually do
  feasibleActions: Array<{
    action: keyof typeof ENERGY_COSTS;
    cost: number;
    willExecute: boolean;
  }>;
  
  // Budget summary
  totalCost: number;
  budget: number;
  deficit: number; // negative = under budget, positive = over budget
  
  // Recommendations
  throttlingRequired: boolean;
  alternatives: string[];
}

/**
 * Create an energy-aware plan
 */
export function createEnergyPlan(
  desiredActions: EnergyPlan['desiredActions']
): EnergyPlan {
  const budget = energyTracker.getRemaining();
  let availableBudget = budget;
  
  const feasibleActions: EnergyPlan['feasibleActions'] = [];
  const alternatives: string[] = [];
  
  // Sort by priority
  const sortedActions = [...desiredActions].sort((a, b) => {
    const priorityOrder = { required: 0, preferred: 1, optional: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  for (const desired of sortedActions) {
    const cost = ENERGY_COSTS[desired.action];
    
    if (cost <= availableBudget) {
      // Can afford
      feasibleActions.push({
        action: desired.action,
        cost,
        willExecute: true,
      });
      availableBudget -= cost;
    } else {
      // Cannot afford
      feasibleActions.push({
        action: desired.action,
        cost,
        willExecute: false,
      });
      
      // Suggest alternatives
      if (desired.priority === 'preferred' || desired.priority === 'optional') {
        alternatives.push(`Skip ${desired.action}: ${desired.reason}`);
      } else if (desired.priority === 'required') {
        // Find cheaper alternative
        if (desired.action === 'selfConsistency') {
          alternatives.push(`Replace self-consistency with dual-reasoning for ${desired.reason}`);
        } else if (desired.action === 'dualReasoning') {
          alternatives.push(`Replace dual-reasoning with single-pass for ${desired.reason}`);
        } else if (desired.action === 'memoryRetrieval') {
          alternatives.push(`Skip memory retrieval, rely on base knowledge for ${desired.reason}`);
        }
      }
    }
  }
  
  const totalCost = feasibleActions
    .filter(a => a.willExecute)
    .reduce((s, a) => s + a.cost, 0);
  
  return {
    desiredActions,
    feasibleActions,
    totalCost,
    budget,
    deficit: totalCost - budget,
    throttlingRequired: totalCost > budget,
    alternatives,
  };
}

// ==========================================
// ENERGY-BASED DECISION HELPERS
// ==========================================

/**
 * Check if we can afford a specific action
 */
export function canAfford(action: keyof typeof ENERGY_COSTS): boolean {
  const cost = ENERGY_COSTS[action];
  const remaining = energyTracker.getRemaining();
  return cost <= remaining;
}

/**
 * Get recommended action sequence based on budget
 */
export function getOptimizedActionSequence(
  needs: {
    cacheAvailable: boolean;
    needsMemory: boolean;
    needsDualReasoning: boolean;
    needsSelfConsistency: boolean;
    isExploration: boolean;
  }
): Array<{ action: keyof typeof ENERGY_COSTS; reason: string }> {
  const remaining = energyTracker.getRemaining();
  const sequence: Array<{ action: keyof typeof ENERGY_COSTS; reason: string }> = [];
  let budget = remaining;
  
  // Always try cache first (cheapest)
  if (needs.cacheAvailable) {
    sequence.push({ action: 'cacheReuse', reason: 'Instant response available' });
    return sequence; // Cache hit is all we need
  }
  
  // Basic response is required
  sequence.push({ action: 'singlePassReasoning', reason: 'Core response generation' });
  budget -= ENERGY_COSTS.singlePassReasoning;
  
  // Memory retrieval if needed and affordable
  if (needs.needsMemory && budget >= ENERGY_COSTS.memoryRetrieval) {
    sequence.push({ action: 'memoryRetrieval', reason: 'Context enhancement' });
    budget -= ENERGY_COSTS.memoryRetrieval;
  }
  
  // Dual reasoning if needed and affordable
  if (needs.needsDualReasoning && budget >= ENERGY_COSTS.dualReasoning) {
    sequence.push({ action: 'dualReasoning', reason: 'Quality improvement' });
    budget -= ENERGY_COSTS.dualReasoning;
  }
  
  // Self-consistency only if high budget remaining
  if (needs.needsSelfConsistency && budget >= ENERGY_COSTS.selfConsistency) {
    sequence.push({ action: 'selfConsistency', reason: 'Maximum reliability' });
    budget -= ENERGY_COSTS.selfConsistency;
  }
  
  return sequence;
}
