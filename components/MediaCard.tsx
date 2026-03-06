"use client";

import { motion } from "framer-motion";
import { Star, Calendar, ExternalLink } from "lucide-react";

interface EntertainmentEntity {
  id: number;
  type: "movie" | "tv" | "person";
  title: string;
  overview: string;
  poster_path?: string;
  profile_path?: string;
  rating?: number;
  release_date?: string;
  known_for?: Array<{
    id: number;
    title?: string;
    poster_path?: string;
  }>;
}

interface MediaCardProps {
  entity: EntertainmentEntity;
  onMovieClick?: (id: number) => void;
  onActorClick?: (id: number) => void;
}

export function MediaCard({ entity, onMovieClick, onActorClick }: MediaCardProps) {
  const isPerson = entity.type === "person";
  const imageUrl = isPerson ? entity.profile_path : entity.poster_path;
  const year = entity.release_date?.split("-")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="media-card-container"
    >
      {/* Image Section */}
      <div className={`media-image-wrapper ${isPerson ? "rounded-full" : ""}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entity.title}
            className="media-image"
            loading="lazy"
          />
        ) : (
          <div className="media-placeholder">
            <span className="text-4xl">🎬</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="media-content">
        {/* Header */}
        <div className="media-header">
          <span className={`media-type-tag ${entity.type}`}>
            {entity.type.toUpperCase()}
          </span>
          <h3 className="media-title">{entity.title}</h3>
        </div>

        {/* Stats */}
        <div className="media-stats">
          {!isPerson && entity.rating !== undefined && (
            <>
              <Star className="rating-star" size={14} fill="#f1c40f" />
              <span className="rating-value">{entity.rating.toFixed(1)}</span>
            </>
          )}
          {year && year !== "N/A" && (
            <>
              {!isPerson && <span className="stat-separator">•</span>}
              <Calendar size={12} className="text-gray-500" />
              <span className="release-year">{year}</span>
            </>
          )}
        </div>

        {/* Overview */}
        <p className="media-overview">
          {entity.overview.length > 150
            ? entity.overview.substring(0, 150) + "..."
            : entity.overview}
        </p>

        {/* Known For (Actors only) */}
        {isPerson && entity.known_for && entity.known_for.length > 0 && (
          <div className="known-for-section">
            <p className="known-for-label">Known for:</p>
            <div className="known-for-chips">
              {entity.known_for.slice(0, 3).map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => onMovieClick?.(movie.id)}
                  className="known-for-chip"
                >
                  {movie.poster_path && (
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      className="chip-poster"
                    />
                  )}
                  <span className="chip-title">{movie.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View on TMDB Button */}
        <a
          href={`https://www.themoviedb.org/${entity.type}/${entity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="view-tmdb-btn"
        >
          <ExternalLink size={14} />
          View on TMDB
        </a>
      </div>
    </motion.div>
  );
}

// Grid component for multiple media cards
interface MediaCardGridProps {
  entities: EntertainmentEntity[];
  onMovieClick?: (id: number) => void;
  onActorClick?: (id: number) => void;
}

export function MediaCardGrid({ entities, onMovieClick, onActorClick }: MediaCardGridProps) {
  if (!entities || entities.length === 0) return null;

  return (
    <div className="media-card-grid">
      {entities.map((entity) => (
        <MediaCard
          key={entity.id}
          entity={entity}
          onMovieClick={onMovieClick}
          onActorClick={onActorClick}
        />
      ))}
    </div>
  );
}

export type { EntertainmentEntity };
