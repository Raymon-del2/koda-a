/**
 * SourcePills - Premium rounded horizontal pills for sources
 * Shows small rounded pills with source icons that transform from "Searching..." state
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Youtube, Newspaper, Film, Database, Search, ExternalLink, ChevronRight, User } from 'lucide-react';
import { useState } from 'react';

interface SourcePill {
  id: number;
  title: string;
  url: string;
  type: 'website' | 'video' | 'news' | 'movie' | 'qdrant' | 'article' | 'person';
  favicon?: string;
  source?: string;
}

interface SourcePillsProps {
  sources: SourcePill[];
  isSearching?: boolean;
  onSourceClick?: (sourceId: number) => void;
  onShowAll?: () => void;
}

// Get icon based on source type
function getSourceIcon(type: SourcePill['type']) {
  switch (type) {
    case 'video':
      return <Youtube size={12} className="text-red-500" />;
    case 'news':
      return <Newspaper size={12} className="text-orange-400" />;
    case 'movie':
      return <Film size={12} className="text-purple-400" />;
    case 'person':
      return <User size={12} className="text-pink-400" />;
    case 'website':
      return <Globe size={12} className="text-blue-400" />;
    case 'qdrant':
      return <Database size={12} className="text-teal-400" />;
    default:
      return <Globe size={12} className="text-blue-400" />;
  }
}

// Get favicon URL
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
  } catch {
    return '';
  }
}

// Shimmer animation component
function ShimmerPill() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#252525] border border-[#333]"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Search size={12} className="text-gray-400" />
      </motion.div>
      <span className="text-xs text-gray-400">Searching...</span>
    </motion.div>
  );
}

// Individual source pill
function SourcePill({ 
  source, 
  index, 
  onClick 
}: { 
  source: SourcePill; 
  index: number;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.8, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222] transition-all cursor-pointer"
    >
      {/* Favicon or Icon */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {source.type === 'website' && !imageError ? (
          <img
            src={source.favicon || getFaviconUrl(source.url)}
            alt=""
            className="w-3.5 h-3.5 object-contain rounded-sm"
            onError={() => setImageError(true)}
          />
        ) : (
          getSourceIcon(source.type)
        )}
      </div>
      
      {/* Source name */}
      <span className="text-[11px] text-gray-300 group-hover:text-white transition-colors max-w-[80px] truncate">
        {source.source || source.title.slice(0, 15)}
      </span>
      
      {/* External link indicator on hover */}
      <ExternalLink 
        size={10} 
        className="text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" 
      />
    </motion.a>
  );
}

export function SourcePills({ 
  sources, 
  isSearching = false, 
  onSourceClick,
  onShowAll 
}: SourcePillsProps) {
  const displaySources = sources.slice(0, 4);
  const remainingCount = sources.length - 4;
  
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <AnimatePresence mode="popLayout">
        {/* Searching state */}
        {isSearching && sources.length === 0 && (
          <ShimmerPill key="searching" />
        )}
        
        {/* Source pills */}
        {displaySources.map((source, index) => (
          <SourcePill
            key={source.id}
            source={source}
            index={index}
            onClick={() => onSourceClick?.(source.id)}
          />
        ))}
        
        {/* Show more button */}
        {remainingCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onShowAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-teal-500/50 hover:bg-teal-500/10 transition-all cursor-pointer group"
          >
            <span className="text-[11px] text-gray-400 group-hover:text-teal-400">
              +{remainingCount} more
            </span>
            <ChevronRight size={10} className="text-gray-500 group-hover:text-teal-400" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Source count badge
export function SourceCountBadge({ 
  count, 
  onClick 
}: { 
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) return null;
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-teal-500/50 hover:bg-teal-500/5 transition-all cursor-pointer group"
    >
      <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
        <Database size={10} className="text-teal-400" />
      </div>
      <span className="text-xs text-gray-300 group-hover:text-teal-400 font-medium">
        {count} {count === 1 ? 'source' : 'sources'}
      </span>
    </motion.button>
  );
}
