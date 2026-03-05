/**
 * PersonCard - Celebrity/Person profile card with circle image
 * Displays TMDB person data with known_for credits
 */

'use client';

import { motion } from 'framer-motion';
import { User, Film, Tv, Calendar, MapPin, ExternalLink } from 'lucide-react';

interface PersonResult {
  id: number;
  title: string; // name
  overview?: string; // biography or known_for
  poster?: string | null; // profile_path image
  type: string;
  rating?: number; // popularity
  known_for?: { title: string; type: string }[];
}

interface PersonCardProps {
  person: PersonResult;
  index?: number;
}

export function PersonCard({ person, index = 0 }: PersonCardProps) {
  const profileUrl = `https://www.themoviedb.org/person/${person.id}`;
  
  return (
    <motion.a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group flex items-start gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] hover:border-teal-500/50 hover:bg-[#1e1e1e] transition-all"
    >
      {/* Circle Profile Image */}
      <div className="relative shrink-0">
        {person.poster ? (
          <img
            src={person.poster}
            alt={person.title}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#333] group-hover:border-teal-500/50 transition-colors"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#252525] border-2 border-[#333] flex items-center justify-center">
            <User size={24} className="text-gray-500" />
          </div>
        )}
        {/* Online indicator */}
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-teal-500 rounded-full border-2 border-[#1a1a1a]" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-white truncate">{person.title}</h3>
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full uppercase">
            Person
          </span>
        </div>
        
        {/* Known for */}
        {person.overview && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
            {person.overview.slice(0, 150)}
          </p>
        )}
        
        {/* Credits */}
        {person.known_for && person.known_for.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {person.known_for.slice(0, 3).map((credit, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-2 py-0.5 bg-[#252525] rounded-full text-[10px] text-gray-400"
              >
                {credit.type === 'movie' ? <Film size={10} /> : <Tv size={10} />}
                <span className="max-w-[80px] truncate">{credit.title}</span>
              </span>
            ))}
          </div>
        )}
        
        {/* View Profile Link */}
        <div className="mt-2 flex items-center gap-1 text-[10px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View full profile</span>
          <ExternalLink size={10} />
        </div>
      </div>
    </motion.a>
  );
}

// Person Card Grid
interface PersonCardGridProps {
  people: PersonResult[];
}

export function PersonCardGrid({ people }: PersonCardGridProps) {
  if (!people || people.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <User size={16} className="text-purple-400" />
        <span className="text-sm font-medium text-gray-300">People</span>
        <span className="text-xs text-gray-500">({people.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map((person, index) => (
          <PersonCard key={person.id} person={person} index={index} />
        ))}
      </div>
    </div>
  );
}
