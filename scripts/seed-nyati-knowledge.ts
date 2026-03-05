import { qdrantClient, COLLECTIONS, addKnowledgeItem } from '../lib/qdrant';
import { generateEmbeddingWithRetry } from '../lib/embeddings';

// Comprehensive knowledge base for Nyati-Core01
const NYATI_KNOWLEDGE_BASE = [
  {
    title: "Next.js 14+ App Router Complete Patterns",
    content: `Next.js 14+ App Router Advanced Patterns:

1. Parallel Routes (@folder): Load multiple pages simultaneously in the same layout
   Example: @analytics and @team shown side by side

2. Intercepting Routes ((.)folder): Show modal instead of navigating
   Example: Photo feed with modal view - (.)photo/[id] intercepts photo/[id]

3. Route Groups (folder): Organize without affecting URL
   Example: (marketing)/about and (shop)/products both at root level

4. Server Components by Default:
   - fetch() is automatically cached and deduplicated
   - Direct database queries without API layer
   - Streaming with suspense boundaries

5. Server Actions:
   'use server' functions called directly from components
   No API routes needed for form submissions
   Automatic progressive enhancement

6. Middleware Patterns:
   - Authentication checks at edge
   - A/B testing with cookies
   - Geolocation-based redirects
   - Rate limiting

7. Caching Strategies:
   - fetch({ next: { revalidate: 3600 } }) - ISR
   - export const dynamic = 'force-dynamic' - no cache
   - export const revalidate = 0 - opt out
   - unstable_cache for function memoization`,
    category: "programming",
    tags: ["nextjs", "react", "app-router", "patterns"],
  },
  {
    title: "React Server Components Architecture",
    content: `React Server Components (RSC) Architecture:

SERVER COMPONENTS (Default in Next.js App Router):
- Run exclusively on the server
- Can access databases, filesystem, APIs directly
- Zero client-side JavaScript bundle
- Can render async - fetch data without useEffect
- Cannot use hooks (useState, useEffect)
- Cannot use browser APIs (window, document)

CLIENT COMPONENTS ('use client'):
- Run in browser with full React features
- Can use all hooks and browser APIs
- Interactive UI, event handlers
- Must explicitly opt-in with 'use client'

BOUNDARY PATTERNS:
1. Server component fetches data and passes to client component via props
2. Client component wrapped in Suspense for loading states
3. Server Action called from client component for mutations
4. Context providers should be client components at root

PERFORMANCE OPTIMIZATION:
- Keep client components as leaf nodes
- Move data fetching to server components
- Use React.cache for deduplication
- Streaming with Suspense boundaries`,
    category: "programming",
    tags: ["react", "server-components", "architecture", "performance"],
  },
  {
    title: "TypeScript Advanced Patterns and Best Practices",
    content: `TypeScript Advanced Patterns:

CONDITIONAL TYPES:
type IsString<T> = T extends string ? true : false;
type Result = IsString<"hello">; // true

MAPPED TYPES WITH KEY REMAPPING:
type Getters<T> = {
  [K in keyof T as string]: () => T[K]
};

TYPE INFERENCE UTILITIES:
- ReturnType<T>: Extract return type of function
- Parameters<T>: Extract parameter types as tuple
- Awaited<T>: Unwrap Promise type
- DeepPartial<T>: Make all properties optional recursively

BRANDED TYPES for Type Safety:
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };
function getUser(id: UserId) {} // Cannot accidentally pass PostId

FUNCTION OVERLOADS:
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: string): HTMLElement;

CONST ASSERTIONS:
const config = { api: 'http://localhost' } as const;
// Makes all properties readonly and literals`,
    category: "programming",
    tags: ["typescript", "advanced", "patterns", "types"],
  },
  {
    title: "Transformer Architecture Deep Dive",
    content: `Transformer Architecture (Attention Is All You Need):

CORE COMPONENTS:
1. Multi-Head Self-Attention:
   - Scaled Dot-Product Attention formula
   - Multiple attention heads capture different representation subspaces
   - Query, Key, Value matrices learned during training

2. Position-wise Feed-Forward Networks:
   - FFN(x) = max(0, xW1 + b1)W2 + b2 (ReLU activation)
   - Applied independently to each position

3. Positional Encoding:
   - Sinusoidal encoding
   - Allows model to learn relative positions

4. Layer Normalization:
   - Applied before each sub-layer (Pre-LN) or after (Post-LN)
   - Stabilizes training of deep networks

ATTENTION MASKING:
- Encoder: No masking (bidirectional)
- Decoder: Causal masking (autoregressive)
- Padding mask: Ignore pad tokens

MODERN VARIANTS:
- RoPE (Rotary Position Embedding): Better long-sequence handling
- ALiBi: Linear biases for extrapolation
- Flash Attention: Memory-efficient exact attention

SCALING LAWS:
Performance scales with parameters, data, and compute following power laws`,
    category: "ai-ml",
    tags: ["transformers", "attention", "llm", "architecture"],
  },
  {
    title: "RAG - Retrieval Augmented Generation Best Practices",
    content: `RAG Implementation Best Practices:

CHUNKING STRATEGIES:
1. Fixed-size chunking: Simple, may break semantic boundaries
2. Semantic chunking: Use sentence boundaries, paragraphs
3. Hierarchical chunking: Parent document + child chunks
4. Overlapping chunks: Context preservation between chunks

EMBEDDING MODELS:
- text-embedding-ada-002: Good general purpose
- text-embedding-3-large: Best quality, 3072 dimensions
- all-MiniLM-L6-v2: Fast, local inference
- E5 models: Specifically trained for retrieval

RETRIEVAL TECHNIQUES:
1. Dense retrieval: Vector similarity search
2. Sparse retrieval: BM25, TF-IDF for keyword matching
3. Hybrid: Combine dense + sparse scores
4. Reranking: Cross-encoder for precision (ColBERT, cohere-rerank)

QUERY TRANSFORMATION:
- HyDE (Hypothetical Document Embedding): Generate fake answer, then retrieve
- Query expansion: Add related terms
- Step-back prompting: Abstract to higher-level query

ADVANCED RAG:
- Self-RAG: LLM decides when to retrieve
- Corrective RAG: Verify retrieved content relevance
- GraphRAG: Knowledge graph-based retrieval
- Multi-hop: Chain multiple retrievals for complex queries

EVALUATION METRICS:
- Context Precision: Relevant chunks in top-k
- Context Recall: Ground truth covered by chunks
- Answer Relevance: Generated answer matches query
- Faithfulness: Answer supported by context`,
    category: "ai-ml",
    tags: ["rag", "retrieval", "llm", "vector-search", "embeddings"],
  },
  {
    title: "Microservices Design Patterns",
    content: `Microservices Design Patterns:

COMMUNICATION PATTERNS:
1. Synchronous (REST/gRPC):
   - Request-response, immediate feedback
   - Circuit breaker pattern for fault tolerance
   - Timeout and retry policies

2. Asynchronous (Message Queue):
   - Event-driven with Kafka, RabbitMQ, SQS
   - Saga pattern for distributed transactions
   - Outbox pattern for reliable publishing

DATA MANAGEMENT:
1. Database per Service:
   - Each service owns its data
   - No shared databases
   - CQRS for read/write separation

2. Event Sourcing:
   - Store state changes as events
   - Replay events to reconstruct state
   - Event store as source of truth

3. Saga Pattern:
   - Choreography: Services react to events
   - Orchestration: Central coordinator manages flow
   - Compensating transactions for rollback

SERVICE DISCOVERY:
- Client-side: Service mesh (Istio, Linkerd)
- Server-side: Consul, Eureka, Kubernetes DNS
- Health checks and load balancing

API GATEWAY:
- Single entry point for clients
- Authentication, rate limiting
- Request/response transformation
- Protocol translation (REST to gRPC)

DEPLOYMENT STRATEGIES:
- Blue-green: Zero downtime switch
- Canary: Gradual rollout with monitoring
- Feature flags: Runtime feature toggling`,
    category: "system-design",
    tags: ["microservices", "patterns", "architecture", "distributed-systems"],
  },
  {
    title: "Database Design and Optimization",
    content: `Database Design Principles:

NORMALIZATION:
- 1NF: Atomic values, no repeating groups
- 2NF: 1NF + no partial dependencies
- 3NF: 2NF + no transitive dependencies
- Denormalize for read-heavy workloads

INDEXING STRATEGIES:
1. B-Tree indexes: Range queries, sorting
2. Hash indexes: Equality lookups only
3. GIN indexes: Full-text search, JSON
4. GiST indexes: Geospatial, custom types
5. Partial indexes: Filtered subset for speed
6. Covering indexes: Include all queried columns

QUERY OPTIMIZATION:
- EXPLAIN ANALYZE to understand execution plan
- Avoid SELECT star, fetch only needed columns
- Use JOINs over subqueries when possible
- Batch inserts/updates
- Connection pooling (PgBouncer)

SCALING APPROACHES:
1. Vertical: Bigger instance (limited)
2. Read Replicas: Offload read traffic
3. Sharding: Partition data across servers
4. CQRS: Separate read and write models

NOSQL PATTERNS:
- DynamoDB: Single-table design, composite keys
- MongoDB: Document embedding vs referencing
- Cassandra: Wide-column, partition key design
- Redis: Caching strategies, data structures

CONSISTENCY MODELS:
- ACID: Strong consistency, transactions
- BASE: Eventual consistency, availability
- CAP theorem: Choose 2 of Consistency, Availability, Partition tolerance`,
    category: "system-design",
    tags: ["database", "sql", "nosql", "optimization", "indexing"],
  },
  {
    title: "Modern CSS Architecture and Patterns",
    content: `Modern CSS Architecture:

UTILITY-FIRST (Tailwind):
- Single-purpose classes: flex, pt-4, text-center
- Configuration-driven design system
- Purge unused styles in production
- JIT compiler for arbitrary values
- Component extraction with @apply

CSS ARCHITECTURE METHODOLOGIES:
1. BEM (Block Element Modifier):
   .button { } .button__icon { } .button--primary { }

2. ITCSS (Inverted Triangle):
   Settings to Tools to Generic to Elements to Objects to Components to Trumps

3. CUBE CSS:
   Composition + Utility + Block + Exception

CSS VARIABLES (Custom Properties):
Define colors and spacing as variables for consistency

MODERN CSS FEATURES:
- Container queries: Style based on container width
- :has() selector: Parent selection
- Cascade layers: @layer for specificity control
- Subgrid: grid-template-columns: subgrid
- :is() and :where() for complex selectors

PERFORMANCE:
- Critical CSS inline for above-fold
- CSS containment: contain: layout paint
- will-change for animations
- content-visibility for off-screen

DARK MODE:
Use media queries or class-based approaches for theme switching`,
    category: "web-development",
    tags: ["css", "tailwind", "architecture", "frontend"],
  },
  {
    title: "Web Application Security Best Practices",
    content: `Web Security Fundamentals:

AUTHENTICATION:
- JWT: Stateless, short expiry, refresh tokens
- OAuth 2.0 / OpenID Connect: Standard authorization
- Password hashing: bcrypt, Argon2 (never MD5/SHA1)
- MFA: TOTP (Google Authenticator), WebAuthn (passkeys)

COMMON VULNERABILITIES:
1. XSS (Cross-Site Scripting):
   - Sanitize all user input
   - Content Security Policy headers
   - React/Vue automatically escape, but dangerouslySetInnerHTML is risky

2. CSRF (Cross-Site Request Forgery):
   - SameSite cookies
   - CSRF tokens for state-changing operations

3. SQL Injection:
   - Parameterized queries only
   - ORM abstraction layers
   - Never concatenate user input into SQL

4. SSRF (Server-Side Request Forgery):
   - Validate URLs before fetching
   - Whitelist allowed protocols/domains

SECURITY HEADERS:
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY (clickjacking)
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000

INPUT VALIDATION:
- Zod, Joi, Yup for schema validation
- Whitelist acceptable inputs
- Rate limiting on API endpoints
- File upload validation (type, size, scan)

SECRETS MANAGEMENT:
- Never commit .env files
- Use secret managers (AWS Secrets Manager, Doppler)
- Rotate credentials regularly`,
    category: "security",
    tags: ["security", "authentication", "vulnerabilities", "headers"],
  },
  {
    title: "Docker and Kubernetes Best Practices",
    content: `Docker Best Practices:

IMAGE OPTIMIZATION:
1. Multi-stage builds:
   FROM node:20 AS builder
   WORKDIR /app
   COPY . .
   RUN npm ci && npm run build
   
   FROM node:20-alpine AS runtime
   COPY --from=builder /app/dist ./dist
   CMD ["node", "dist/main.js"]

2. Layer caching:
   - Copy package.json first
   - RUN npm ci
   - Then copy source code

3. Alpine or Distroless base images:
   - Smaller attack surface
   - Reduced image size

4. .dockerignore:
   node_modules
   .git
   *.md
   .env

KUBERNETES PATTERNS:
1. Health Checks:
   - livenessProbe: Restart if failing
   - readinessProbe: Remove from service if not ready
   - startupProbe: For slow-starting apps

2. Resource Management:
   - requests: Minimum guaranteed resources
   - limits: Maximum allowed resources
   - HPA: Horizontal Pod Autoscaler

3. Config Management:
   - ConfigMaps: Non-sensitive configuration
   - Secrets: Sensitive data (base64 encoded)
   - Environment variables or mounted files

4. Deployment Strategies:
   - RollingUpdate: Gradual replacement
   - Recreate: Stop all, then start all
   - Blue-Green via Service selectors

5. Service Mesh:
   - Istio: Traffic management, security, observability
   - mTLS between services
   - Circuit breaking, retries

MONITORING:
- Prometheus + Grafana for metrics
- ELK/Loki for logs
- Jaeger/Zipkin for tracing
- PagerDuty/Opsgenie for alerting`,
    category: "devops",
    tags: ["docker", "kubernetes", "containers", "devops"],
  },
  {
    title: "Productivity and Development Workflow",
    content: `Developer Productivity:

CODE EDITORS:
- VS Code: Extensions ecosystem, IntelliSense, debugging
- Neovim: Speed, modal editing, Lua configuration
- JetBrains: Refactoring, code analysis, IDE features

VERSION CONTROL:
- Git flow: feature branches, develop, main
- Trunk-based: Short-lived branches, feature flags
- Conventional commits: feat, fix, docs, refactor
- Semantic versioning: MAJOR.MINOR.PATCH

TESTING STRATEGY:
1. Unit tests: Jest, Vitest - fast, isolated
2. Integration tests: Test database, API contracts
3. E2E tests: Playwright, Cypress - user flows
4. Test pyramid: 70% unit, 20% integration, 10% E2E

CI/CD PIPELINES:
- GitHub Actions: Workflows in .github/workflows/
- GitLab CI: .gitlab-ci.yml
- CircleCI, Travis, Jenkins

Steps: lint to test to build to security scan to deploy

DOCUMENTATION:
- README: What, why, how to use
- ADRs (Architecture Decision Records)
- API docs: OpenAPI/Swagger
- Code comments explain WHY, not WHAT

TIME MANAGEMENT:
- Pomodoro: 25 min focus, 5 min break
- Deep work: Block calendar for focused time
- Batching: Group similar tasks
- Two-minute rule: Do it now if under 2 min`,
    category: "general",
    tags: ["productivity", "workflow", "git", "testing"],
  },
];

// Seed the knowledge base
async function seedNyatiKnowledgeBase() {
  console.log('Seeding Nyati-Core01 Knowledge Base...');
  console.log(`Total knowledge items: ${NYATI_KNOWLEDGE_BASE.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < NYATI_KNOWLEDGE_BASE.length; i++) {
    const item = NYATI_KNOWLEDGE_BASE[i];
    
    try {
      // Generate embedding
      const embedding = await generateEmbeddingWithRetry(item.content);
      
      // Add to Qdrant
      await addKnowledgeItem(
        `nyati-core-${Date.now()}-${i}`,
        item.content,
        embedding,
        {
          title: item.title,
          category: item.category,
          tags: item.tags,
          source: 'nyati-core-seed',
          timestamp: Date.now(),
        }
      );
      
      console.log(`[${i + 1}/${NYATI_KNOWLEDGE_BASE.length}] ${item.title}`);
      successCount++;
    } catch (error) {
      console.error(`[${i + 1}/${NYATI_KNOWLEDGE_BASE.length}] Failed: ${item.title}`);
      console.error(error);
      errorCount++;
    }
  }
  
  console.log('\nSeeding Complete:');
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('\nNyati-Core01 now has enhanced knowledge!');
  process.exit(0);
}

// Run if executed directly
seedNyatiKnowledgeBase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { seedNyatiKnowledgeBase, NYATI_KNOWLEDGE_BASE };
