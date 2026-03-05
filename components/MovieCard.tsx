/**
 * MovieCard - Displays movies/TV shows with posters
 */

'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Star, Film, Tv } from 'lucide-react';

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

interface MovieCardProps {
  movie: MovieResult;
  index?: number;
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const isTV = movie.type === 'tv';
  
  return (
    <motion.a
      href={`https://www.themoviedb.org/${movie.type}/${movie.id}`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group flex gap-3 bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222] transition-all"
    >
      {/* Poster */}
      <div className="relative w-24 h-36 flex-shrink-0 overflow-hidden">
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-[#252525] flex items-center justify-center">
            {isTV ? <Tv size={24} className="text-gray-600" /> : <Film size={24} className="text-gray-600" />}
          </div>
        )}
        
        {/* Type badge */}
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-medium text-white flex items-center gap-1">
          {isTV ? <Tv size={10} /> : <Film size={10} />}
          {isTV ? 'TV' : 'Movie'}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col py-2 pr-3 flex-1 min-w-0">
        {/* Title and year */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">
            {movie.title}
          </h3>
          {movie.year && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              ({movie.year})
            </span>
          )}
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          <Star size={12} className="text-yellow-500 fill-yellow-500" />
          <span className="text-xs text-yellow-500 font-medium">
            {movie.rating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">/10</span>
        </div>
        
        {/* Overview */}
        {movie.overview && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-2">
            {movie.overview}
          </p>
        )}
        
        {/* View details */}
        <div className="flex items-center gap-1 text-xs text-blue-400 mt-auto pt-2">
          <span>View details</span>
          <ExternalLink size={10} />
        </div>
      </div>
    </motion.a>
  );
}

/**
 * MovieCardGrid - Grid of movie cards
 */
export function MovieCardGrid({ movies }: { movies: MovieResult[] }) {
  if (movies.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Film size={14} />
        <span>Related {movies[0]?.type === 'tv' ? 'TV Shows' : 'Movies'} ({movies.length} results)</span>
      </div>
      <div className="flex flex-col gap-3">
        {movies.slice(0, 4).map((movie, index) => (
          <MovieCard key={movie.id} movie={movie} index={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * MovieCardHorizontal - Horizontal scrollable movie cards
 */
export function MovieCardHorizontal({ movies }: { movies: MovieResult[] }) {
  if (movies.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Film size={14} />
        <span>Related Content</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0"
          >
            <a
              href={`https://www.themoviedb.org/${movie.type}/${movie.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block w-32"
            >
              <div className="relative w-32 h-48 rounded-lg overflow-hidden bg-[#252525]">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={24} className="text-gray-600" />
                  </div>
                )}
                
                {/* Rating overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] text-yellow-500 font-medium">
                      {movie.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <h4 className="text-xs font-medium text-white mt-1.5 line-clamp-2">
                {movie.title}
              </h4>
              {movie.year && (
                <p className="text-[10px] text-gray-500">{movie.year}</p>
              )}
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
