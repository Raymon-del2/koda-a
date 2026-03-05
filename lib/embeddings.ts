/**
 * Generate embeddings using a simple hash-based approach as fallback
 * This creates deterministic pseudo-embeddings for text similarity
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Try OpenAI first if key is available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000), // OpenAI has token limits
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }
    }
    
    // Fallback: Generate deterministic pseudo-embedding
    return generatePseudoEmbedding(text);
  } catch (error) {
    console.error('✗ Failed to generate embedding:', error);
    return generatePseudoEmbedding(text);
  }
}

/**
 * Generate a deterministic pseudo-embedding from text
 * Uses simple hashing to create a 768-dim vector
 */
function generatePseudoEmbedding(text: string): number[] {
  const dimension = 768;
  const embedding: number[] = new Array(dimension).fill(0);
  
  // Simple hash-based embedding generation
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % dimension] += charCode / 255;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

/**
 * Generate embedding with retries for cold-start models
 */
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<number[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const embedding = await generateEmbedding(text);
      // Check if we got a valid embedding (not all zeros)
      if (embedding.some((v) => v !== 0)) {
        return embedding;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
  return new Array(768).fill(0);
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map((text) => generateEmbeddingWithRetry(text))
    );
    embeddings.push(...batchEmbeddings);
  }
  
  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
