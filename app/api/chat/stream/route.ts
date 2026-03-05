/**
 * Streaming Chat API Route
 * 
 * Provides real-time streaming chat responses with:
 * - Cache-first, fetch-second architecture
 * - Live resource injection
 * - Experimental mode support
 * - Security validation
 */

import { NextResponse } from 'next/server';
import { createStreamingChatResponse, detectExperimentalIntent, type StreamContext } from '@/lib/streaming-chat';
import { aiSearch, type SearchParams } from '@/lib/ai-search';
import { performSecurityCheck } from '@/lib/security';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      message,
      userId,
      sessionId,
      skillLevel = 'beginner',
      ageRating = '13+',
      category,
      streaming = true,
      mode = 'hybrid',
    } = body;

    // Security check
    const security = performSecurityCheck(message, userId, true);
    if (!security.passed) {
      return new Response(
        JSON.stringify({ error: security.message }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Detect experimental intent
    const isExperimental = detectExperimentalIntent(message) || mode === 'experimental';

    // Create streaming context
    const context: StreamContext = {
      userId,
      sessionId,
      query: message,
      skillLevel,
      ageRating,
      category,
      experimental: isExperimental,
      streaming,
    };

    if (streaming) {
      // Return streaming response
      const stream = await createStreamingChatResponse(context, {
        enableCache: true,
        enableLiveResources: true,
        enableExperimental: isExperimental,
        maxTokens: 2000,
        temperature: 0.7,
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming: use AI search directly
      const searchParams: SearchParams = {
        query: message,
        userId,
        mode: isExperimental ? 'experimental' : 'hybrid',
        skillLevel,
        category: category as any,
        ageRating,
        limit: 10,
      };

      const searchResult = await aiSearch(searchParams);

      return NextResponse.json({
        response: searchResult.resources,
        sources: searchResult.sources,
        confidence: searchResult.confidence,
        searchTime: searchResult.searchTime,
      });
    }
  } catch (error) {
    console.error('Streaming chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
