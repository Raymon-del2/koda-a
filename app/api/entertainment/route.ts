import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const TMDB_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Initialize Groq for entity extraction
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

// Fallback: Simple keyword-based extraction when Groq API fails
function fallbackExtractEntity(message: string): { hasEntity: boolean; type?: 'movie' | 'tv' | 'person'; query?: string; confidence?: number } {
  const lower = message.toLowerCase();
  
  // Simple pattern: "Tell me about X" or "What is X"
  const aboutMatch = message.match(/(?:tell me about|what is|who is)\s+(.+?)(?:\?|$|\.)/i);
  if (aboutMatch) {
    const query = aboutMatch[1].trim();
    return {
      hasEntity: true,
      type: 'movie', // Default to movie, TMDB search will find it
      query: query,
      confidence: 0.6
    };
  }
  
  return { hasEntity: false };
}

// Entity extraction prompt
const ENTITY_EXTRACTION_PROMPT = `You are an Entertainment Entity Extractor. Analyze the user's message and extract any movie, TV show, or actor mentions.

Rules:
1. Only extract if the user is clearly asking about entertainment (movies, TV shows, actors)
2. Determine the entity type: "movie", "tv", or "person"
3. Clean the query - remove extra words like "who played", "tell me about", etc.

Output JSON format:
{
  "hasEntity": true/false,
  "type": "movie" | "tv" | "person" | null,
  "query": "cleaned search query",
  "confidence": 0.0-1.0
}

Examples:
User: "Who played Batman in The Dark Knight?" 
Output: {"hasEntity": true, "type": "movie", "query": "The Dark Knight", "confidence": 0.95}

User: "Tell me about Cillian Murphy"
Output: {"hasEntity": true, "type": "person", "query": "Cillian Murphy", "confidence": 0.95}

User: "What's the weather like?"
Output: {"hasEntity": false, "type": null, "query": null, "confidence": 0.0}

Respond ONLY with the JSON object, no other text.`;

interface TMDBEntity {
  id: number;
  type: 'movie' | 'tv' | 'person';
  title: string;
  overview: string;
  poster_path?: string;
  profile_path?: string;
  rating?: number;
  release_date?: string;
  first_air_date?: string;
  known_for?: Array<{
    id: number;
    title?: string;
    name?: string;
    poster_path?: string;
  }>;
}

async function extractEntity(userMessage: string): Promise<{ hasEntity: boolean; type?: 'movie' | 'tv' | 'person'; query?: string; confidence?: number }> {
  try {
    const result = await generateText({
      model: groq.languageModel('llama-3.1-8b-instant'),
      system: ENTITY_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.1,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    return { hasEntity: false };
  } catch (error) {
    console.error('Entity extraction error:', error);
    // Fallback to keyword-based extraction when Groq fails
    console.log('🔄 Using fallback entity extraction');
    return fallbackExtractEntity(userMessage);
  }
}

async function fetchTMDBData(type: 'movie' | 'tv' | 'person', query: string): Promise<TMDBEntity | null> {
  try {
    // Search for the entity
    const searchUrl = `${TMDB_BASE_URL}/search/${type}`;
    const searchParams = new URLSearchParams({
      api_key: TMDB_KEY,
      query: query,
      language: 'en-US',
    });

    const searchRes = await fetch(`${searchUrl}?${searchParams}`);
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return null;
    }

    const topResult = searchData.results[0];
    const entityId = topResult.id;

    // Get detailed info
    const detailsUrl = `${TMDB_BASE_URL}/${type}/${entityId}`;
    const detailsParams = new URLSearchParams({
      api_key: TMDB_KEY,
      language: 'en-US',
    });

    if (type === 'person') {
      detailsParams.append('append_to_response', 'movie_credits');
    } else {
      detailsParams.append('append_to_response', 'videos,credits');
    }

    const detailsRes = await fetch(`${detailsUrl}?${detailsParams}`);
    const details = await detailsRes.json();

    // Build entity object
    const entity: TMDBEntity = {
      id: details.id,
      type: type,
      title: details.title || details.name,
      overview: details.overview || details.biography || '',
      rating: details.vote_average,
    };

    // Set appropriate image path
    if (type === 'person') {
      entity.profile_path = details.profile_path 
        ? `https://image.tmdb.org/t/p/h632${details.profile_path}`
        : undefined;
      entity.release_date = details.birthday;
      
      // Get known for movies
      if (details.movie_credits?.cast) {
        entity.known_for = details.movie_credits.cast
          .sort((a: any, b: any) => b.popularity - a.popularity)
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path 
              ? `https://image.tmdb.org/t/p/w92${m.poster_path}`
              : undefined,
          }));
      }
    } else {
      entity.poster_path = details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : undefined;
      entity.release_date = details.release_date || details.first_air_date;
    }

    return entity;
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Step 1: Extract entity from message
    console.log('🔍 Extracting entity from:', message);
    const extraction = await extractEntity(message);
    console.log('📋 Extraction result:', extraction);
    
    if (!extraction.hasEntity || !extraction.confidence || extraction.confidence < 0.7) {
      console.log('❌ Entity extraction failed or low confidence');
      return NextResponse.json({ hasEntity: false });
    }

    // Step 2: Fetch TMDB data
    const entity = await fetchTMDBData(extraction.type!, extraction.query!);

    if (!entity) {
      return NextResponse.json({ hasEntity: false });
    }

    return NextResponse.json({
      hasEntity: true,
      entity: entity,
    });
  } catch (error) {
    console.error('Entertainment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
