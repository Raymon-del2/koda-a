"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Brain, Link2, Square, Loader2, Settings2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.min.css";
import { NewsCardGrid } from "./NewsCard";
import { MovieCardGrid } from "./MovieCard";
import { PersonCard, PersonCardGrid } from "./PersonCard";
import { SourcePills, SourceCountBadge } from "./SourcePills";

interface Source {
  id: number;
  title: string;
  url: string;
  snippet?: string;
  type?: 'qdrant' | 'google' | 'video' | 'website' | 'article' | 'news' | 'movie' | 'person';
  image?: string | null;
  source?: string;
  date?: string;
  rating?: number;
  favicon?: string;
}

interface LiveResource {
  title: string;
  url: string;
  source: string;
  confidence: number;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  source: { id: string | null; name: string };
  author: string | null;
  publishedAt: string;
}

interface MovieResult {
  id: number;
  title: string;
  year: string;
  overview: string;
  rating: number;
  poster: string | null;
  backdrop: string | null;
  type: 'movie' | 'tv';
}

interface PersonResult {
  id: number;
  title: string; // name
  overview?: string;
  poster?: string | null; // profile image
  type: string;
  rating?: number;
  known_for?: { title: string; type: string }[];
}

interface StreamingMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isComplete?: boolean;
  sources?: Source[];
  liveResources?: LiveResource[];
  modelType?: string;
  onStopGeneration?: () => void;
  onSourceClick?: (sourceId: number) => void;
  onShowSources?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  isSearching?: boolean;
  searchQuery?: string;
  newsArticles?: NewsArticle[];
  movieResults?: MovieResult[];
  personResults?: PersonResult[];
}

// Search loading skeleton - shows when AI is searching the web
function SearchLoadingSkeleton({ query }: { query?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 px-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]"
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="text-sm text-gray-400">
          {query ? `Searching for "${query.slice(0, 30)}${query.length > 30 ? '...' : ''}"` : 'Searching the web...'}
        </span>
      </div>
      <div className="flex gap-1 ml-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500/50 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Typing indicator with shimmer effect
function TypingIndicator() {
  return (
    <div className="flex flex-col gap-2 py-2">
      {/* Shimmer text lines */}
      <div className="space-y-2">
        <div className="shimmer h-4 w-[85%] rounded" />
        <div className="shimmer h-4 w-[70%] rounded" />
        <div className="shimmer h-4 w-[45%] rounded" />
      </div>
      <style jsx>{`
        .shimmer {
          background: linear-gradient(90deg, #1e1e1e 25%, #2d2d2d 50%, #1e1e1e 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// Glow effect around AI icon during thinking
function ThinkingGlow() {
  return (
    <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-md animate-pulse" />
  );
}

// Code block component with copy functionality
function CodeBlock({ children, className, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const language = className?.replace("language-", "") || "text";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl bg-[#1e1e2e] overflow-hidden border border-[#2a2a3a]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252535] border-b border-[#2a2a3a]">
        <span className="text-xs text-gray-400 lowercase">{language}</span>
        <button
          onClick={handleCopy}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            copied ? "text-green-400" : "text-gray-400 hover:text-white"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className={`${className} text-sm font-mono`} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Inline code component
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-[#2d2d2e] rounded text-sm font-mono text-teal-400">
      {children}
    </code>
  );
}

// Citation component
function Citation({
  source,
  onClick,
}: {
  source: Source;
  onClick?: (id: number) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick?.(source.id)}
        className="inline-flex items-center justify-center w-5 h-5 ml-1 text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full hover:bg-teal-600 hover:text-white transition-all transform hover:-translate-y-0.5 shadow-sm cursor-pointer"
      >
        {source.id}
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#1e1f20] border border-[#3c4043] rounded-lg shadow-xl z-[60] pointer-events-none"
          >
            <p className="text-xs leading-tight font-medium text-white line-clamp-2">
              {source.title}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 truncate">{source.url}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] border-8 border-transparent border-t-[#1e1f20]" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// Parse citations in text (supports both [1] and [^1] format)
function parseCitations(
  text: string,
  sources: Source[],
  onSourceClick?: (id: number) => void
): React.ReactNode[] {
  const parts = text.split(/(\[\^?\d+\])/g);
  return parts.map((part, index) => {
    const match = part.match(/\[\^?(\d+)\]/);
    if (match && onSourceClick) {
      const sourceId = parseInt(match[1]);
      const source = sources.find((s) => s.id === sourceId);
      if (source) {
        return <Citation key={index} source={source} onClick={onSourceClick} />;
      }
    }
    return <span key={index}>{part}</span>;
  });
}

// Parse suggestions from text (lines starting with →)
function parseSuggestions(text: string): string[] {
  const lines = text.split('\n');
  const suggestions: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('→ ') || trimmed.startsWith('-> ')) {
      suggestions.push(trimmed.replace(/^[→\-]+\s*/, ''));
    }
  }
  
  return suggestions;
}

// Remove suggestions from main text
function removeSuggestions(text: string): string {
  return text.split('\n')
    .filter(line => !line.trim().startsWith('→ ') && !line.trim().startsWith('-> '))
    .join('\n')
    .trim();
}

// Get favicon URL for a domain
function getFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

// Clean YouTube URL for embedding
function cleanYouTubeUrl(url: string): string | null {
  const regex = /(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/;
  const match = url.match(regex);
  if (match) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  return null;
}

// Suggestion chip component
function SuggestionChip({ 
  suggestion, 
  onClick 
}: { 
  suggestion: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-full text-sm text-gray-300 hover:text-white transition-all whitespace-nowrap"
    >
      {suggestion}
    </button>
  );
}

// Thinking box component - Gemini-style with Action Sentences
function ThinkingBox({ thought }: { thought: string }) {
  const isJson = thought.trim().startsWith('{');
  
  // Format JSON if it's a plan
  let formattedThought = thought;
  if (isJson) {
    try {
      formattedThought = JSON.stringify(JSON.parse(thought), null, 2);
    } catch {
      formattedThought = thought;
    }
  }
  
  // Split by newlines to create "Action Sentences" list
  const steps = thought
    .split('\n')
    .filter(line => line.trim().length > 0);
  
  return (
    <details className="group mb-4 w-full max-w-2xl">
      <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
        {/* The Gemini Sparkle Icon */}
        <div className="p-1.5 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 text-blue-400">
          <Sparkles size={14} className="animate-pulse" />
        </div>
        
        <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors">
          {isJson ? "View Execution Plan" : "Koda-A's Mental Model"}
        </span>

        <svg 
          className="w-3 h-3 text-gray-500 transition-transform group-open:rotate-180 ml-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      {/* The Content Area */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 ml-4 pl-4 border-l-2 border-white/5 space-y-3"
      >
        {isJson ? (
          <pre className="text-[10px] text-green-400/80 font-mono overflow-x-auto">
            <code>{formattedThought}</code>
          </pre>
        ) : (
          steps.map((step, index) => {
            // Check if the line has a colon to bold the header like Gemini does
            const [header, ...rest] = step.split(':');
            
            return (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-[13px] leading-relaxed"
              >
                {rest.length > 0 ? (
                  <>
                    <span className="text-gray-200 font-semibold">{header}</span>
                    <span className="text-gray-500">: {rest.join(':')}</span>
                  </>
                ) : (
                  <span className="text-gray-400">{step}</span>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </details>
  );
}

// Live resource card
function LiveResourceCard({ resource }: { resource: LiveResource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg bg-[#1e1f20] border border-[#2a2a3a] hover:border-blue-500/50 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <Sparkles size={16} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate group-hover:text-blue-400 transition-colors">
          {resource.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{resource.source}</p>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              resource.confidence > 0.8
                ? "bg-green-500/20 text-green-400"
                : resource.confidence > 0.5
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {Math.round(resource.confidence * 100)}%
          </span>
        </div>
      </div>
    </a>
  );
}

// Agent avatar component
function AgentAvatar({ modelType }: { modelType?: string }) {
  if (modelType === "pro") {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
        K
      </div>
    );
  } else if (modelType === "medium") {
    return (
      <div className="flex items-center gap-0.5">
        <img
          src="/logo.webp"
          alt="Logo"
          className="w-6 h-6 rounded-full object-cover"
        />
        <span className="text-gray-500 text-xs">&</span>
        <img
          src="/nyati.webp"
          alt="Nyati"
          className="w-6 h-6 rounded-full object-cover"
        />
      </div>
    );
  }
  return (
    <img
      src="/nyati.webp"
      alt="Nyati"
      className="w-8 h-8 rounded-full object-cover"
    />
  );
}

// Main streaming message component
export default function StreamingMessage({
  role,
  content,
  isStreaming = false,
  isComplete = true,
  sources = [],
  liveResources = [],
  modelType,
  onStopGeneration,
  onSourceClick,
  onShowSources,
  onSuggestionClick,
  isSearching = false,
  searchQuery,
  newsArticles = [],
  movieResults = [],
  personResults = [],
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const isAI = role === "assistant";

  // Parse thinking tags and Nyati JSON metadata
  const parseThinking = (text: string): { thought: string | null; message: string } => {
    // Try to find JSON blocks that look like Nyati plan metadata
    // This handles cases where text like "Nyati" appears before the JSON
    const planPattern = /{[\s\S]*?"type"\s*:\s*"plan"[\s\S]*?}/;
    const match = text.match(planPattern);
    
    if (match) {
      const jsonStr = match[0];
      // Validate it's proper JSON by checking for required fields
      if (jsonStr.includes('"intent"') && jsonStr.includes('"lastUpdated"')) {
        try {
          JSON.parse(jsonStr);
          // Remove the JSON block from the message
          const message = text.replace(jsonStr, '').replace(/\n\n+/g, '\n').trim();
          return { thought: jsonStr, message };
        } catch {
          // Invalid JSON, continue to other parsers
        }
      }
    }
    
    // Try <thinking> tags
    const thinkRegex = /<thinking>([\s\S]*?)<\/thinking>/;
    const thinkMatch = text.match(thinkRegex);
    if (thinkMatch) {
      const thought = thinkMatch[1].trim();
      const message = text.replace(thinkRegex, '').trim();
      return { thought, message };
    }
    
    return { thought: null, message: text };
  };

  // Post-process message to remove banned phrases
  const removeBannedPhrases = (text: string): string => {
    const bannedPhrases = [
      /how can i assist you today\??/gi,
      /what can i help you with today\??/gi,
      /what can i do for you today\??/gi,
      /how may i assist you\??/gi,
      /how can i be of assistance\??/gi,
      /how can i help you\??/gi,
    ];
    
    let cleaned = text;
    bannedPhrases.forEach(phrase => {
      cleaned = cleaned.replace(phrase, '');
    });
    
    return cleaned.trim();
  };

  // Parse content to extract thought and clean message
  const { thought, message: rawMessage } = isAI ? parseThinking(content) : { thought: null, message: content };
  const message = isAI ? removeBannedPhrases(rawMessage) : rawMessage;
  
  // Parse suggestions from message
  const suggestions = isAI ? parseSuggestions(message) : [];
  const messageWithoutSuggestions = isAI ? removeSuggestions(message) : message;

  // Streaming effect - simple typewriter, no reset glitch
  useEffect(() => {
    if (!isStreaming || !isAI) {
      setDisplayedContent(message);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    
    // Directly display the content as it arrives (no artificial typewriter delay)
    // The server already streams word-by-word, so just show what we get
    setDisplayedContent(message);
    
    return () => {
      setIsTyping(false);
    };
  }, [content, message, isStreaming, isAI]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsTyping(false);
    };
  }, []);

  // Stop generation handler
  const handleStop = useCallback(() => {
    setDisplayedContent(message);
    setIsTyping(false);
    onStopGeneration?.();
  }, [message, onStopGeneration]);

  // User message
  if (!isAI) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end py-4"
      >
        <div className="max-w-[85%] bg-white/5 text-white px-5 py-3 rounded-3xl rounded-br-lg border border-white/10 backdrop-blur-sm">
          <div className="text-[15px] leading-relaxed">{message}</div>
        </div>
      </motion.div>
    );
  }

  // AI message with streaming
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 group py-4 justify-center"
    >
      {/* Agent Avatar with glow during thinking */}
      <div className="shrink-0 relative">
        {isStreaming && displayedContent.length < 50 && <ThinkingGlow />}
        <AgentAvatar modelType={modelType} />
      </div>

      {/* Message Content - max-width 750px for premium feel */}
      <div className="flex-1 space-y-1 pt-1 min-w-0 max-w-[750px]">
        {/* Thinking Box */}
        {thought && isComplete && <ThinkingBox thought={thought} />}

        {/* Streaming Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          {isStreaming ? (
            <div className="text-[15px] leading-[1.6] text-gray-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: ({ inline, ...props }: any) =>
                    inline ? (
                      <InlineCode>{props.children}</InlineCode>
                    ) : (
                      <CodeBlock {...props} />
                    ),
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">
                      {parseCitations(String(children), sources, onSourceClick)}
                    </p>
                  ),
                }}
              >
                {displayedContent}
              </ReactMarkdown>
              {isTyping && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />}
            </div>
          ) : (
            <div className="text-[15px] leading-[1.6] text-gray-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: ({ inline, ...props }: any) =>
                    inline ? (
                      <InlineCode>{props.children}</InlineCode>
                    ) : (
                      <CodeBlock {...props} />
                    ),
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">
                      {parseCitations(String(children), sources, onSourceClick)}
                    </p>
                  ),
                }}
              >
                {message}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Source Pills - Premium rounded pills */}
        {sources && sources.length > 0 && !isStreaming && (
          <div className="mt-3">
            <SourcePills 
              sources={sources.map(s => ({
                id: s.id,
                title: s.title,
                url: s.url,
                type: (s.type as any) || 'duckduckgo',
                favicon: s.favicon,
                source: s.source,
              }))}
              onSourceClick={onSourceClick}
              onShowAll={onShowSources}
            />
          </div>
        )}

        {/* Person Cards - Circle profile for celebrities */}
        {!isStreaming && personResults && personResults.length > 0 && (
          <PersonCardGrid people={personResults} />
        )}

        {/* Suggestion Chips */}
        {!isStreaming && suggestions.length > 0 && onSuggestionClick && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionChip
                key={index}
                suggestion={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
              />
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isStreaming && isTyping && <TypingIndicator />}
        
        {/* Search Loading Skeleton */}
        {isSearching && <SearchLoadingSkeleton query={searchQuery} />}

        {/* Stop Button */}
        {isStreaming && (
          <button
            onClick={handleStop}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 rounded-full text-xs font-medium transition-colors border border-[#3a3a3a]"
          >
            <Square size={10} fill="currentColor" />
            Stop generating
          </button>
        )}

        {/* Sources Button */}
        {sources.length > 0 && onShowSources && (
          <button
            onClick={onShowSources}
            className="mt-3 flex items-center gap-2 px-4 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-full text-sm font-medium transition-colors"
          >
            <Link2 size={14} className="text-gray-400" />
            Sources ({sources.length})
          </button>
        )}

        {/* Live Resources */}
        {liveResources.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium">Live Resources</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {liveResources.map((resource, index) => (
                <LiveResourceCard key={index} resource={resource} />
              ))}
            </div>
          </div>
        )}
        
        {/* News Articles */}
        {!isStreaming && newsArticles.length > 0 && (
          <NewsCardGrid articles={newsArticles} />
        )}
        
        {/* Movie Results */}
        {!isStreaming && movieResults.length > 0 && (
          <MovieCardGrid movies={movieResults} />
        )}
      </div>
    </motion.div>
  );
}
