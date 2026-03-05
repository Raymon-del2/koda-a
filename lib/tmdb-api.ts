/**
 * TMDB (The Movie Database) Search - Fetches movie/TV data with posters
 * Free API with generous limits
 */

export interface MovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  video: boolean;
}

export interface TVResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  origin_country: string[];
}

export interface MovieSearchResult {
  success: boolean;
  results: (MovieResult | TVResult)[];
  totalResults: number;
  isMovie: boolean;
  error?: string;
}

// TMDB API key - get free at https://www.themoviedb.org/settings/api
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Get full image URL
 */
export function getImageUrl(path: string | null, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

/**
 * Search for movies
 */
export async function searchMovies(
  query: string,
  page: number = 1
): Promise<MovieSearchResult> {
  try {
    const url = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results) {
      return {
        success: true,
        results: data.results,
        totalResults: data.total_results,
        isMovie: true,
      };
    } else {
      return {
        success: false,
        results: [],
        totalResults: 0,
        isMovie: true,
        error: 'No results found',
      };
    }
  } catch (error) {
    console.error('TMDB movie search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      isMovie: true,
      error: error instanceof Error ? error.message : 'Failed to search movies',
    };
  }
}

/**
 * Search for TV shows
 */
export async function searchTV(
  query: string,
  page: number = 1
): Promise<MovieSearchResult> {
  try {
    const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results) {
      return {
        success: true,
        results: data.results,
        totalResults: data.total_results,
        isMovie: false,
      };
    } else {
      return {
        success: false,
        results: [],
        totalResults: 0,
        isMovie: false,
        error: 'No results found',
      };
    }
  } catch (error) {
    console.error('TMDB TV search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      isMovie: false,
      error: error instanceof Error ? error.message : 'Failed to search TV shows',
    };
  }
}

/**
 * Multi-search (movies, TV, people)
 */
export async function multiSearch(
  query: string,
  page: number = 1
): Promise<MovieSearchResult & { results: any[] }> {
  try {
    const url = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results) {
      // Include movies, TV shows, AND people (for celebrity profiles)
      const filtered = data.results.filter((item: any) => 
        item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person'
      );
      
      return {
        success: true,
        results: filtered,
        totalResults: data.total_results,
        isMovie: true,
      };
    } else {
      return {
        success: false,
        results: [],
        totalResults: 0,
        isMovie: true,
        error: 'No results found',
      };
    }
  } catch (error) {
    console.error('TMDB multi search error:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      isMovie: true,
      error: error instanceof Error ? error.message : 'Failed to search',
    };
  }
}

/**
 * Get movie details with videos
 */
export async function getMovieDetails(movieId: number): Promise<any> {
  try {
    const url = `${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`;
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('TMDB movie details error:', error);
    return null;
  }
}

/**
 * Format movie results for context injection
 */
export function formatMoviesForContext(results: (MovieResult | TVResult)[], isMovie: boolean): string {
  if (results.length === 0) return '';
  
  let context = isMovie ? '\n\n**MOVIE RESULTS:**\n' : '\n\n**TV SHOW RESULTS:**\n';
  
  results.slice(0, 5).forEach((item, i) => {
    const title = 'title' in item ? item.title : item.name;
    const date = 'release_date' in item ? item.release_date : item.first_air_date;
    const year = date ? new Date(date).getFullYear() : 'N/A';
    
    context += `\n[${i + 1}] ${title} (${year})\n`;
    context += `Rating: ${item.vote_average.toFixed(1)}/10 (${item.vote_count} votes)\n`;
    context += `${item.overview?.slice(0, 200)}${item.overview && item.overview.length > 200 ? '...' : ''}\n`;
    
    if (item.poster_path) {
      context += `Poster: ${getImageUrl(item.poster_path, 'w200')}\n`;
    }
  });
  
  return context;
}

/**
 * Detect if query is movie/TV related
 */
export function isMovieQuery(query: string): boolean {
  const moviePatterns = [
    /\b(movie|film|cinema|showtime)\b/i,
    /\b(tv series|tv show|television|episode|season)\b/i,
    /\b(actor|actress|director|cast|starring)\b/i,
    /\b(imdb|rotten tomatoes|box office)\b/i,
    /\b(trailer|poster|watch online)\b/i,
    /\b(netflix|hulu|disney\+|hbo|amazon prime)\b/i,
    // Common movie phrases
    /\b(what movie|which movie|find movie|search movie)\b/i,
    /\b(movie about|film about|movie with)\b/i,
  ];
  
  return moviePatterns.some(pattern => pattern.test(query));
}

/**
 * Extract movie/TV title from query
 */
export function extractMovieTitle(query: string): string {
  // Remove common phrases to get the title
  let cleaned = query
    .replace(/^(what is|who is|tell me about|find|search|look for|information about)\s*/gi, '')
    .replace(/(movie|film|tv show|series|show)\s*(about|with|called|named)?\s*/gi, '')
    .replace(/\?$/g, '')
    .trim();
  
  return cleaned || query;
}
