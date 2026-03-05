"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Link2, Youtube, Globe, Database, Play, User } from "lucide-react";
import { useState } from "react";

export interface Source {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  type: 'qdrant' | 'google' | 'video' | 'website' | 'article' | 'news' | 'movie' | 'person';
  snippet?: string;
  image?: string | null;
  source?: string;
  date?: string;
  rating?: number;
}

interface SourcesSidebarProps {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
  highlightedSourceId?: number | null;
}

// Get favicon URL from Google service
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch {
    return '';
  }
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const regex = /(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Get icon based on source type
function getSourceIcon(type: Source['type']) {
  switch (type) {
    case 'google':
    case 'video':
      return <Youtube size={16} className="text-red-500" />;
    case 'website':
      return <Globe size={16} className="text-blue-500" />;
    case 'qdrant':
      return <Database size={16} className="text-teal-400" />;
    case 'news':
      return <Globe size={16} className="text-orange-500" />;
    case 'movie':
      return <Play size={16} className="text-purple-500" />;
    case 'person':
      return <User size={16} className="text-pink-400" />;
    default:
      return <Link2 size={16} className="text-gray-400" />;
  }
}

// Source Card Component with YouTube embed, news image, and movie poster support
function SourceCard({ 
  source, 
  isHighlighted,
  onExpand 
}: { 
  source: Source; 
  isHighlighted: boolean;
  onExpand: () => void;
}) {
  const youtubeId = getYouTubeId(source.url);
  const isVideo = source.type === 'video' || youtubeId !== null;
  const isNews = source.type === 'news';
  const isMovie = source.type === 'movie';
  const isWebsite = source.type === 'website';
  const hasImage = source.image && !isVideo;
  
  return (
    <div
      className={`rounded-xl border transition-all group ${
        isHighlighted
          ? 'border-teal-500/50 bg-teal-500/10'
          : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#252525]'
      }`}
    >
      {/* YouTube Embed Preview - only for video type */}
      {isVideo && youtubeId && (
        <div className="relative aspect-video bg-black rounded-t-xl overflow-hidden">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title={source.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      
      {/* News/Movie Image Preview */}
      {hasImage && (
        <div className="relative h-32 bg-black rounded-t-xl overflow-hidden">
          <img
            src={source.image!}
            alt={source.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
        </div>
      )}
      
      {/* Source Info */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 p-3"
        onClick={onExpand}
      >
        {/* Favicon / Icon */}
        <div className="w-8 h-8 rounded-full border border-[#3a3a3a] flex-shrink-0 overflow-hidden bg-[#1e1e1e] flex items-center justify-center">
          {isWebsite ? (
            <img
              src={source.favicon || getFaviconUrl(source.url)}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            getSourceIcon(source.type)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              {isVideo ? 'Video' : isWebsite ? 'Website' : isNews ? 'News' : isMovie ? 'Movie' : 'Source'}
            </span>
          </div>
          <p className="text-sm font-medium text-white truncate group-hover:text-teal-400 transition-colors mt-0.5">
            {source.title}
          </p>
          {source.snippet && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {source.snippet}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <img 
              src={getFaviconUrl(source.url)} 
              alt="" 
              className="w-3 h-3 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-gray-500 truncate">
              {new URL(source.url).hostname}
            </span>
          </div>
        </div>
        <ExternalLink size={12} className="text-gray-600 group-hover:text-teal-400 mt-1 flex-shrink-0" />
      </a>
    </div>
  );
}

export default function SourcesSidebar({
  sources,
  isOpen,
  onClose,
  highlightedSourceId,
}: SourcesSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 bg-[#1a1a1a] border-l border-[#2a2a2a] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Link2 size={18} className="text-teal-400" />
                Sources ({sources.length})
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2a2a2a] rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Sources List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  isHighlighted={highlightedSourceId === source.id}
                  onExpand={() => {}}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2a2a2a] text-xs text-gray-500 text-center">
              Click any source to open in new tab
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
