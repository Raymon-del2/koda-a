import { NextResponse } from 'next/server';
import { ingestUrl } from '@/lib/urlResearch';

export async function POST(req: Request) {
  try {
    const { url, category = 'documentation' } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log(`🌐 Ingesting URL: ${url}`);
    const success = await ingestUrl(url, category);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully ingested ${url}`,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to ingest URL' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('✗ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
