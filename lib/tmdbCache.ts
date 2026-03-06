// TMDB Data Cache Utility
// Uses sessionStorage for fast access during the session

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_PREFIX = 'tmdb_';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export function saveToCache(key: string, data: any): void {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

export function getFromCache(key: string): any | null {
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

export function clearCache(): void {
  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Pre-fetch and cache TMDB data
export async function prefetchEntertainmentData(
  type: 'movie' | 'tv' | 'person',
  query: string
): Promise<any | null> {
  const cacheKey = `${type}_${query.toLowerCase().replace(/\s+/g, '_')}`;
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('🎯 TMDB cache hit:', query);
    return cached;
  }

  try {
    const response = await fetch('/api/entertainment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.hasEntity && data.entity) {
        // Save to cache
        saveToCache(cacheKey, data.entity);
        return data.entity;
      }
    }
    return null;
  } catch (error) {
    console.error('Error prefetching entertainment data:', error);
    return null;
  }
}
