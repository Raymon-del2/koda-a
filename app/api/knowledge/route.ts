import { qdrantClient, KNOWLEDGE_COLLECTION, searchKnowledge, initKnowledgeCollection } from '../../../lib/qdrant';

// Simple embedding using Hugging Face Inference API
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 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',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    throw new Error('Failed to create embedding');
  }

  const embedding = await response.json();
  return embedding[0];
}

export async function POST(req: Request) {
  try {
    const { query, category, limit = 5 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create embedding for the query
    const queryVector = await createEmbedding(query);

    // Search Qdrant
    const results = await searchKnowledge(queryVector, limit, category);

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Knowledge search error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search knowledge base' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Initialize collection on first request
export async function GET() {
  try {
    await initKnowledgeCollection();
    return new Response(
      JSON.stringify({ 
        message: 'Knowledge collection ready',
        collection: KNOWLEDGE_COLLECTION 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Init error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to initialize' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
