import { QdrantClient } from '@qdrant/js-client-rest';

// Qdrant Cloud configuration
const QDRANT_URL = process.env.QDRANT_URL || 'https://cfbea264-4259-432f-b479-7ecbb21e36d6.europe-west3-0.gcp.cloud.qdrant.io';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.vxDcVmUJFpFxNj1IXn64Rhso3nncYsArieuhU_PCgNc';

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// Collection names
export const COLLECTIONS = {
  KNOWLEDGE_BASE: 'koda_knowledge',
  CHAT_HISTORY: 'chat_history',
  USER_PROFILES: 'user_profiles',
  LEARNING_MATERIALS: 'learning_materials',
} as const;

/**
 * Initialize all required collections in Qdrant
 */
export async function initializeQdrantCollections() {
  try {
    const collections = await qdrantClient.getCollections();
    const existingCollections = collections.collections.map((c: { name: string }) => c.name);

    // Create knowledge_base collection
    if (!existingCollections.includes(COLLECTIONS.KNOWLEDGE_BASE)) {
      await qdrantClient.createCollection(COLLECTIONS.KNOWLEDGE_BASE, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log('✓ Created knowledge_base collection');
    }

    // Create chat_history collection
    if (!existingCollections.includes(COLLECTIONS.CHAT_HISTORY)) {
      await qdrantClient.createCollection(COLLECTIONS.CHAT_HISTORY, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log('✓ Created chat_history collection');
    }

    // Create user_profiles collection
    if (!existingCollections.includes(COLLECTIONS.USER_PROFILES)) {
      await qdrantClient.createCollection(COLLECTIONS.USER_PROFILES, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log('✓ Created user_profiles collection');
    }

    // Create learning_materials collection
    if (!existingCollections.includes(COLLECTIONS.LEARNING_MATERIALS)) {
      await qdrantClient.createCollection(COLLECTIONS.LEARNING_MATERIALS, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log('✓ Created learning_materials collection');
    }

    return true;
  } catch (error) {
    console.error('Error initializing Qdrant collections:', error);
    return false;
  }
}

/**
 * Add knowledge item to Qdrant
 */
export async function addKnowledgeItem(
  id: string,
  content: string,
  vector: number[],
  metadata: {
    title: string;
    category?: string;
    tags?: string[];
    source?: string;
    timestamp?: number;
    // Parent-child chunking metadata
    parentContent?: string;
    headings?: string[];
    chunkIndex?: number;
    totalChunks?: number;
  }
) {
  try {
    await qdrantClient.upsert(COLLECTIONS.KNOWLEDGE_BASE, {
      points: [
        {
          id,
          vector,
          payload: {
            content,
            ...metadata,
          },
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('✗ Failed to add knowledge:', error);
    throw error;
  }
}

/**
 * Search knowledge base with optional category filter
 */
export async function searchKnowledge(
  queryVector: number[],
  limit: number = 5,
  category?: string
) {
  try {
    const filter = category
      ? {
          must: [
            {
              key: 'category',
              match: { value: category },
            },
          ],
        }
      : undefined;

    const results = await qdrantClient.search(COLLECTIONS.KNOWLEDGE_BASE, {
      vector: queryVector,
      limit,
      filter,
      with_payload: true,
    });

    return results.map((hit: any) => ({
      id: hit.id,
      title: hit.payload?.title || 'Untitled',
      content: hit.payload?.content || '',
      parentContent: hit.payload?.parentContent || '',
      category: hit.payload?.category || 'general',
      source: hit.payload?.source || '',
      headings: hit.payload?.headings || [],
      score: hit.score || 0,
    }));
  } catch (error: any) {
    // If collection doesn't exist, return empty results
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.log('Knowledge base collection not found, returning empty results');
      return [];
    }
    console.error('✗ Failed to search knowledge:', error);
    return [];
  }
}

/**
 * Delete knowledge item from Qdrant
 */
export async function deleteKnowledgeItem(id: string) {
  try {
    await qdrantClient.delete(COLLECTIONS.KNOWLEDGE_BASE, {
      points: [id],
    });
    return true;
  } catch (error) {
    console.error('✗ Failed to delete knowledge:', error);
    throw error;
  }
}

/**
 * Add chat message/history to Qdrant for long-term memory
 */
export async function addChatHistory(
  id: string,
  userId: string,
  chatId: string,
  content: string,
  vector: number[],
  metadata: {
    role: 'user' | 'assistant';
    messageIndex: number;
    isSummary?: boolean;
  }
) {
  try {
    await qdrantClient.upsert(COLLECTIONS.CHAT_HISTORY, {
      points: [
        {
          id,
          vector,
          payload: {
            user_id: userId,
            chat_id: chatId,
            content,
            ...metadata,
            timestamp: Date.now(),
          },
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('✗ Failed to add chat history:', error);
    throw error;
  }
}

/**
 * Search user's chat history
 */
export async function searchChatHistory(
  userId: string,
  queryVector: number[],
  limit: number = 10,
  chatId?: string
) {
  try {
    const mustConditions: any[] = [
      {
        key: 'user_id',
        match: { value: userId },
      },
    ];

    if (chatId) {
      mustConditions.push({
        key: 'chat_id',
        match: { value: chatId },
      });
    }

    const results = await qdrantClient.search(COLLECTIONS.CHAT_HISTORY, {
      vector: queryVector,
      limit,
      filter: { must: mustConditions },
      with_payload: true,
    });

    return results.map((hit: any) => ({
      id: hit.id,
      chatId: hit.payload?.chat_id,
      content: hit.payload?.content || '',
      role: hit.payload?.role,
      messageIndex: hit.payload?.messageIndex,
      isSummary: hit.payload?.isSummary || false,
      timestamp: hit.payload?.timestamp,
      score: hit.score || 0,
    }));
  } catch (error: any) {
    // If collection doesn't exist, return empty results
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.log('Chat history collection not found, returning empty results');
      return [];
    }
    console.error('✗ Failed to search chat history:', error);
    return [];
  }
}

/**
 * Add user fact/profile to Qdrant for personalization
 */
export async function addUserFact(
  id: string,
  userId: string,
  fact: string,
  vector: number[],
  metadata: {
    category?: string;
    confidence?: number;
    extractedFrom?: string;
    qualityScore?: number;
  }
) {
  try {
    await qdrantClient.upsert(COLLECTIONS.USER_PROFILES, {
      points: [
        {
          id,
          vector,
          payload: {
            user_id: userId,
            fact,
            ...metadata,
            timestamp: Date.now(),
          },
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('✗ Failed to add user fact:', error);
    throw error;
  }
}

/**
 * Search user's facts/preferences
 */
export async function searchUserFacts(
  userId: string,
  queryVector: number[],
  limit: number = 5,
  category?: string
) {
  try {
    const mustConditions: any[] = [
      {
        key: 'user_id',
        match: { value: userId },
      },
    ];

    if (category) {
      mustConditions.push({
        key: 'category',
        match: { value: category },
      });
    }

    const results = await qdrantClient.search(COLLECTIONS.USER_PROFILES, {
      vector: queryVector,
      limit,
      filter: { must: mustConditions },
      with_payload: true,
    });

    return results.map((hit: any) => ({
      id: hit.id,
      fact: hit.payload?.fact || '',
      category: hit.payload?.category || 'general',
      confidence: hit.payload?.confidence || 0.5,
      extractedFrom: hit.payload?.extractedFrom || '',
      timestamp: hit.payload?.timestamp,
      score: hit.score || 0,
    }));
  } catch (error: any) {
    // If collection doesn't exist, return empty results
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.log('User profiles collection not found, returning empty results');
      return [];
    }
    console.error('✗ Failed to search user facts:', error);
    return [];
  }
}

/**
 * Add learning material to Qdrant
 */
export async function addLearningMaterial(
  id: string,
  userId: string,
  topic: string,
  content: string,
  vector: number[],
  metadata: {
    level?: string;
    videos?: any[];
    sources?: any[];
    pdfUrl?: string;
  }
) {
  try {
    await qdrantClient.upsert(COLLECTIONS.LEARNING_MATERIALS, {
      points: [
        {
          id,
          vector,
          payload: {
            user_id: userId,
            topic,
            content,
            ...metadata,
            timestamp: Date.now(),
          },
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('✗ Failed to add learning material:', error);
    throw error;
  }
}

/**
 * Search user's learning materials
 */
export async function searchLearningMaterials(
  userId: string,
  queryVector: number[],
  limit: number = 10
) {
  try {
    const results = await qdrantClient.search(COLLECTIONS.LEARNING_MATERIALS, {
      vector: queryVector,
      limit,
      filter: {
        must: [
          {
            key: 'user_id',
            match: { value: userId },
          },
        ],
      },
      with_payload: true,
    });

    return results.map((hit: any) => ({
      id: hit.id,
      topic: hit.payload?.topic || '',
      content: hit.payload?.content || '',
      level: hit.payload?.level || 'intermediate',
      videos: hit.payload?.videos || [],
      sources: hit.payload?.sources || [],
      pdfUrl: hit.payload?.pdfUrl || '',
      timestamp: hit.payload?.timestamp,
      score: hit.score || 0,
    }));
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes('Not Found')) {
      console.log('Learning materials collection not found, returning empty results');
      return [];
    }
    console.error('✗ Failed to search learning materials:', error);
    return [];
  }
}

/**
 * Get all learning materials for a user
 */
export async function getUserLearningMaterials(userId: string, limit: number = 50) {
  try {
    const results = await qdrantClient.scroll(COLLECTIONS.LEARNING_MATERIALS, {
      filter: {
        must: [
          {
            key: 'user_id',
            match: { value: userId },
          },
        ],
      },
      limit,
      with_payload: true,
    });

    return results.points.map((hit: any) => ({
      id: hit.id,
      topic: hit.payload?.topic || '',
      content: hit.payload?.content || '',
      level: hit.payload?.level || 'intermediate',
      videos: hit.payload?.videos || [],
      sources: hit.payload?.sources || [],
      pdfUrl: hit.payload?.pdfUrl || '',
      timestamp: hit.payload?.timestamp,
    }));
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes('Not Found')) {
      return [];
    }
    console.error('✗ Failed to get learning materials:', error);
    return [];
  }
}

// Export for backward compatibility
export const KNOWLEDGE_COLLECTION = COLLECTIONS.KNOWLEDGE_BASE;

// Initialize knowledge collection
export async function initKnowledgeCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const existingCollections = collections.collections.map((c: { name: string }) => c.name);
    
    if (!existingCollections.includes(COLLECTIONS.KNOWLEDGE_BASE)) {
      await qdrantClient.createCollection(COLLECTIONS.KNOWLEDGE_BASE, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
      });
      console.log('✓ Created knowledge_base collection');
    }
    return true;
  } catch (error) {
    console.error('Error initializing knowledge collection:', error);
    return false;
  }
}
