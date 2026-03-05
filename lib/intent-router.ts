/**
 * Intent Router - Classifies user queries to optimize tool selection
 * 
 * Routes queries to:
 * - DUCKDUCKGO: News, current events, YouTube, real-time facts
 * - QDRANT: Personal history, user's past conversations
 * - DIRECT: Greetings, math, logic, general knowledge
 */

export type QueryIntent = 'DUCKDUCKGO' | 'QDRANT' | 'DIRECT' | 'NEWS' | 'MOVIE';

export interface RouterResult {
  intent: QueryIntent;
  confidence: number;
  reasoning?: string;
  suggestedSearchQuery?: string;
  contentType?: 'news' | 'movie' | 'general';
}

// Patterns that indicate need for web search
const WEB_SEARCH_PATTERNS = [
  // Real-time data (non-news)
  /\b(weather|stock price|score|game result)\b/i,
  
  // Specific media lookups
  /\b(youtube video|video about|watch|listen to)\b/i,
  /\b(find me a|search for|look up)\b/i,
  
  // Comparison with current state
  /\b(vs|versus|compared to|better than|worse than)\b/i,
  
  // Specific factual queries that need verification
  /\b(is it true that|fact check|verify|is .* real|is .* fake)\b/i,
  
  // "Deep search" trigger words
  /\b(research|deep dive|comprehensive|thorough|detailed analysis)\b/i,
  /\b(sources|citations|references|evidence)\b/i,
];

// Patterns that indicate news query
const NEWS_PATTERNS = [
  /\b(news|latest|recent|breaking|headline)\b/i,
  /\b(what happened|what's happening|going on|current events)\b/i,
  /\b(today|this week|this month)\b.*\b(news|happened|happening)\b/i,
  /\b(stock market|stocks|shares|trading|market crash|market news)\b/i,
  /\b(politics|election|government|president|congress)\b.*\b(news|latest)\b/i,
  /\b(sports news|game news|match news)\b/i,
  /\b(tech news|technology news|ai news)\b/i,
  /\b(show me.*news|tell me.*news)\b/i,
];

// Patterns that indicate movie/TV query
const MOVIE_PATTERNS = [
  /\b(movie|film|cinema|showtime)\b/i,
  /\b(tv series|tv show|television|episode|season)\b/i,
  /\b(actor|actress|director|cast|starring)\b/i,
  /\b(imdb|rotten tomatoes|box office|rating)\b/i,
  /\b(trailer|poster|watch online)\b/i,
  /\b(netflix|hulu|disney\+|hbo|amazon prime)\b/i,
  /\b(what movie|which movie|find movie|search movie)\b/i,
  /\b(movie about|film about|movie with)\b/i,
  /\b(recommend.*movie|suggest.*movie|good movie)\b/i,
];

// Famous people/celebrity name patterns - route to TMDB for profiles
const CELEBRITY_PATTERNS = [
  // Common celebrity name patterns
  /^\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s*$/g, // First Last format (single name queries)
  /\b(who is|tell me about|information about|biography of)\s+[A-Z]/i,
  /\b(actor|actress|singer|celebrity|star|artist|musician|director)\b/i,
  /\b(age|born|birthday|height|net worth|spouse|partner|children)\b.*\b(actor|actress|singer|celebrity|star)\b/i,
  /\b(actor|actress|singer|celebrity|star)\b.*\b(age|born|birthday|height|net worth|spouse|partner)\b/i,
];

// Patterns that indicate personal/historical context
const MEMORY_PATTERNS = [
  // Self-reference
  /\b(my|I|me|mine|our|we)\b.*\b(said|told|mentioned|asked|discussed)\b/i,
  /\b(remember|recall|don't forget|as I mentioned)\b/i,
  
  // Past conversations
  /\b(we talked about|we discussed|you told me|I told you|last time|before)\b/i,
  /\b(previous conversation|earlier|yesterday|last week)\b/i,
  
  // Personal preferences and context
  /\b(my preference|I prefer|I like|I want|I need)\b/i,
  /\b(my project|my code|my work|my file)\b/i,
  
  // Contextual follow-ups
  /\b(that thing|the thing|it again|continue|carry on)\b/i,
];

// Patterns that can be handled directly
const DIRECT_PATTERNS = [
  // Greetings
  /^(hi|hello|hey|sup|yo|good morning|good evening|good night|greetings)$/i,
  /^(what'?s?\s*up|how are you|how's it going|how do you do)$/i,
  
  // Thanks and acknowledgments
  /^(thanks|thank you|thx|ty|cheers|appreciate it)$/i,
  
  // Simple math expressions
  /^[\d\s+\-*/().]+$/,
  /\b(calculate|compute|what is \d+\s*[\+\-\*\/]\s*\d+)\b/i,
  
  // Logic and reasoning
  /\b(true or false|yes or no|is this correct|am I right)\b/i,
  
  // General knowledge (not time-sensitive)
  /\b(what is|who is|define|explain|describe|tell me about)\b/i,
  /\b(how does|why does|how do|why do)\b/i,
  
  // Coding and technical (usually not time-sensitive)
  /\b(code|function|variable|loop|array|object|class|method)\b/i,
  /\b(debug|fix|error|bug|issue|problem)\b/i,
  /\b(how to|tutorial|guide|example)\b/i,
];

// Topics that are likely to have outdated training data
const TIME_SENSITIVE_TOPICS = [
  'iraq war', 'syria', 'ukraine', 'gaza', 'israel', 'palestine',
  'ai news', 'chatgpt', 'openai', 'anthropic', 'google ai',
  'cryptocurrency', 'bitcoin', 'ethereum', 'crypto',
  'election', 'president', 'congress', 'senate', 'politics',
  'covid', 'pandemic', 'vaccine', 'health guidelines',
];

/**
 * Fast intent classification without LLM
 * Uses pattern matching for speed and cost efficiency
 */
export function routeQuery(query: string, selectedTool?: string | null): RouterResult {
  const lowerQuery = query.toLowerCase().trim();
  
  // If user explicitly selected deep-search, force web search
  if (selectedTool === 'deep-search') {
    return {
      intent: 'DUCKDUCKGO',
      confidence: 0.95,
      reasoning: 'User explicitly selected deep search mode',
    };
  }
  
  // If user selected guided-learning, use hybrid approach
  if (selectedTool === 'guided-learning') {
    return {
      intent: 'DUCKDUCKGO',
      confidence: 0.85,
      reasoning: 'Guided learning needs educational resources',
    };
  }
  
  // Check for direct patterns first (fastest path)
  for (const pattern of DIRECT_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        intent: 'DIRECT',
        confidence: 0.9,
        reasoning: 'Query matches direct handling pattern',
      };
    }
  }
  
  // Check for news patterns
  for (const pattern of NEWS_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        intent: 'NEWS',
        confidence: 0.9,
        reasoning: 'Query is news-related, using NewsAPI',
        suggestedSearchQuery: extractSearchQuery(query),
        contentType: 'news',
      };
    }
  }
  
  // Check for celebrity/person patterns - route to TMDB for profiles
  for (const pattern of CELEBRITY_PATTERNS) {
    if (pattern.test(query) || pattern.test(lowerQuery)) {
      return {
        intent: 'MOVIE',
        confidence: 0.85,
        reasoning: 'Query is about a person/celebrity, using TMDB for profile',
        suggestedSearchQuery: extractSearchQuery(query),
        contentType: 'movie',
      };
    }
  }
  
  // Check for movie/TV patterns
  for (const pattern of MOVIE_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        intent: 'MOVIE',
        confidence: 0.9,
        reasoning: 'Query is movie/TV related, using TMDB',
        suggestedSearchQuery: extractSearchQuery(query),
        contentType: 'movie',
      };
    }
  }
  
  // Check for memory patterns
  for (const pattern of MEMORY_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        intent: 'QDRANT',
        confidence: 0.85,
        reasoning: 'Query references personal context or history',
      };
    }
  }
  
  // Check for time-sensitive topics
  for (const topic of TIME_SENSITIVE_TOPICS) {
    if (lowerQuery.includes(topic)) {
      return {
        intent: 'DUCKDUCKGO',
        confidence: 0.8,
        reasoning: `Query involves time-sensitive topic: ${topic}`,
        suggestedSearchQuery: query,
      };
    }
  }
  
  // Check for web search patterns
  for (const pattern of WEB_SEARCH_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        intent: 'DUCKDUCKGO',
        confidence: 0.85,
        reasoning: 'Query needs current/real-time information',
        suggestedSearchQuery: extractSearchQuery(query),
      };
    }
  }
  
  // Default: Use direct for short queries, web search for longer questions
  if (query.split(' ').length <= 3) {
    return {
      intent: 'DIRECT',
      confidence: 0.6,
      reasoning: 'Short query, defaulting to direct',
    };
  }
  
  // For longer queries with question words, lean towards web search
  if (/\b(who|what|where|when|why|how)\b/i.test(query)) {
    return {
      intent: 'DUCKDUCKGO',
      confidence: 0.7,
      reasoning: 'Question word detected, may need factual verification',
      suggestedSearchQuery: query,
    };
  }
  
  return {
    intent: 'DIRECT',
    confidence: 0.6,
    reasoning: 'Default routing for general query',
  };
}

/**
 * Extract a clean search query from user input
 */
function extractSearchQuery(query: string): string {
  // Remove filler words and clean up
  let cleaned = query
    .replace(/^(can you|could you|please|help me|I want to|I need to|find|search|look up)\s*/gi, '')
    .replace(/\?$/g, '')
    .trim();
  
  return cleaned || query;
}

/**
 * Determine if query needs context enrichment
 */
export function needsContextEnrichment(result: RouterResult): boolean {
  return result.intent === 'DUCKDUCKGO' || result.intent === 'QDRANT';
}

/**
 * Get appropriate context sources based on intent
 */
export function getContextSources(intent: QueryIntent): string[] {
  switch (intent) {
    case 'DUCKDUCKGO':
      return ['duckduckgo', 'youtube'];
    case 'QDRANT':
      return ['qdrant', 'memory'];
    case 'DIRECT':
      return [];
    default:
      return [];
  }
}
