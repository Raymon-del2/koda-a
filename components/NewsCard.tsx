/**
 * NewsCard - Displays news articles with images
 */

'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Clock, Newspaper } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  publishedAt: string;
}

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
}

export function NewsCard({ article, index = 0 }: NewsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group flex flex-col bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222] transition-all"
    >
      {/* Image */}
      {article.urlToImage ? (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={article.urlToImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
        </div>
      ) : (
        <div className="h-24 w-full bg-[#252525] flex items-center justify-center">
          <Newspaper size={32} className="text-gray-600" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex flex-col p-3 gap-2">
        {/* Source and time */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Newspaper size={12} />
            {article.source.name}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDate(article.publishedAt)}
          </span>
        </div>
        
        {/* Title */}
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
          {article.title}
        </h3>
        
        {/* Description */}
        {article.description && (
          <p className="text-xs text-gray-400 line-clamp-2">
            {article.description}
          </p>
        )}
        
        {/* Read more */}
        <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
          <span>Read more</span>
          <ExternalLink size={10} />
        </div>
      </div>
    </motion.a>
  );
}

/**
 * NewsCardGrid - Grid of news cards
 */
export function NewsCardGrid({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Newspaper size={14} />
        <span>Latest News ({articles.length} articles)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {articles.slice(0, 4).map((article, index) => (
          <NewsCard key={article.id} article={article} index={index} />
        ))}
      </div>
    </div>
  );
}
