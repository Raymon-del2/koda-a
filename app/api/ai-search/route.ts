/**
 * AI Search API Route
 * 
 * Provides intelligent resource search with:
 * - Semantic search via embeddings
 * - Hybrid search (vector + keyword)
 * - Multi-source aggregation
 * - Developer recommendations
 */

import { NextResponse } from 'next/server';
import { aiSearch, type SearchParams, type SearchResult } from '@/lib/ai-search';
import { performSecurityCheck } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      query,
      userId,
      mode = 'hybrid',
      skillLevel = 'beginner',
      category,
      ageRating = '13+',
      limit = 10,
      includeLive = true,
      includeDevRecommendations = true,
    } = body;

    // Validate inputs
    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, userId' },
        { status: 400 }
      );
    }

    // Security check
    const security = performSecurityCheck(query, userId, true);
    if (!security.passed) {
      return NextResponse.json(
        { error: security.message },
        { status: 403 }
      );
    }

    // Perform AI search
    const searchParams: SearchParams = {
      query,
      userId,
      mode,
      skillLevel,
      category,
      ageRating,
      limit,
      includeLive,
      includeDevRecommendations,
    };

    const result: SearchResult = await aiSearch(searchParams);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    const mode = (searchParams.get('mode') as any) || 'hybrid';
    const skillLevel = (searchParams.get('skillLevel') as any) || 'beginner';
    const category = searchParams.get('category') as any;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: q, userId' },
        { status: 400 }
      );
    }

    // Security check
    const security = performSecurityCheck(query, userId, true);
    if (!security.passed) {
      return NextResponse.json(
        { error: security.message },
        { status: 403 }
      );
    }

    const searchParamsObj: SearchParams = {
      query,
      userId,
      mode,
      skillLevel,
      category,
      limit,
    };

    const result = await aiSearch(searchParamsObj);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('AI search GET error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
