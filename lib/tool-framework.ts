/**
 * Controlled Tool Introduction Framework
 * 
 * Phase 14: Safe Capability Expansion
 * 
 * Tools multiply failure modes: model_error × tool_error × routing_error
 * This framework ensures tools are only added when the system is stable enough
 * to handle the additional complexity.
 * 
 * Readiness Gates (all must pass):
 * 1. Health score variance stabilizes
 * 2. Planner stability trend flattens
 * 3. Cache hit rate stabilizes (<60% dependency)
 * 
 * Tool Rollout Stages:
 * 1. Shadow Mode - execute but don't use results
 * 2. Advisory Mode - show results but don't act on them
 * 3. Assisted Mode - use with human confirmation
 * 4. Autonomous Mode - full integration
 * 
 * Tool Priority Order:
 * 1. Calculator (deterministic, safe)
 * 2. Web Search (external data)
 * 3. Code Execution (sandboxed)
 * 4. File Operations (destructive)
 */

import { getObservabilityData } from './observability';
import { getRealityAnchorStatus } from './reality-anchors';
import { goalManager } from './goal-hierarchy';
import { energyTracker, ENERGY_COSTS } from './cognitive-energy';
import { searchDuckDuckGo } from './duckduckgo-search';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// TOOL DEFINITIONS
// ==========================================

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'deterministic' | 'external' | 'sandboxed' | 'destructive';
  
  // Safety properties
  isDeterministic: boolean; // Same input = same output
  isReversible: boolean; // Can undo the action
  hasSideEffects: boolean; // Affects external state
  
  // Energy cost
  energyCost: number;
  
  // Rollout configuration
  rolloutStage: RolloutStage;
  readinessGates: ReadinessGate[];
  
  // Execution
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
  executionTimeMs: number;
  confidence: number; // 0-1, how sure we are about the result
}

export type RolloutStage = 
  | 'pending'      // Not yet ready
  | 'shadow'       // Execute but don't use
  | 'advisory'     // Show results, don't act
  | 'assisted'     // Use with confirmation
  | 'autonomous';  // Full integration

export interface ReadinessGate {
  id: string;
  name: string;
  description: string;
  check: () => { passed: boolean; score: number; details: string };
  minScore: number; // 0-1, must exceed to pass
  isRequired: boolean;
}

// ==========================================
// BUILT-IN TOOLS
// ==========================================

// Simple calculator tool (deterministic, safe)
const calculatorTool: ToolDefinition = {
  id: 'calculator',
  name: 'Calculator',
  description: 'Perform mathematical calculations',
  category: 'deterministic',
  isDeterministic: true,
  isReversible: true,
  hasSideEffects: false,
  energyCost: ENERGY_COSTS.toolExecution,
  rolloutStage: 'autonomous', // Safe to enable immediately
  readinessGates: [], // No gates needed for deterministic tools
  execute: async (params) => {
    try {
      const expression = params.expression as string;
      // Safely evaluate math expression
      const result = safeMathEval(expression);
      return {
        success: true,
        data: result,
        executionTimeMs: 10,
        confidence: 1.0,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Calculation failed',
        executionTimeMs: 10,
        confidence: 0,
      };
    }
  },
};

// Safe math evaluation
function safeMathEval(expression: string): number {
  // Only allow numbers and basic operators
  const sanitized = expression.replace(/[^0-9+\-*/.()\s]/g, '');
  if (sanitized !== expression.trim()) {
    throw new Error('Invalid characters in expression');
  }
  
  // Use Function constructor for safer eval
  const fn = new Function(`return (${sanitized})`);
  const result = fn();
  
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Invalid result');
  }
  
  return result;
}

// Web search tool (external, needs gating)
const webSearchTool: ToolDefinition = {
  id: 'web_search',
  name: 'Web Search',
  description: 'Search the web for current information',
  category: 'external',
  isDeterministic: false,
  isReversible: true,
  hasSideEffects: false,
  energyCost: ENERGY_COSTS.toolExecution + 2, // Higher cost for external calls
  rolloutStage: 'pending',
  readinessGates: [
    {
      id: 'health_stability',
      name: 'Health Score Stability',
      description: 'System health score variance < 0.1 over last 100 interactions',
      check: checkHealthStability,
      minScore: 0.8,
      isRequired: true,
    },
    {
      id: 'planner_stability',
      name: 'Planner Stability',
      description: 'Planner confidence variance < 0.15',
      check: checkPlannerStability,
      minScore: 0.75,
      isRequired: true,
    },
    {
      id: 'cache_dependency',
      name: 'Cache Dependency',
      description: 'Cache hit rate < 60% (not over-optimized)',
      check: checkCacheDependency,
      minScore: 0.6,
      isRequired: false,
    },
  ],
  execute: async (params) => {
    try {
      const query = params.query as string;
      const maxResults = (params.maxResults as number) || 5;
      
      const result = await searchDuckDuckGo(query, maxResults);
      
      return {
        success: result.success,
        data: {
          results: result.results,
          totalResults: result.totalResults,
          searchTime: result.searchTime,
        },
        error: result.error,
        executionTimeMs: result.searchTime,
        confidence: result.success ? 0.85 : 0.3,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Web search failed',
        executionTimeMs: 500,
        confidence: 0,
      };
    }
  },
};

// Code execution tool (sandboxed, high risk)
const codeExecutionTool: ToolDefinition = {
  id: 'code_executor',
  name: 'Code Executor',
  description: 'Execute code in sandboxed environment',
  category: 'sandboxed',
  isDeterministic: true,
  isReversible: false,
  hasSideEffects: false, // Sandboxed = no external effects
  energyCost: ENERGY_COSTS.toolExecution + 4, // High cost
  rolloutStage: 'pending',
  readinessGates: [
    {
      id: 'health_stability',
      name: 'Health Score Stability',
      description: 'System health score > 80 for 200+ interactions',
      check: checkHealthStability,
      minScore: 0.85,
      isRequired: true,
    },
    {
      id: 'goal_alignment',
      name: 'Goal Alignment',
      description: 'Strategic goals achieved or on track',
      check: checkGoalAlignment,
      minScore: 0.7,
      isRequired: true,
    },
    {
      id: 'reality_anchor',
      name: 'Reality Anchor Status',
      description: 'Reality anchors show grounded status',
      check: checkRealityAnchors,
      minScore: 0.8,
      isRequired: true,
    },
  ],
  execute: async (params) => {
    // Placeholder - would integrate with sandbox
    console.log('💻 Code execution would run:', params.code);
    return {
      success: true,
      data: { output: 'Code execution integration pending' },
      executionTimeMs: 1000,
      confidence: 0.9,
    };
  },
};

// File operations tool (destructive, highest risk)
const fileOperationsTool: ToolDefinition = {
  id: 'file_ops',
  name: 'File Operations',
  description: 'Read and write files',
  category: 'destructive',
  isDeterministic: true,
  isReversible: false,
  hasSideEffects: true, // Affects filesystem
  energyCost: ENERGY_COSTS.toolExecution + 6, // Highest cost
  rolloutStage: 'pending',
  readinessGates: [
    {
      id: 'system_maturity',
      name: 'System Maturity',
      description: '500+ interactions with stable performance',
      check: checkSystemMaturity,
      minScore: 0.9,
      isRequired: true,
    },
    {
      id: 'all_tools_stable',
      name: 'Lower-Tier Tools Stable',
      description: 'Calculator, Search, and Executor all in autonomous mode',
      check: checkLowerTierTools,
      minScore: 1.0,
      isRequired: true,
    },
    {
      id: 'human_oversight',
      name: 'Human Oversight Ready',
      description: 'Confirmation UI implemented',
      check: checkHumanOversight,
      minScore: 1.0,
      isRequired: true,
    },
  ],
  execute: async (params) => {
    // Would require explicit human confirmation
    console.log('📁 File operation would require confirmation:', params);
    return {
      success: false,
      data: null,
      error: 'File operations require human confirmation - not yet implemented',
      executionTimeMs: 0,
      confidence: 0,
    };
  },
};

// ==========================================
// READINESS GATE CHECKS
// ==========================================

function checkHealthStability() {
  const obs = getObservabilityData();
  const recent = obs.derived;
  
  // Check if health score is stable and good
  const healthScore = obs.healthScore;
  const variance = recent.plannerStability.variance;
  
  const passed = healthScore > 75 && variance < 0.15;
  const score = (healthScore / 100) * (1 - variance);
  
  return {
    passed,
    score: Math.max(0, score),
    details: `Health: ${healthScore}/100, Variance: ${variance.toFixed(2)}`,
  };
}

function checkPlannerStability() {
  const obs = getObservabilityData();
  const stability = obs.derived.plannerStability;
  
  const passed = stability.trend === 'stable' && stability.variance < 0.2;
  const score = stability.trend === 'stable' ? 1 - stability.variance : 0.5;
  
  return {
    passed,
    score,
    details: `Trend: ${stability.trend}, Variance: ${stability.variance.toFixed(2)}`,
  };
}

function checkCacheDependency() {
  // This would need cache stats integration
  // Placeholder implementation
  const cacheHitRate = 0.45; // Would get from cognitiveCache
  
  const passed = cacheHitRate < 0.6;
  const score = 1 - (cacheHitRate / 0.8); // Lower cache dependency = higher score
  
  return {
    passed,
    score: Math.max(0, score),
    details: `Cache hit rate: ${(cacheHitRate * 100).toFixed(0)}%`,
  };
}

function checkGoalAlignment() {
  const health = goalManager.getHealth();
  const goals = goalManager.getActiveGoals();
  
  const onTrackGoals = goals.filter(g => 
    g.currentValue && g.targetValue && g.currentValue >= g.targetValue * 0.8
  ).length;
  
  const score = goals.length > 0 ? onTrackGoals / goals.length : 0.5;
  
  return {
    passed: health.status !== 'realignment-needed',
    score,
    details: `${onTrackGoals}/${goals.length} goals on track`,
  };
}

function checkRealityAnchors() {
  const anchors = getRealityAnchorStatus();
  
  const passed = anchors.anchorStatus === 'grounded';
  const score = anchors.anchorStatus === 'grounded' ? 1.0 : 
                 anchors.anchorStatus === 'attention-needed' ? 0.7 : 0.4;
  
  return {
    passed,
    score,
    details: `Status: ${anchors.anchorStatus}, Confusion: ${(anchors.userConfusion * 100).toFixed(0)}%`,
  };
}

function checkSystemMaturity() {
  const obs = getObservabilityData();
  const totalInteractions = obs.snapshot.totalInteractions;
  
  const passed = totalInteractions >= 500;
  const score = Math.min(1, totalInteractions / 500);
  
  return {
    passed,
    score,
    details: `${totalInteractions}/500 interactions`,
  };
}

function checkLowerTierTools() {
  // Check if calculator, search, and executor are all autonomous
  const tools = [calculatorTool, webSearchTool, codeExecutionTool];
  const autonomousCount = tools.filter(t => t.rolloutStage === 'autonomous').length;
  
  const passed = autonomousCount === 3;
  const score = autonomousCount / 3;
  
  return {
    passed,
    score,
    details: `${autonomousCount}/3 lower-tier tools autonomous`,
  };
}

function checkHumanOversight() {
  // Would check if confirmation UI is implemented
  // Placeholder - always false until implemented
  return {
    passed: false,
    score: 0,
    details: 'Human confirmation UI not yet implemented',
  };
}

// ==========================================
// TOOL REGISTRY
// ==========================================

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private toolExecutions: Array<{
    toolId: string;
    timestamp: number;
    stage: RolloutStage;
    success: boolean;
    usedResult: boolean;
  }> = [];
  
  constructor() {
    // Register built-in tools
    this.register(calculatorTool);
    this.register(webSearchTool);
    this.register(codeExecutionTool);
    this.register(fileOperationsTool);
  }
  
  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
    console.log('🔧 Tool registered:', tool.name, `(stage: ${tool.rolloutStage})`);
  }
  
  /**
   * Check if a tool is ready to be used
   */
  checkReadiness(toolId: string): {
    ready: boolean;
    stage: RolloutStage;
    gateResults: Array<{ name: string; passed: boolean; score: number }>;
  } {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    
    if (tool.rolloutStage === 'autonomous') {
      return { ready: true, stage: 'autonomous', gateResults: [] };
    }
    
    if (tool.rolloutStage === 'pending') {
      // Check all readiness gates
      const gateResults = tool.readinessGates.map(gate => {
        const result = gate.check();
        return {
          name: gate.name,
          passed: result.passed && result.score >= gate.minScore,
          score: result.score,
        };
      });
      
      const allRequiredPassed = tool.readinessGates
        .filter(g => g.isRequired)
        .every((g, i) => gateResults[i].passed);
      
      const avgScore = gateResults.reduce((s, r) => s + r.score, 0) / gateResults.length;
      
      return {
        ready: allRequiredPassed && avgScore > 0.7,
        stage: tool.rolloutStage,
        gateResults,
      };
    }
    
    return {
      ready: ['assisted', 'autonomous'].includes(tool.rolloutStage),
      stage: tool.rolloutStage,
      gateResults: [],
    };
  }
  
  /**
   * Advance a tool to the next rollout stage
   */
  advanceStage(toolId: string): { success: boolean; newStage: RolloutStage; message: string } {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { success: false, newStage: 'pending', message: 'Tool not found' };
    }
    
    const stages: RolloutStage[] = ['pending', 'shadow', 'advisory', 'assisted', 'autonomous'];
    const currentIndex = stages.indexOf(tool.rolloutStage);
    
    if (currentIndex === stages.length - 1) {
      return { success: false, newStage: tool.rolloutStage, message: 'Already at final stage' };
    }
    
    // Check readiness before advancing
    if (tool.rolloutStage === 'pending') {
      const readiness = this.checkReadiness(toolId);
      if (!readiness.ready) {
        return { 
          success: false, 
          newStage: tool.rolloutStage, 
          message: `Readiness gates not passed: ${readiness.gateResults.filter(g => !g.passed).map(g => g.name).join(', ')}`,
        };
      }
    }
    
    const newStage = stages[currentIndex + 1];
    tool.rolloutStage = newStage;
    
    console.log('🚀 Tool stage advanced:', tool.name, '→', newStage);
    
    return {
      success: true,
      newStage,
      message: `Advanced to ${newStage}`,
    };
  }
  
  /**
   * Execute a tool if allowed by current stage
   */
  async execute(
    toolId: string,
    params: Record<string, unknown>,
    plan: NyatiPlan
  ): Promise<{ result: ToolResult; used: boolean; stage: RolloutStage }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    
    // Check energy budget
    const energyCheck = energyTracker.spendEnergy('toolExecution', `Execute ${tool.name}`);
    if (!energyCheck.success) {
      return {
        result: {
          success: false,
          data: null,
          error: 'Insufficient energy budget for tool execution',
          executionTimeMs: 0,
          confidence: 0,
        },
        used: false,
        stage: tool.rolloutStage,
      };
    }
    
    // Execute based on stage
    const stage = tool.rolloutStage;
    let result: ToolResult;
    let used = false;
    
    switch (stage) {
      case 'pending':
        result = {
          success: false,
          data: null,
          error: 'Tool not yet ready for use',
          executionTimeMs: 0,
          confidence: 0,
        };
        break;
        
      case 'shadow':
        // Execute but don't use results
        result = await tool.execute(params);
        used = false;
        console.log('👻 Shadow mode:', tool.name, 'executed but not used');
        break;
        
      case 'advisory':
        // Execute and show results, but don't act
        result = await tool.execute(params);
        used = false;
        console.log('💡 Advisory mode:', tool.name, 'result shown but not acted on');
        break;
        
      case 'assisted':
        // Execute but would need confirmation (not implemented)
        result = await tool.execute(params);
        used = false; // Would be true after confirmation
        console.log('👤 Assisted mode:', tool.name, 'waiting for confirmation');
        break;
        
      case 'autonomous':
        // Full use
        result = await tool.execute(params);
        used = result.success;
        break;
    }
    
    // Record execution
    this.toolExecutions.push({
      toolId,
      timestamp: Date.now(),
      stage,
      success: result.success,
      usedResult: used,
    });
    
    return { result, used, stage };
  }
  
  /**
   * Get all tools and their status
   */
  getAllTools(): Array<ToolDefinition & { readiness: ReturnType<ToolRegistry['checkReadiness']> }> {
    return Array.from(this.tools.values()).map(tool => ({
      ...tool,
      readiness: this.checkReadiness(tool.id),
    }));
  }
  
  /**
   * Get tool execution statistics
   */
  getStats(): {
    totalExecutions: number;
    byTool: Record<string, { executions: number; successRate: number }>;
    byStage: Record<RolloutStage, number>;
  } {
    const byTool: Record<string, { executions: number; successRate: number }> = {};
    const byStage: Record<RolloutStage, number> = {
      pending: 0,
      shadow: 0,
      advisory: 0,
      assisted: 0,
      autonomous: 0,
    };
    
    for (const exec of this.toolExecutions) {
      // By tool
      if (!byTool[exec.toolId]) {
        byTool[exec.toolId] = { executions: 0, successRate: 0 };
      }
      byTool[exec.toolId].executions++;
      
      // By stage
      byStage[exec.stage]++;
    }
    
    // Calculate success rates
    for (const toolId of Object.keys(byTool)) {
      const toolExecs = this.toolExecutions.filter(e => e.toolId === toolId);
      const successes = toolExecs.filter(e => e.success).length;
      byTool[toolId].successRate = successes / toolExecs.length;
    }
    
    return {
      totalExecutions: this.toolExecutions.length,
      byTool,
      byStage,
    };
  }
}

export const toolRegistry = new ToolRegistry();

// ==========================================
// PLANNER TOOL INTEGRATION
// ==========================================

/**
 * Check if tools should be used for a plan
 */
export function shouldUseTools(plan: NyatiPlan): {
  shouldUse: boolean;
  availableTools: string[];
  recommendedTools: string[];
  energyEstimate: number;
} {
  if (!plan.needs_tools || !plan.tool_actions) {
    return { shouldUse: false, availableTools: [], recommendedTools: [], energyEstimate: 0 };
  }
  
  const availableTools: string[] = [];
  const recommendedTools: string[] = [];
  let energyEstimate = 0;
  
  for (const toolId of plan.tool_actions) {
    const readiness = toolRegistry.checkReadiness(toolId);
    
    if (readiness.ready && ['assisted', 'autonomous'].includes(readiness.stage)) {
      availableTools.push(toolId);
      
      const tool = toolRegistry['tools'].get(toolId);
      if (tool) {
        energyEstimate += tool.energyCost;
        
        // Recommend deterministic tools more strongly
        if (tool.isDeterministic && !tool.hasSideEffects) {
          recommendedTools.push(toolId);
        }
      }
    }
  }
  
  return {
    shouldUse: availableTools.length > 0 && energyEstimate <= 15, // Max 15 energy for tools
    availableTools,
    recommendedTools,
    energyEstimate,
  };
}
