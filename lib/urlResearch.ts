/**
 * URL Research Pipeline
 * Crawls URLs, converts to Markdown, and chunks with parent-child strategy
 */

import { generateEmbeddingWithRetry } from "./embeddings";
import { addKnowledgeItem } from "./qdrant";

interface CrawlResult {
  url: string;
  title: string;
  markdown: string;
  headings: string[];
  timestamp: number;
}

interface Chunk {
  id: string;
  content: string;
  parentContent: string;
  headings: string[];
  url: string;
  title: string;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Crawl a URL and convert to Markdown using Firecrawl API
 */
export async function crawlUrl(url: string): Promise<CrawlResult | null> {
  try {
    // Using Firecrawl API (free tier available)
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY || ''}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data?.markdown) {
      // Extract headings for context
      const headings = extractHeadings(data.data.markdown);
      
      return {
        url,
        title: data.data.title || url,
        markdown: data.data.markdown,
        headings,
        timestamp: Date.now(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('✗ Failed to crawl URL:', url, error);
    return null;
  }
}

/**
 * Extract headings from markdown for metadata
 */
function extractHeadings(markdown: string): string[] {
  const headings: string[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      headings.push(match[2].trim());
    }
  }
  
  return headings;
}

/**
 * Parent-Child Chunking Strategy
 * 
 * Child Chunks: Small sentences (300-500 tokens) for high-precision search
 * Parent Chunks: Larger sections (2000 tokens) for AI context
 */
export function chunkContent(
  markdown: string,
  url: string,
  title: string,
  childSize: number = 400,
  parentSize: number = 2000
): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Split into paragraphs first
  const paragraphs = markdown
    .split('\n\n')
    .filter(p => p.trim().length > 0);
  
  // Build parent sections
  const parentSections: string[] = [];
  let currentSection = '';
  
  for (const para of paragraphs) {
    if (currentSection.length + para.length > parentSize && currentSection.length > 0) {
      parentSections.push(currentSection.trim());
      currentSection = para;
    } else {
      currentSection += '\n\n' + para;
    }
  }
  
  if (currentSection.trim().length > 0) {
    parentSections.push(currentSection.trim());
  }
  
  // Create child chunks within each parent
  let globalChunkIndex = 0;
  const totalChunks = Math.ceil(markdown.length / childSize);
  
  for (const parentContent of parentSections) {
    // Split parent into child-sized chunks
    const sentences = parentContent
      .replace(/([.!?])\s+/g, "$1\n")
      .split('\n')
      .filter(s => s.trim().length > 0);
    
    let childContent = '';
    
    for (const sentence of sentences) {
      if (childContent.length + sentence.length > childSize && childContent.length > 0) {
        const headings = extractHeadings(parentContent);
        
        chunks.push({
          id: `${url.replace(/[^a-zA-Z0-9]/g, '_')}_${globalChunkIndex}`,
          content: childContent.trim(),
          parentContent: parentContent,
          headings,
          url,
          title,
          chunkIndex: globalChunkIndex,
          totalChunks,
        });
        
        globalChunkIndex++;
        childContent = sentence;
      } else {
        childContent += ' ' + sentence;
      }
    }
    
    // Add remaining content
    if (childContent.trim().length > 0) {
      const headings = extractHeadings(parentContent);
      
      chunks.push({
        id: `${url.replace(/[^a-zA-Z0-9]/g, '_')}_${globalChunkIndex}`,
        content: childContent.trim(),
        parentContent: parentContent,
        headings,
        url,
        title,
        chunkIndex: globalChunkIndex,
        totalChunks,
      });
      
      globalChunkIndex++;
    }
  }
  
  return chunks;
}

/**
 * Ingest a URL into the knowledge base
 */
export async function ingestUrl(url: string, category: string = 'documentation') {
  console.log(`🔍 Ingesting URL: ${url}`);
  
  try {
    // 1. Crawl the URL
    const crawlResult = await crawlUrl(url);
    if (!crawlResult) {
      console.error('✗ Failed to crawl:', url);
      return false;
    }
    
    console.log(`✓ Crawled: ${crawlResult.title} (${crawlResult.markdown.length} chars)`);
    
    // 2. Chunk with parent-child strategy
    const chunks = chunkContent(
      crawlResult.markdown,
      crawlResult.url,
      crawlResult.title
    );
    
    console.log(`✓ Created ${chunks.length} chunks`);
    
    // 3. Generate embeddings and store in Qdrant
    for (const chunk of chunks) {
      try {
        // Generate embedding for child chunk
        const embedding = await generateEmbeddingWithRetry(chunk.content);
        
        // Store in Qdrant with rich metadata
        await addKnowledgeItem(
          chunk.id,
          chunk.content,
          embedding,
          {
            title: chunk.title,
            category,
            source: chunk.url,
            tags: chunk.headings,
            timestamp: crawlResult.timestamp,
            // Additional metadata for citations
            parentContent: chunk.parentContent.slice(0, 2000), // Store parent context
            headings: chunk.headings,
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
          }
        );
      } catch (error) {
        console.error(`✗ Failed to store chunk ${chunk.id}:`, error);
      }
    }
    
    console.log(`✓ Successfully ingested ${url} with ${chunks.length} chunks`);
    return true;
  } catch (error) {
    console.error('✗ Failed to ingest URL:', url, error);
    return false;
  }
}

/**
 * Batch ingest multiple URLs
 */
export async function ingestUrls(urls: string[], category: string = 'documentation') {
  const results = [];
  
  for (const url of urls) {
    const success = await ingestUrl(url, category);
    results.push({ url, success });
    
    // Rate limiting - be nice to the APIs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Generate hypothetical questions for HyDE (Hypothetical Document Embeddings)
 * This improves retrieval by matching questions to potential answers
 */
export async function generateHypotheticalQuestions(content: string): Promise<string[]> {
  // Simple heuristic: extract sentences that look like questions
  const questions: string[] = [];
  const sentences = content.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.toLowerCase().startsWith('how') ||
        trimmed.toLowerCase().startsWith('what') ||
        trimmed.toLowerCase().startsWith('why') ||
        trimmed.toLowerCase().startsWith('when') ||
        trimmed.toLowerCase().includes('?')) {
      questions.push(trimmed);
    }
  }
  
  return questions.slice(0, 5); // Top 5 questions
}
