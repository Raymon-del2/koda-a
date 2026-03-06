"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { Sparkles, User, Brain, Link2 } from "lucide-react";
import React, { useState } from "react";

interface Source {
  id: number;
  title: string;
  url: string;
}

interface MotionMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isSystem?: boolean;
  sources?: Source[];
  onSourceClick?: (sourceId: number) => void;
  onShowSources?: () => void;
  modelType?: string;
}

// Animation variants
const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// Code Block Component with Sticky Header and Copy Functionality
function CodeBlock({ lang, code, index, modelType }: { lang: string; code: string; index: number; modelType?: string }) {
  const [copied, setCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 0);
    }
  };

  // Enhanced syntax highlighting with better colors
  const highlightCode = (code: string, language: string) => {
    // Escape HTML first
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Python/JavaScript/TypeScript keywords
    const keywords = /\b(def|class|return|if|else|elif|for|while|import|from|as|const|let|var|function|async|await|try|catch|throw|new|this|true|false|null|undefined|interface|type|export|default|extends|implements|public|private|protected|static|get|set|yield|break|continue|pass|lambda|with|raise|except|finally|in|is|not|and|or)\b/g;
    
    // Strings
    const strings = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
    
    // Comments
    const comments = /(#.*$|\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    
    // Functions
    const functions = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;
    
    // Numbers
    const numbers = /\b(\d+\.?\d*|0x[0-9a-fA-F]+)\b/g;
    
    // Decorators/Annotations
    const decorators = /(@\w+(?:\.\w+)?)/g;

    // Apply highlighting in order (Gemini-style colors)
    highlighted = highlighted
      .replace(comments, '<span style="color: #6a9955;">$&</span>')  // Green comments
      .replace(strings, '<span style="color: #ce9178;">$&</span>')  // Orange/red strings
      .replace(decorators, '<span style="color: #dcdcaa;">$&</span>')  // Yellow decorators
      .replace(keywords, '<span style="color: #c586c0;">$&</span>')  // Purple keywords (Gemini style)
      .replace(functions, '<span style="color: #dcdcaa;">$&</span>')  // Yellow functions
      .replace(numbers, '<span style="color: #b5cea8;">$&</span>');  // Light green numbers

    return highlighted;
  };

  return (
    <div
      key={index}
      className="my-6 rounded-xl bg-[#1e1e2e] relative group"
      style={{ maxWidth: '100%' }}
    >
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
          border: 1px solid transparent;
        }
        .group:hover .custom-scroll::-webkit-scrollbar-thumb {
          background: #3b82f6;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #60a5fa !important;
        }
      `}</style>
      
      {/* Scrollable Container with overflow hidden for rounded corners */}
      <div className="overflow-hidden rounded-xl">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-auto custom-scroll"
          style={{ maxHeight: '450px' }}
        >
          {/* Sticky Header - Must be first child of scroll container */}
          <div 
            className={`flex items-center justify-between px-4 py-3 sticky top-0 transition-all duration-200 ${
              isScrolled 
                ? 'bg-[#252535] shadow-lg shadow-black/40 border-b border-[#3a3a4a]' 
                : 'bg-[#1e1e2e]'
            }`}
            style={{ zIndex: 100 }}
          >
            <span className="text-sm text-[#a0a0a0] font-normal lowercase">
              {lang || "text"}
            </span>
          </div>
          
          {/* Code Area */}
          <pre 
            className="px-4 py-4 m-0 font-mono text-[14px] leading-relaxed"
            style={{ 
              backgroundColor: 'transparent',
              minWidth: '100%',
              width: 'max-content',
              whiteSpace: 'pre'
            }}
          >
            <code 
              className="block"
              style={{ 
                color: '#e0e0e0',
                whiteSpace: 'pre',
                wordSpacing: 'normal',
                wordBreak: 'normal',
                overflowWrap: 'normal'
              }}
              dangerouslySetInnerHTML={{ __html: highlightCode(code.trim(), lang) }}
            />
          </pre>
        </div>
      </div>
      
      {/* Bottom fade mask */}
      <div 
        className="absolute bottom-[48px] left-0 right-0 h-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, #1e1e2e, transparent)',
          zIndex: 5
        }}
      />
      
      {/* Footer - Outside scroll area */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a3a] bg-[#1e1e2e]">
        <span className="text-xs text-[#666]">
          Written by {modelType === 'pro' ? 'Koda-A' : modelType === 'medium' ? 'Medium Agent' : modelType || 'AI'}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 border ${
            copied 
              ? 'bg-transparent text-[#4ade80] border-[#4ade80]/50' 
              : 'bg-transparent text-[#666] border-transparent hover:text-[#999]'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Function to format message with code blocks and inline code
function formatMessage(text: string, modelType?: string): React.ReactNode {
  if (!text) return null;

  // Normalize newlines
  const normalized = text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, "  ");

  // Split by code blocks
  const parts = normalized.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Code block
    if (part.startsWith("```")) {
      const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (match) {
        const [, lang = "", code] = match;
        return <CodeBlock key={index} lang={lang} code={code} index={index} modelType={modelType} />;
      }
    }

    // Regular text with inline code
    const textParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={index}>
        {textParts.map((textPart, textIndex) => {
          if (textPart.startsWith("`") && textPart.endsWith("`")) {
            return (
              <code
                key={textIndex}
                className="px-1.5 py-0.5 bg-[#2d2d2e] rounded text-sm font-mono text-teal-400"
              >
                {textPart.slice(1, -1)}
              </code>
            );
          }
          // Handle line breaks
          return (
            <span key={textIndex}>
              {textPart.split("\n").map((line, lineIndex, arr) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          );
        })}
      </span>
    );
  });
}

// Function to parse thinking tags and extract thought content
function parseThinking(text: string): { thought: string | null; message: string } {
  const thinkRegex = /<thinking>([\s\S]*?)<\/thinking>/;
  const match = text.match(thinkRegex);
  
  if (match) {
    const thought = match[1].trim();
    const message = text.replace(thinkRegex, '').trim();
    return { thought, message };
  }
  
  return { thought: null, message: text };
}

// Citation Component with Hover Tooltip
const Citation = ({ source, onClick }: { source: Source; onClick: (id: number) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick(source.id)}
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
};

// Formatted Message with clickable citations and code blocks
const FormattedMessage = ({ text, sources, onSourceClick, modelType }: { text: string; sources: Source[]; onSourceClick?: (id: number) => void; modelType?: string }) => {
  // First format with code blocks
  const formattedContent = formatMessage(text, modelType);
  
  // Then process citations in each text part
  const processCitations = (content: React.ReactNode): React.ReactNode => {
    if (typeof content === 'string') {
      const parts = content.split(/(\[\d+\])/g);
      return parts.map((part, index) => {
        const match = part.match(/\[(\d+)\]/);
        if (match && onSourceClick) {
          const sourceId = parseInt(match[1]);
          const source = sources.find(s => s.id === sourceId);
          if (source) {
            return <Citation key={index} source={source} onClick={onSourceClick} />;
          }
        }
        return <span key={index}>{part}</span>;
      });
    }
    return content;
  };

  return (
    <div className="leading-relaxed text-[15px] text-gemini-text-primary">
      {formattedContent}
    </div>
  );
};
function ThinkingBox({ thought }: { thought: string }) {
  return (
    <details className="group mb-3 border border-[#3c4043] rounded-lg bg-[#1e1f20]/50 overflow-hidden">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-[#2d2d2e]/50 flex items-center gap-2 list-none select-none">
        <Brain size={14} className="text-teal-400" />
        <span>Koda-A's Mental Model</span>
        <svg 
          className="w-3 h-3 ml-auto transition-transform group-open:rotate-90 text-gray-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div className="px-3 py-2 text-xs text-gray-500 italic bg-[#1e1f20] border-t border-[#3c4043]/50">
        {thought}
      </div>
    </details>
  );
}

export default function MotionMessage({
  role,
  content,
  isStreaming,
  isSystem,
  sources = [],
  onSourceClick,
  onShowSources,
  modelType,
}: MotionMessageProps) {
  const isAI = role === "assistant";
  
  // Parse thinking tags for AI messages
  const { thought, message } = isAI ? parseThinking(content) : { thought: null, message: content };

  // Agent profile configuration
  const getAgentProfiles = () => {
    if (modelType === 'pro') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          K
        </div>
      );
    } else if (modelType === 'medium') {
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
    } else {
      // free-slow (default)
      return (
        <img 
          src="/nyati.webp" 
          alt="Nyati" 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
  };

  // System message (like "Response was canceled")
  if (isSystem) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex gap-4 group py-2"
      >
        <div className="w-8 h-8 rounded-full flex shrink-0" />
        <div className="flex-1">
          <span className="text-sm text-gray-500 italic">{content}</span>
        </div>
      </motion.div>
    );
  }

  // User message - right aligned bubble
  if (!isAI) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex justify-end py-4"
      >
        <div className="max-w-[80%] bg-[#4a4a4a] text-white px-4 py-3 rounded-2xl rounded-br-md min-w-0 break-words overflow-wrap-anywhere">
          <FormattedMessage text={message} sources={sources} onSourceClick={onSourceClick} modelType={modelType} />
        </div>
      </motion.div>
    );
  }

  // AI message - left aligned with agent profile
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex gap-3 group py-4"
    >
      {/* Agent Profile */}
      <div className="shrink-0">
        {getAgentProfiles()}
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-1 pt-1 min-w-0">
        {/* Show thinking box if thought exists */}
        {thought && <ThinkingBox thought={thought} />}
        
        <FormattedMessage text={message} sources={sources} onSourceClick={onSourceClick} modelType={modelType} />
        
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
      </div>
    </motion.div>
  );
}
