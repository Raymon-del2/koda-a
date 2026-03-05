/**
 * NewsAPI Search - Fetches real-time news articles
 * Free developer plan: 100 requests/day, articles with 24h delay
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string | null;
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  publishedAt: string;
}

export interface NewsSearchResult {
  success: boolean;
  articles: NewsArticle[];
  totalResults: number;
  error?: string;
}

const NEWS_API_KEY = '9a80f47dac094753935c8242f403caff';
const BASE_URL = 'https://newsapi.org/v2';

/**
 * Search for news articles
 */
export async function searchNews(
  query: string,
  pageSize: number = 5
): Promise<NewsSearchResult> {
  try {
    // Get date range (last 30 days for free tier)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    const url = `${BASE_URL}/everything?` + 
      `q=${encodeURIComponent(query)}&` +
      `from=${fromDate}&` +
      `to=${toDate}&` +
      `sortBy=publishedAt&` +
      `pageSize=${pageSize}&` +
      `apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'ok') {
      return {
        success: true,
        articles: data.articles.map((article: any, index: number) => ({
          id: `news-${index}-${Date.now()}`,
          title: article.title,
          description: article.description || '',
          content: article.content || '',
          url: article.url,
          urlToImage: article.urlToImage,
          source: article.source,
          author: article.author,
          publishedAt: article.publishedAt,
        })),
        totalResults: data.totalResults,
      };
    } else {
      return {
        success: false,
        articles: [],
        totalResults: 0,
        error: data.message || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('NewsAPI error:', error);
    return {
      success: false,
      articles: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch news',
    };
  }
}

/**
 * Get top headlines by category
 */
export async function getTopHeadlines(
  category?: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology',
  country: string = 'us',
  pageSize: number = 5
): Promise<NewsSearchResult> {
  try {
    let url = `${BASE_URL}/top-headlines?country=${country}&pageSize=${pageSize}&apiKey=${NEWS_API_KEY}`;
    
    if (category) {
      url += `&category=${category}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'ok') {
      return {
        success: true,
        articles: data.articles.map((article: any, index: number) => ({
          id: `headline-${index}-${Date.now()}`,
          title: article.title,
          description: article.description || '',
          content: article.content || '',
          url: article.url,
          urlToImage: article.urlToImage,
          source: article.source,
          author: article.author,
          publishedAt: article.publishedAt,
        })),
        totalResults: data.totalResults,
      };
    } else {
      return {
        success: false,
        articles: [],
        totalResults: 0,
        error: data.message || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('NewsAPI headlines error:', error);
    return {
      success: false,
      articles: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch headlines',
    };
  }
}

/**
 * Format news articles for context injection
 */
export function formatNewsForContext(articles: NewsArticle[]): string {
  if (articles.length === 0) return '';
  
  let context = '\n\n**RECENT NEWS ARTICLES:**\n';
  
  articles.forEach((article, i) => {
    const date = new Date(article.publishedAt).toLocaleDateString();
    context += `\n[${i + 1}] ${article.title}\n`;
    context += `Source: ${article.source.name} (${date})\n`;
    context += `${article.description}\n`;
    context += `URL: ${article.url}\n`;
  });
  
  return context;
}

/**
 * Detect if query is news-related
 */
export function isNewsQuery(query: string): boolean {
  const newsPatterns = [
    /\b(news|latest|recent|today|this week|breaking|headline)\b/i,
    /\b(what happened|what's happening|current events)\b/i,
    /\b(stock market|stocks|shares|trading|market crash)\b/i,
    /\b(politics|election|government|president|congress)\b/i,
    /\b(weather|forecast|storm|hurricane)\b/i,
    /\b(sports|game|score|match|tournament)\b/i,
    /\b(celebrity|actor|actress|singer|entertainment)\b/i,
  ];
  
  return newsPatterns.some(pattern => pattern.test(query));
}
