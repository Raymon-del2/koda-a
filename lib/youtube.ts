/**
 * YouTube Data API Integration
 * Search for videos and display as cards
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: string;
}

/**
 * Search YouTube for videos
 */
export async function searchYouTube(
  query: string,
  maxResults: number = 2
): Promise<YouTubeVideo[]> {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      key: YOUTUBE_API_KEY || '',
      order: 'relevance',
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    // Get video IDs for statistics
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    
    // Fetch statistics for view counts
    const statsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );
    
    const statsData = statsResponse.ok ? await statsResponse.json() : { items: [] };
    const statsMap = new Map<string, { viewCount?: string }>(
      statsData.items?.map((item: any) => [item.id, item.statistics]) || []
    );

    return data.items.map((item: any) => {
      const stats = statsMap.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: stats?.viewCount,
      };
    });
  } catch (error) {
    console.error('✗ YouTube search failed:', error);
    return [];
  }
}

/**
 * Format view count for display
 */
export function formatViewCount(count?: string): string {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return count;
}

/**
 * Format published date
 */
export function formatPublishedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
