/**
 * Capability Registry & Self-Aware Feature Reporting
 * 
 * Enables Nyati to know its own limits and communicate them transparently.
 * Integrates with governance, tool framework, and safe mode to provide
 * accurate, real-time capability status.
 */

import { toolRegistry, shouldUseTools } from './tool-framework';
import { getSafeModeStatus, isActionAllowed, HARD_GUARDRAILS } from './production-governance';
import { getObservabilityData, getCognitiveIdentity } from './observability';
import { energyTracker } from './cognitive-energy';
import { goalManager } from './goal-hierarchy';
import { explorationState } from './exploration-engine';
import type { NyatiPlan } from '@/types/plan';

// ==========================================
// CAPABILITY DEFINITIONS
// ==========================================

export interface CapabilityStatus {
  id: string;
  name: string;
  description: string;
  category: 'reasoning' | 'memory' | 'tool' | 'exploration' | 'identity';
  
  // Current state
  available: boolean;
  restricted: boolean;
  
  // Why unavailable/restricted
  restrictions: string[];
  
  // Energy cost if available
  energyCost?: number;
  
  // User-facing explanation
  userExplanation: string;
  
  // Admin-facing technical details
  technicalDetails: string;
}

export interface SystemCapabilities {
  // Overall system state
  systemMode: 'normal' | 'safe' | 'critical';
  healthScore: number;
  
  // Capability categories
  reasoning: CapabilityStatus[];
  memory: CapabilityStatus[];
  tools: CapabilityStatus[];
  exploration: CapabilityStatus[];
  identity: CapabilityStatus[];
  
  // Composite status
  fullyOperational: boolean;
  degradedCapabilities: string[];
  unavailableCapabilities: string[];
}

// ==========================================
// CAPABILITY CHECK FUNCTIONS
// ==========================================

/**
 * Check all system capabilities
 */
export function checkSystemCapabilities(plan?: NyatiPlan): SystemCapabilities {
  const safeMode = getSafeModeStatus();
  const obs = getObservabilityData();
  const identity = getCognitiveIdentity();
  const energyRemaining = energyTracker.getRemaining();
  
  // REASONING CAPABILITIES
  const reasoningCapabilities: CapabilityStatus[] = [
    {
      id: 'single_pass_reasoning',
      name: 'Single-Pass Response',
      description: 'Standard response generation without self-consistency',
      category: 'reasoning',
      available: true,
      restricted: safeMode.mode !== 'normal',
      restrictions: safeMode.mode !== 'normal' ? ['System in safe mode'] : [],
      energyCost: 3,
      userExplanation: safeMode.mode !== 'normal' 
        ? 'Responses may be more concise while system is in safe mode'
        : 'Standard response generation available',
      technicalDetails: `Safe mode: ${safeMode.mode}, Energy available: ${energyRemaining}`,
    },
    {
      id: 'dual_reasoning',
      name: 'Dual-Pass Reasoning (Strategic + Execution)',
      description: 'Two-stage reasoning with planning and execution phases',
      category: 'reasoning',
      available: safeMode.mode !== 'critical' && energyRemaining >= 5,
      restricted: safeMode.mode === 'safe',
      restrictions: safeMode.mode === 'safe' ? ['Deep reasoning limited in safe mode'] : 
                   energyRemaining < 5 ? ['Insufficient energy budget'] : [],
      energyCost: 5,
      userExplanation: safeMode.mode === 'safe'
        ? 'Detailed reasoning temporarily limited to ensure stability'
        : energyRemaining < 5
          ? 'Currently using simplified responses due to system load'
          : 'Full reasoning capabilities available',
      technicalDetails: `Safe mode: ${safeMode.mode}, Energy remaining: ${energyRemaining}`,
    },
    {
      id: 'self_consistency',
      name: 'Self-Consistency Verification',
      description: 'Multiple sampling to verify response accuracy',
      category: 'reasoning',
      available: isActionAllowed('deepReasoning') && energyRemaining >= 8,
      restricted: safeMode.restrictions.reasoningDepthLimited !== null,
      restrictions: !isActionAllowed('deepReasoning') ? ['Deep reasoning restricted'] : 
                   energyRemaining < 8 ? ['Insufficient energy for verification'] : [],
      energyCost: 8,
      userExplanation: !isActionAllowed('deepReasoning')
        ? 'High-confidence verification temporarily disabled for stability'
        : energyRemaining < 8
          ? 'Verification limited due to current system load'
          : 'Accuracy verification available for complex queries',
      technicalDetails: `Depth limited: ${safeMode.restrictions.reasoningDepthLimited}, Energy: ${energyRemaining}`,
    },
  ];
  
  // MEMORY CAPABILITIES
  const memoryCapabilities: CapabilityStatus[] = [
    {
      id: 'memory_retrieval',
      name: 'Long-Term Memory Retrieval',
      description: 'Access to stored facts and conversation history',
      category: 'memory',
      available: true,
      restricted: safeMode.restrictions.cacheOnlyPreferred,
      restrictions: safeMode.restrictions.cacheOnlyPreferred ? ['Preferring cache in safe mode'] : [],
      energyCost: 2,
      userExplanation: 'Previous conversation context available',
      technicalDetails: `Cache preferred: ${safeMode.restrictions.cacheOnlyPreferred}`,
    },
    {
      id: 'memory_storage',
      name: 'Memory Storage (Learning)',
      description: 'Store new facts and patterns for future use',
      category: 'memory',
      available: true,
      restricted: false,
      restrictions: [],
      energyCost: 1,
      userExplanation: 'Learning from our conversation is active',
      technicalDetails: 'Memory storage operational',
    },
    {
      id: 'cognitive_cache',
      name: 'Semantic Response Cache',
      description: 'Reuse of similar previous responses',
      category: 'memory',
      available: true,
      restricted: false,
      restrictions: [],
      energyCost: 1,
      userExplanation: 'Drawing on previous similar conversations',
      technicalDetails: 'Cache active',
    },
  ];
  
  // TOOL CAPABILITIES
  const toolCapabilities: CapabilityStatus[] = [
    {
      id: 'calculator',
      name: 'Calculator',
      description: 'Perform mathematical calculations',
      category: 'tool',
      available: true,
      restricted: false,
      restrictions: [],
      energyCost: 4,
      userExplanation: 'Math calculations available',
      technicalDetails: 'Calculator tool: autonomous',
    },
    {
      id: 'web_search',
      name: 'Web Search',
      description: 'Search the internet for current information',
      category: 'tool',
      available: checkToolAvailability('web_search'),
      restricted: true,
      restrictions: getToolRestrictions('web_search'),
      energyCost: 6,
      userExplanation: checkToolAvailability('web_search')
        ? 'Web search available for current information'
        : 'Web search currently disabled for system stability',
      technicalDetails: getToolTechnicalDetails('web_search'),
    },
    {
      id: 'code_execution',
      name: 'Code Execution (Sandboxed)',
      description: 'Execute code in isolated environment',
      category: 'tool',
      available: checkToolAvailability('code_executor'),
      restricted: true,
      restrictions: getToolRestrictions('code_executor'),
      energyCost: 8,
      userExplanation: checkToolAvailability('code_executor')
        ? 'Code execution available in sandboxed environment'
        : 'Code execution temporarily disabled - requires readiness gate clearance',
      technicalDetails: getToolTechnicalDetails('code_executor'),
    },
    {
      id: 'file_operations',
      name: 'File Operations',
      description: 'Read and write files (destructive)',
      category: 'tool',
      available: false,
      restricted: true,
      restrictions: ['Readiness gates not passed', 'Human oversight required'],
      energyCost: 10,
      userExplanation: 'File operations are not yet available - still in validation',
      technicalDetails: 'File ops: pending readiness gates',
    },
  ];
  
  // EXPLORATION CAPABILITIES
  const explorationCapabilities: CapabilityStatus[] = [
    {
      id: 'exploration',
      name: 'Adaptive Exploration',
      description: 'Try new reasoning patterns to improve performance',
      category: 'exploration',
      available: isActionAllowed('exploration'),
      restricted: !isActionAllowed('exploration'),
      restrictions: !isActionAllowed('exploration') ? ['Exploration disabled in safe mode'] : [],
      energyCost: 6,
      userExplanation: isActionAllowed('exploration')
        ? 'Learning new approaches to serve you better'
        : 'Using proven methods for maximum stability',
      technicalDetails: `Exploration rate: ${explorationState.explorationRate.toFixed(2)}, Allowed: ${isActionAllowed('exploration')}`,
    },
  ];
  
  // IDENTITY CAPABILITIES
  const identityCapabilities: CapabilityStatus[] = [
    {
      id: 'identity_update',
      name: 'Self-Identity Evolution',
      description: 'Weekly updates to cognitive identity based on performance',
      category: 'identity',
      available: isActionAllowed('identityUpdate'),
      restricted: !isActionAllowed('identityUpdate'),
      restrictions: !isActionAllowed('identityUpdate') ? ['Identity updates paused in safe mode'] : [],
      userExplanation: isActionAllowed('identityUpdate')
        ? 'Continuously improving self-awareness'
        : 'Identity evolution paused for stability maintenance',
      technicalDetails: `Identity updates allowed: ${isActionAllowed('identityUpdate')}, Current phase: ${identity.learningPhase}`,
    },
    {
      id: 'goal_pursuit',
      name: 'Active Goal Pursuit',
      description: 'Working toward strategic and operational goals',
      category: 'identity',
      available: true,
      restricted: false,
      restrictions: [],
      energyCost: 0,
      userExplanation: `Currently focused on: ${goalManager.getActiveGoals().slice(0, 2).map(g => g.name).join(', ')}`,
      technicalDetails: `Active goals: ${goalManager.getActiveGoals().length}`,
    },
  ];
  
  // Compile unavailable/degraded lists
  const allCapabilities = [
    ...reasoningCapabilities,
    ...memoryCapabilities,
    ...toolCapabilities,
    ...explorationCapabilities,
    ...identityCapabilities,
  ];
  
  const unavailableCapabilities = allCapabilities
    .filter(c => !c.available)
    .map(c => c.name);
    
  const degradedCapabilities = allCapabilities
    .filter(c => c.available && c.restricted)
    .map(c => c.name);
  
  return {
    systemMode: safeMode.mode,
    healthScore: obs.healthScore,
    reasoning: reasoningCapabilities,
    memory: memoryCapabilities,
    tools: toolCapabilities,
    exploration: explorationCapabilities,
    identity: identityCapabilities,
    fullyOperational: unavailableCapabilities.length === 0 && degradedCapabilities.length === 0,
    degradedCapabilities,
    unavailableCapabilities,
  };
}

// ==========================================
// TOOL AVAILABILITY HELPERS
// ==========================================

function checkToolAvailability(toolId: string): boolean {
  if (!isActionAllowed('toolExecution')) {
    return false;
  }
  
  const readiness = toolRegistry.checkReadiness(toolId);
  return readiness.ready && ['assisted', 'autonomous'].includes(readiness.stage);
}

function getToolRestrictions(toolId: string): string[] {
  const restrictions: string[] = [];
  
  if (!isActionAllowed('toolExecution')) {
    restrictions.push('Tool execution blocked in safe mode');
    return restrictions;
  }
  
  const readiness = toolRegistry.checkReadiness(toolId);
  
  if (!readiness.ready) {
    if (readiness.stage === 'pending') {
      restrictions.push('Tool pending readiness gate clearance');
      
      // Add specific gate failures
      readiness.gateResults
        .filter(g => !g.passed)
        .forEach(g => restrictions.push(`${g.name}: ${(g.score * 100).toFixed(0)}% (need ${(toolRegistry['tools'].get(toolId)?.readinessGates.find(rg => rg.name === g.name)?.minScore || 0) * 100}%)`));
    } else if (readiness.stage === 'shadow' || readiness.stage === 'advisory') {
      restrictions.push(`Tool in ${readiness.stage} mode - not yet autonomous`);
    }
  }
  
  return restrictions;
}

function getToolTechnicalDetails(toolId: string): string {
  const readiness = toolRegistry.checkReadiness(toolId);
  const tool = toolRegistry['tools'].get(toolId);
  
  if (!tool) return 'Tool not registered';
  
  return `Stage: ${tool.rolloutStage}, Ready: ${readiness.ready}, Gates: ${readiness.gateResults.length}`;
}

// ==========================================
// USER-FACING SELF-REPORTING
// ==========================================

/**
 * Generate a user-friendly capability report
 * Call this when user asks "What can you do?" or similar
 */
export function generateCapabilityReport(): string {
  const capabilities = checkSystemCapabilities();
  
  const lines: string[] = [];
  
  // Header
  if (capabilities.systemMode === 'normal') {
    lines.push('✅ System fully operational');
  } else if (capabilities.systemMode === 'safe') {
    lines.push('⚠️ System in safe mode - some features limited for stability');
  } else {
    lines.push('🚨 System in critical mode - minimal features available');
  }
  
  lines.push(`Health Score: ${capabilities.healthScore}/100`);
  lines.push('');
  
  // Available capabilities
  lines.push('📋 Current Capabilities:');
  lines.push('');
  
  // Reasoning
  const availableReasoning = capabilities.reasoning.filter(c => c.available);
  if (availableReasoning.length > 0) {
    lines.push('🧠 Reasoning:');
    availableReasoning.forEach(c => {
      const indicator = c.restricted ? '⚡' : '✓';
      lines.push(`  ${indicator} ${c.name}`);
    });
    lines.push('');
  }
  
  // Memory
  const availableMemory = capabilities.memory.filter(c => c.available);
  if (availableMemory.length > 0) {
    lines.push('💾 Memory & Learning:');
    availableMemory.forEach(c => {
      lines.push(`  ✓ ${c.name}`);
    });
    lines.push('');
  }
  
  // Tools
  const availableTools = capabilities.tools.filter(c => c.available);
  if (availableTools.length > 0) {
    lines.push('🔧 Tools:');
    availableTools.forEach(c => {
      const indicator = c.restricted ? '⚡' : '✓';
      lines.push(`  ${indicator} ${c.name}`);
    });
    lines.push('');
  }
  
  // Limitations
  if (capabilities.unavailableCapabilities.length > 0 || capabilities.degradedCapabilities.length > 0) {
    lines.push('⚡ Current Limitations:');
    
    if (capabilities.degradedCapabilities.length > 0) {
      capabilities.degradedCapabilities.forEach(name => {
        lines.push(`  • ${name} - temporarily limited`);
      });
    }
    
    if (capabilities.unavailableCapabilities.length > 0) {
      capabilities.unavailableCapabilities.forEach(name => {
        lines.push(`  • ${name} - not available`);
      });
    }
    
    lines.push('');
  }
  
  // Goals
  const activeGoals = goalManager.getActiveGoals().slice(0, 3);
  if (activeGoals.length > 0) {
    lines.push('🎯 Current Focus:');
    activeGoals.forEach(g => {
      lines.push(`  • ${g.name}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Check if a specific user request can be fulfilled
 * Returns user-facing explanation
 */
export function checkRequestFeasibility(
  requestType: 'code_execution' | 'web_search' | 'file_ops' | 'deep_analysis' | 'calculation'
): {
  feasible: boolean;
  userMessage: string;
  technicalReason: string;
} {
  const capabilities = checkSystemCapabilities();
  
  switch (requestType) {
    case 'code_execution':
      const codeCap = capabilities.tools.find(c => c.id === 'code_execution');
      return {
        feasible: !!(codeCap?.available),
        userMessage: codeCap?.userExplanation || 'Code execution not available',
        technicalReason: codeCap?.technicalDetails || 'Tool not found',
      };
      
    case 'web_search':
      const searchCap = capabilities.tools.find(c => c.id === 'web_search');
      return {
        feasible: !!(searchCap?.available),
        userMessage: searchCap?.userExplanation || 'Web search not available',
        technicalReason: searchCap?.technicalDetails || 'Tool not found',
      };
      
    case 'file_ops':
      return {
        feasible: false,
        userMessage: 'File operations are not yet available - still undergoing safety validation',
        technicalReason: 'File ops readiness gates not passed, human oversight not implemented',
      };
      
    case 'deep_analysis':
      const dualCap = capabilities.reasoning.find(c => c.id === 'dual_reasoning');
      const selfCap = capabilities.reasoning.find(c => c.id === 'self_consistency');
      const deepAvailable = (dualCap?.available ?? false) && (selfCap?.available ?? false);
      return {
        feasible: deepAvailable,
        userMessage: deepAvailable
          ? 'Full analytical capabilities available'
          : 'Currently using streamlined analysis for optimal response time',
        technicalReason: `Dual: ${dualCap?.available}, Self-consistency: ${selfCap?.available}`,
      };
      
    case 'calculation':
      return {
        feasible: true,
        userMessage: 'Calculator available for mathematical operations',
        technicalReason: 'Calculator: autonomous',
      };
  }
}

/**
 * Generate a self-aware response when user requests unavailable feature
 */
export function generateLimitationResponse(
  requestedFeature: string,
  alternatives?: string[]
): string {
  const feasibility = checkRequestFeasibility(requestedFeature as any);
  
  if (feasibility.feasible) {
    return `I can help with that. ${feasibility.userMessage}`;
  }
  
  const lines: string[] = [
    `I'm currently unable to ${requestedFeature.replace('_', ' ')}.`,
    '',
    `Reason: ${feasibility.userMessage}`,
  ];
  
  if (alternatives && alternatives.length > 0) {
    lines.push('');
    lines.push('However, I can offer these alternatives:');
    alternatives.forEach(alt => {
      lines.push(`  • ${alt}`);
    });
  }
  
  lines.push('');
  lines.push(`System Health: ${getObservabilityData().healthScore}/100`);
  
  return lines.join('\n');
}

// ==========================================
// CHAT INTEGRATION
// ==========================================

/**
 * Auto-detect capability queries in user messages
 */
export function detectCapabilityQuery(message: string): boolean {
  const capabilityPatterns = [
    /what can you do/i,
    /what are your capabilities/i,
    /what features do you have/i,
    /what tools?.*(available|use)/i,
    /can you (execute|run|search|calculate)/i,
    /are you able to/i,
    /limitations/i,
    /what (can't|cannot) you do/i,
  ];
  
  return capabilityPatterns.some(p => p.test(message));
}

/**
 * Handle capability-related user messages
 */
export function handleCapabilityMessage(message: string): {
  isCapabilityQuery: boolean;
  response: string | null;
} {
  if (!detectCapabilityQuery(message)) {
    return { isCapabilityQuery: false, response: null };
  }
  
  // Check for specific feature requests
  const specificChecks: Record<string, string> = {
    'execute code': 'code_execution',
    'run code': 'code_execution',
    'search the web': 'web_search',
    'internet search': 'web_search',
    'file operations': 'file_ops',
    'read files': 'file_ops',
    'write files': 'file_ops',
  };
  
  for (const [phrase, feature] of Object.entries(specificChecks)) {
    if (message.toLowerCase().includes(phrase)) {
      const feasibility = checkRequestFeasibility(feature as any);
      return {
        isCapabilityQuery: true,
        response: feasibility.feasible
          ? `Yes, I can ${phrase}. ${feasibility.userMessage}`
          : generateLimitationResponse(feature, ['Provide analysis and recommendations', 'Guide you through manual steps']),
      };
    }
  }
  
  // General capability report
  return {
    isCapabilityQuery: true,
    response: generateCapabilityReport(),
  };
}
