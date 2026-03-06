/**
 * Nyati Intelligence Controller
 * 
 * This is the brain of the agentic system.
 * It makes deterministic decisions about how to handle user input
 * before any response generation happens.
 * 
 * Key principle: The controller outputs ONLY JSON, no prose.
 * It's an orchestration layer, not a conversation layer.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { NyatiPlan, NyatiReflection, MemoryEvaluation } from '@/types/plan';
import { generateControllerBias, getIntentBias } from './observability';

// Local Ollama provider for SLOW MODE (no token limits!)
const ollamaProvider = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

// Fast planning provider (Hugging Face) - for quick intent detection
const nyatiCore = createOpenAI({
  baseURL: 'https://ryan33121-nyati-core-api.hf.space/v1',
  apiKey: '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',
});

// ==========================================
// DUAL-LLM PATTERN: STRATEGIC REASONING
// ==========================================

const STRATEGIC_PROMPT = `You are Nyati Strategic Engine.

Your job: Analyze the user's request and create a structured reasoning plan.

DO NOT answer the user directly.
DO NOT write the final response.
DO NOT include pleasantries or explanations.

Your output is HIDDEN from the user.
It will be used by the Response Engine to generate the final answer.

OUTPUT FORMAT (Strict JSON):
{
  "problem_type": "question|code|analysis|creative|comparison|task",
  "complexity": "low|medium|high",
  "key_concepts": ["concept1", "concept2"],
  "reasoning_steps": [
    "Step 1: Identify what the user really wants",
    "Step 2: Determine required knowledge/expertise",
    "Step 3: Outline solution approach",
    "Step 4: Structure the response"
  ],
  "response_structure": {
    "format": "paragraph|list|code|mixed",
    "sections": ["intro", "main_points", "examples", "conclusion"]
  },
  "cautions": ["avoid X", "check Y"],
  "confidence": 0.0-1.0
}

Think deeply. Be thorough. The Response Engine depends on your analysis.`;

const EXECUTION_PROMPT = `You are Nyati Response Engine.

You receive a structured reasoning plan from the Strategic Engine.
Your job: Produce a clear, concise final response that follows the plan exactly.

RULES:
- NEVER mention the reasoning plan or that you received instructions
- NEVER say "Based on the analysis" or "As outlined"
- Just deliver the answer directly and professionally
- Follow the response structure from the plan
- Avoid the cautions listed in the plan
- Be confident and direct

The user should never know you used a two-step process.`;

/**
 * Generate strategic reasoning draft (Dual-LLM Step 1)
 * This hidden reasoning pass breaks down the problem and creates a plan
 */
export async function generateStrategicDraft(
  userMessage: string,
  memoryContext: string,
  plan: NyatiPlan
): Promise<{
  reasoning_steps: string[];
  response_structure: { format: string; sections: string[] };
  key_concepts: string[];
  cautions: string[];
  confidence: number;
} | null> {
  
  // Skip strategic reasoning for simple intents
  if (plan.intent === 'conversation' || plan.intent === 'search') {
    return null; // Simple queries don't need dual-pass
  }
  
  try {
    const result = await generateText({
      model: ollamaProvider.languageModel('llama3.2:3b'),
      system: STRATEGIC_PROMPT,
      messages: [
        {
          role: 'user',
          content: `User request: "${userMessage}"\n\nContext from memory:\n${memoryContext || 'None'}`,
        },
      ],
      temperature: 0.3, // Lower temp for consistent reasoning
    });
    
    // Parse the JSON response
    const cleanText = result.text.trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : cleanText;
    
    const draft = JSON.parse(jsonText);
    
    console.log('🎯 Strategic Draft:', {
      confidence: draft.confidence,
      steps_count: draft.reasoning_steps?.length,
      concepts: draft.key_concepts?.length,
    });
    
    return draft;
  } catch (error) {
    console.error('Strategic draft error:', error);
    return null; // Fallback to single-pass
  }
}

/**
 * Generate final response using strategic draft (Dual-LLM Step 2)
 */
export async function generateFinalResponse(
  userMessage: string,
  strategicDraft: { key_concepts: string[]; response_structure: { format: string; sections: string[] }; cautions: string[] },
  memoryContext: string,
  model: 'groq' | 'nyati'
): Promise<string> {
  
  const executionPrompt = `${EXECUTION_PROMPT}

STRATEGIC REASONING (Hidden):
- Key Concepts: ${strategicDraft.key_concepts.join(', ')}
- Response Structure: ${JSON.stringify(strategicDraft.response_structure)}
- Cautions: ${strategicDraft.cautions.join(', ')}

Follow this reasoning when crafting your response.`;
  
  try {
    const result = await generateText({
      model: ollamaProvider.languageModel('llama3.2:3b'),
      system: executionPrompt,
      messages: [
        {
          role: 'user',
          content: `Original user request: "${userMessage}"\n\nRelevant context:\n${memoryContext || 'None'}`,
        },
      ],
      temperature: 0.2, // Low temp for factual responses
    });
    
    return result.text;
  } catch (error) {
    console.error('Final response generation error:', error);
    throw error;
  }
}

// ==========================================
// SELF-CONSISTENCY SAMPLING (Lite)
// ==========================================

/**
 * Generate multiple strategic drafts and check consistency
 * If drafts disagree significantly, regenerate
 */
export async function generateConsistentStrategicDraft(
  userMessage: string,
  memoryContext: string,
  plan: NyatiPlan,
  samples: number = 2
): Promise<ReturnType<typeof generateStrategicDraft>> {
  
  if (samples < 2) {
    return generateStrategicDraft(userMessage, memoryContext, plan);
  }
  
  // Generate multiple drafts
  const drafts: Array<NonNullable<Awaited<ReturnType<typeof generateStrategicDraft>>>> = [];
  
  for (let i = 0; i < samples; i++) {
    const draft = await generateStrategicDraft(userMessage, memoryContext, plan);
    if (draft) drafts.push(draft);
  }
  
  if (drafts.length < 2) {
    return drafts[0] || null;
  }
  
  // Check consistency between drafts
  const draft1 = drafts[0];
  const draft2 = drafts[1];
  
  // Simple consistency check: confidence should be similar
  const consistent = Math.abs(draft1.confidence - draft2.confidence) < 0.3;
  
  if (!consistent) {
    console.log('⚠️ Strategic drafts inconsistent - using higher confidence draft');
    // Return the draft with higher confidence
    return draft1.confidence >= draft2.confidence ? draft1 : draft2;
  }
  
  // Merge best aspects from both drafts
  const merged = {
    ...draft1,
    reasoning_steps: [...new Set([...draft1.reasoning_steps, ...draft2.reasoning_steps])].slice(0, 6),
    key_concepts: [...new Set([...draft1.key_concepts, ...draft2.key_concepts])],
    cautions: [...new Set([...draft1.cautions, ...draft2.cautions])],
    confidence: Math.max(draft1.confidence, draft2.confidence),
  };
  
  return merged;
}
const CONTROLLER_PROMPT = `You are a JSON classifier. Output ONLY a JSON object. No text before or after.

Classify the user message into this EXACT format:
{"intent":"conversation","needs_memory":false,"needs_tools":false,"store_memory":false,"memory_query":null,"tool_actions":null,"confidence":0.9}

INTENT OPTIONS:
- "conversation": greetings, small talk, casual chat
- "question": asking for information/explanation
- "task": wants action performed (code, calculation)
- "learn": teaching/sharing info
- "search": explicitly searching for something

RULES:
- needs_memory=true only for technical questions or references to past conversations
- needs_tools=true only for calculations or explicit web search requests
- store_memory=true only if user shares preferences or new facts
- Greetings like "hi", "hey", "yo" are ALWAYS conversation intent with all flags false

EXAMPLES:
"hi" → {"intent":"conversation","needs_memory":false,"needs_tools":false,"store_memory":false,"memory_query":null,"tool_actions":null,"confidence":0.95}
"hey" → {"intent":"conversation","needs_memory":false,"needs_tools":false,"store_memory":false,"memory_query":null,"tool_actions":null,"confidence":0.95}
"what is React" → {"intent":"question","needs_memory":true,"needs_tools":false,"store_memory":false,"memory_query":"React framework","tool_actions":null,"confidence":0.85}
"I use Python" → {"intent":"learn","needs_memory":false,"needs_tools":false,"store_memory":true,"memory_query":null,"tool_actions":null,"confidence":0.9}

OUTPUT JSON NOW:`;

// Fast intent detection without LLM for common patterns
function fastIntentDetection(message: string): NyatiPlan | null {
  const lower = message.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hey|yo|hello|sup|howdy|hola|wassup|what'?s?\s*up|good\s*morning|good\s*evening)[!.]*$/i.test(lower)) {
    return {
      intent: 'conversation',
      needs_memory: false,
      needs_tools: false,
      store_memory: false,
      confidence: 0.95,
    };
  }
  
  // Thanks/goodbye
  if (/^(thanks|thank\s*you|thx|bye|goodbye|later|cya|see\s*ya)[!.]*$/i.test(lower)) {
    return {
      intent: 'conversation',
      needs_memory: false,
      needs_tools: false,
      store_memory: false,
      confidence: 0.95,
    };
  }
  
  // Short casual messages
  if (lower.length < 5 && /^[a-z]+$/i.test(lower)) {
    return {
      intent: 'conversation',
      needs_memory: false,
      needs_tools: false,
      store_memory: false,
      confidence: 0.9,
    };
  }
  
  // Identity questions - no memory needed, system prompt has the answer
  if (/^(who\s+(is|are)\s+(koda|you)|what\s+(is|are)\s+(koda|you))/i.test(lower)) {
    return {
      intent: 'question',
      needs_memory: false, // Don't need memory - identity is in system prompt
      needs_tools: false,
      store_memory: false,
      confidence: 0.95,
    };
  }
  
  return null;
}

/**
 * Create a plan for handling user input
 * This is the core intelligence layer - now with cognitive identity bias injection
 */
export async function createPlan(userMessage: string): Promise<NyatiPlan> {
  // FAST PATH: Check for common patterns first (no LLM needed)
  const fastPlan = fastIntentDetection(userMessage);
  if (fastPlan) {
    console.log('⚡ Fast path intent detection:', fastPlan.intent);
    return fastPlan;
  }
  
  try {
    const result = await generateText({
      model: nyatiCore.languageModel('llama3.2:1b'),
      system: CONTROLLER_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.1,
    });

    // Parse the JSON response
    const cleanText = result.text.trim();
    
    // Handle potential markdown code blocks
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : cleanText;
    
    const plan = JSON.parse(jsonText) as NyatiPlan;
    
    // Validate the plan has required fields
    if (!plan.intent || typeof plan.needs_memory !== 'boolean') {
      throw new Error('Invalid plan structure');
    }
    
    console.log('🧠 Intelligence Controller Plan:', {
      intent: plan.intent,
      needs_memory: plan.needs_memory,
      needs_tools: plan.needs_tools,
      store_memory: plan.store_memory,
      confidence: plan.confidence,
    });
    
    return plan;
  } catch (error) {
    console.error('Controller planning error:', error);
    
    // Fallback: conservative plan that won't break the system
    return {
      intent: 'conversation',
      needs_memory: false,
      needs_tools: false,
      store_memory: false,
      confidence: 0.5,
    };
  }
}

/**
 * Memory Evaluator - Decide if interaction should be stored
 * 
 * Uses heuristics first, can upgrade to LLM-based evaluation later
 */
export function evaluateMemoryStorage(
  userMessage: string,
  responseText: string,
  plan: NyatiPlan
): MemoryEvaluation {
  // Heuristic evaluation (fast, deterministic)
  
  const messageLength = userMessage.length;
  const responseLength = responseText.length;
  
  // Small talk detection
  const smallTalkPatterns = [
    /^hi$/i,
    /^hello$/i,
    /^hey$/i,
    /^thanks$/i,
    /^ok$/i,
    /^bye$/i,
    /^goodbye$/i,
    /^lol$/i,
    /^haha$/i,
  ];
  
  const isSmallTalk = smallTalkPatterns.some(pattern => 
    pattern.test(userMessage.trim())
  );
  
  // Check for learning signals
  const learningSignals = [
    /i (?:use|work with|prefer|like|love|hate)/i,
    /my (?:project|team|company|work|stack)/i,
    /we (?:use|built|created|developed)/i,
    /(?:remember|note|save) (?:that|this)/i,
  ];
  
  const containsPersonalInfo = learningSignals.some(pattern =>
    pattern.test(userMessage)
  );
  
  // Check for educational content in response
  const educationalIndicators = [
    /here (?:is|are) (?:how|why|what)/i,
    /for example/i,
    /step \d+/i,
    /first.*then/i,
  ];
  
  const isEducational = educationalIndicators.some(pattern =>
    pattern.test(responseText)
  );
  
  // Decision logic
  let shouldStore = false;
  let reason = '';
  
  if (plan.store_memory) {
    shouldStore = true;
    reason = 'Controller explicitly marked for storage';
  } else if (isSmallTalk) {
    shouldStore = false;
    reason = 'Small talk, not valuable for long-term memory';
  } else if (messageLength < 20 && responseLength < 100) {
    shouldStore = false;
    reason = 'Too brief to contain useful knowledge';
  } else if (containsPersonalInfo) {
    shouldStore = true;
    reason = 'Contains personal preferences or work information';
  } else if (isEducational && responseLength > 300) {
    shouldStore = true;
    reason = 'Educational content with substantial explanation';
  } else if (plan.intent === 'learn') {
    shouldStore = true;
    reason = 'Learning intent detected';
  } else {
    shouldStore = false;
    reason = 'Does not meet storage criteria';
  }
  
  // Determine metadata
  const metadata = shouldStore ? {
    category: plan.intent === 'learn' ? 'user_preferences' : 'general_knowledge',
    importance: plan.confidence,
    tags: [plan.intent, containsPersonalInfo ? 'personal' : 'general'],
  } : undefined;
  
  return {
    should_store: shouldStore,
    reason,
    suggested_metadata: metadata,
  };
}

/**
 * Create reflection data after response generation
 */
export function createReflection(
  plan: NyatiPlan,
  actualResponse: string,
  successEstimate: number
): NyatiReflection {
  return {
    success_estimate: successEstimate,
    used_memory: plan.needs_memory,
    stored_memory: plan.store_memory,
    used_tools: plan.needs_tools,
    timestamp: Date.now(),
    user_query: undefined, // Set by caller if needed
    executed_plan: plan,
  };
}

/**
 * Tool Router - Placeholder for tool execution
 * Will be implemented in Phase 3
 */
export async function toolRouter(actions: string[]): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  
  for (const action of actions) {
    switch (action) {
      case 'calculator':
        // Will implement actual calculator
        results[action] = { status: 'not_implemented' };
        break;
      case 'web_search':
        // Will integrate with existing search
        results[action] = { status: 'not_implemented' };
        break;
      case 'code_executor':
        // Will implement safe code execution
        results[action] = { status: 'not_implemented' };
        break;
      case 'file_reader':
        // Will implement file reading
        results[action] = { status: 'not_implemented' };
        break;
      default:
        results[action] = { status: 'unknown_action' };
    }
  }
  
  return results;
}
