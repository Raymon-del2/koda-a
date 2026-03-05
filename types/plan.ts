/**
 * Nyati Intelligence Controller - Planning Schema
 * 
 * This defines the structured output format for the planning layer.
 * The controller uses this to make deterministic decisions about:
 * - Intent classification
 * - Memory retrieval needs
 * - Tool usage requirements
 * - Memory storage decisions
 */

export type NyatiIntent = 
  | "question"      // User asking for information
  | "learn"         // User teaching something new
  | "task"          // User wants an action performed
  | "conversation"  // Casual chat, no special handling
  | "search";       // User wants to find something

export interface NyatiPlan {
  /** Classified user intent */
  intent: NyatiIntent;
  
  /** Whether we need to retrieve from semantic memory */
  needs_memory: boolean;
  
  /** Whether external tools are required */
  needs_tools: boolean;
  
  /** Whether this interaction should be stored long-term */
  store_memory: boolean;
  
  /** Optimized query for memory retrieval (if needs_memory is true) */
  memory_query?: string;
  
  /** List of tools to invoke (if needs_tools is true) */
  tool_actions?: string[];
  
  /** Confidence score 0.0-1.0 for this plan */
  confidence: number;
}

/**
 * Reflection data captured after response generation
 * Used for system improvement and training data
 */
export interface NyatiReflection {
  /** Estimate of response quality (0.0-1.0) */
  success_estimate: number;
  
  /** Whether memory was retrieved for this response */
  used_memory: boolean;
  
  /** Whether memory was stored for this interaction */
  stored_memory: boolean;
  
  /** Whether tools were invoked */
  used_tools: boolean;
  
  /** Timestamp for analytics */
  timestamp: number;
  
  /** Original user query (for context) */
  user_query?: string;
  
  /** Plan that was executed */
  executed_plan?: NyatiPlan;
}

/**
 * Memory evaluation result
 * Determines if an interaction should be stored
 */
export interface MemoryEvaluation {
  /** Whether this should be stored */
  should_store: boolean;
  
  /** Reason for the decision */
  reason: string;
  
  /** Suggested metadata for storage */
  suggested_metadata?: {
    category?: string;
    importance?: number;
    tags?: string[];
  };
}

/**
 * Protected knowledge metadata
 * Used for privacy and scope filtering
 */
export interface KnowledgeMetadata {
  /** Owner of this knowledge */
  owner_id: string;
  
  /** Privacy level */
  privacy: "private" | "shared" | "public";
  
  /** Project/scope tags for filtering */
  scope: string[];
  
  /** Type of knowledge */
  type: "knowledge" | "conversation" | "fact" | "preference";
  
  /** Timestamp */
  created_at: number;
  
  /** Whether this can be shared across contexts */
  shareable?: boolean;
}
