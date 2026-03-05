module.exports = [
"[externals]/node:assert [external] (node:assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:assert", () => require("node:assert"));

module.exports = mod;
}),
"[externals]/node:http [external] (node:http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:http", () => require("node:http"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/node:net [external] (node:net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:net", () => require("node:net"));

module.exports = mod;
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[externals]/node:querystring [external] (node:querystring, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:querystring", () => require("node:querystring"));

module.exports = mod;
}),
"[externals]/node:events [external] (node:events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:events", () => require("node:events"));

module.exports = mod;
}),
"[externals]/node:zlib [external] (node:zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:zlib", () => require("node:zlib"));

module.exports = mod;
}),
"[externals]/node:perf_hooks [external] (node:perf_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:perf_hooks", () => require("node:perf_hooks"));

module.exports = mod;
}),
"[externals]/node:util/types [external] (node:util/types, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util/types", () => require("node:util/types"));

module.exports = mod;
}),
"[externals]/node:worker_threads [external] (node:worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:worker_threads", () => require("node:worker_threads"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:diagnostics_channel [external] (node:diagnostics_channel, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:diagnostics_channel", () => require("node:diagnostics_channel"));

module.exports = mod;
}),
"[externals]/node:tls [external] (node:tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:tls", () => require("node:tls"));

module.exports = mod;
}),
"[externals]/node:http2 [external] (node:http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:http2", () => require("node:http2"));

module.exports = mod;
}),
"[externals]/string_decoder [external] (string_decoder, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("string_decoder", () => require("string_decoder"));

module.exports = mod;
}),
"[externals]/node:url [external] (node:url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:url", () => require("node:url"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/node:console [external] (node:console, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:console", () => require("node:console"));

module.exports = mod;
}),
"[externals]/node:dns [external] (node:dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:dns", () => require("node:dns"));

module.exports = mod;
}),
"[project]/lib/qdrant.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "COLLECTIONS",
    ()=>COLLECTIONS,
    "KNOWLEDGE_COLLECTION",
    ()=>KNOWLEDGE_COLLECTION,
    "addChatHistory",
    ()=>addChatHistory,
    "addKnowledgeItem",
    ()=>addKnowledgeItem,
    "addLearningMaterial",
    ()=>addLearningMaterial,
    "addUserFact",
    ()=>addUserFact,
    "deleteKnowledgeItem",
    ()=>deleteKnowledgeItem,
    "getUserLearningMaterials",
    ()=>getUserLearningMaterials,
    "initKnowledgeCollection",
    ()=>initKnowledgeCollection,
    "initializeQdrantCollections",
    ()=>initializeQdrantCollections,
    "qdrantClient",
    ()=>qdrantClient,
    "searchChatHistory",
    ()=>searchChatHistory,
    "searchKnowledge",
    ()=>searchKnowledge,
    "searchLearningMaterials",
    ()=>searchLearningMaterials,
    "searchUserFacts",
    ()=>searchUserFacts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$qdrant$2f$js$2d$client$2d$rest$2f$dist$2f$esm$2f$qdrant$2d$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@qdrant/js-client-rest/dist/esm/qdrant-client.js [app-ssr] (ecmascript)");
;
// Qdrant Cloud configuration
const QDRANT_URL = process.env.QDRANT_URL || 'https://cfbea264-4259-432f-b479-7ecbb21e36d6.europe-west3-0.gcp.cloud.qdrant.io';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.vxDcVmUJFpFxNj1IXn64Rhso3nncYsArieuhU_PCgNc';
const qdrantClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$qdrant$2f$js$2d$client$2d$rest$2f$dist$2f$esm$2f$qdrant$2d$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QdrantClient"]({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY
});
const COLLECTIONS = {
    KNOWLEDGE_BASE: 'koda_knowledge',
    CHAT_HISTORY: 'chat_history',
    USER_PROFILES: 'user_profiles',
    LEARNING_MATERIALS: 'learning_materials'
};
async function initializeQdrantCollections() {
    try {
        const collections = await qdrantClient.getCollections();
        const existingCollections = collections.collections.map((c)=>c.name);
        // Create knowledge_base collection
        if (!existingCollections.includes(COLLECTIONS.KNOWLEDGE_BASE)) {
            await qdrantClient.createCollection(COLLECTIONS.KNOWLEDGE_BASE, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                }
            });
            console.log('✓ Created knowledge_base collection');
        }
        // Create chat_history collection
        if (!existingCollections.includes(COLLECTIONS.CHAT_HISTORY)) {
            await qdrantClient.createCollection(COLLECTIONS.CHAT_HISTORY, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                }
            });
            console.log('✓ Created chat_history collection');
        }
        // Create user_profiles collection
        if (!existingCollections.includes(COLLECTIONS.USER_PROFILES)) {
            await qdrantClient.createCollection(COLLECTIONS.USER_PROFILES, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                }
            });
            console.log('✓ Created user_profiles collection');
        }
        // Create learning_materials collection
        if (!existingCollections.includes(COLLECTIONS.LEARNING_MATERIALS)) {
            await qdrantClient.createCollection(COLLECTIONS.LEARNING_MATERIALS, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                }
            });
            console.log('✓ Created learning_materials collection');
        }
        return true;
    } catch (error) {
        console.error('Error initializing Qdrant collections:', error);
        return false;
    }
}
async function addKnowledgeItem(id, content, vector, metadata) {
    try {
        await qdrantClient.upsert(COLLECTIONS.KNOWLEDGE_BASE, {
            points: [
                {
                    id,
                    vector,
                    payload: {
                        content,
                        ...metadata
                    }
                }
            ]
        });
        return true;
    } catch (error) {
        console.error('✗ Failed to add knowledge:', error);
        throw error;
    }
}
async function searchKnowledge(queryVector, limit = 5, category) {
    try {
        const filter = category ? {
            must: [
                {
                    key: 'category',
                    match: {
                        value: category
                    }
                }
            ]
        } : undefined;
        const results = await qdrantClient.search(COLLECTIONS.KNOWLEDGE_BASE, {
            vector: queryVector,
            limit,
            filter,
            with_payload: true
        });
        return results.map((hit)=>({
                id: hit.id,
                title: hit.payload?.title || 'Untitled',
                content: hit.payload?.content || '',
                parentContent: hit.payload?.parentContent || '',
                category: hit.payload?.category || 'general',
                source: hit.payload?.source || '',
                headings: hit.payload?.headings || [],
                score: hit.score || 0
            }));
    } catch (error) {
        // If collection doesn't exist, return empty results
        if (error.status === 404 || error.message?.includes('Not Found')) {
            console.log('Knowledge base collection not found, returning empty results');
            return [];
        }
        console.error('✗ Failed to search knowledge:', error);
        return [];
    }
}
async function deleteKnowledgeItem(id) {
    try {
        await qdrantClient.delete(COLLECTIONS.KNOWLEDGE_BASE, {
            points: [
                id
            ]
        });
        return true;
    } catch (error) {
        console.error('✗ Failed to delete knowledge:', error);
        throw error;
    }
}
async function addChatHistory(id, userId, chatId, content, vector, metadata) {
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
                        timestamp: Date.now()
                    }
                }
            ]
        });
        return true;
    } catch (error) {
        console.error('✗ Failed to add chat history:', error);
        throw error;
    }
}
async function searchChatHistory(userId, queryVector, limit = 10, chatId) {
    try {
        const mustConditions = [
            {
                key: 'user_id',
                match: {
                    value: userId
                }
            }
        ];
        if (chatId) {
            mustConditions.push({
                key: 'chat_id',
                match: {
                    value: chatId
                }
            });
        }
        const results = await qdrantClient.search(COLLECTIONS.CHAT_HISTORY, {
            vector: queryVector,
            limit,
            filter: {
                must: mustConditions
            },
            with_payload: true
        });
        return results.map((hit)=>({
                id: hit.id,
                chatId: hit.payload?.chat_id,
                content: hit.payload?.content || '',
                role: hit.payload?.role,
                messageIndex: hit.payload?.messageIndex,
                isSummary: hit.payload?.isSummary || false,
                timestamp: hit.payload?.timestamp,
                score: hit.score || 0
            }));
    } catch (error) {
        // If collection doesn't exist, return empty results
        if (error.status === 404 || error.message?.includes('Not Found')) {
            console.log('Chat history collection not found, returning empty results');
            return [];
        }
        console.error('✗ Failed to search chat history:', error);
        return [];
    }
}
async function addUserFact(id, userId, fact, vector, metadata) {
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
                        timestamp: Date.now()
                    }
                }
            ]
        });
        return true;
    } catch (error) {
        console.error('✗ Failed to add user fact:', error);
        throw error;
    }
}
async function searchUserFacts(userId, queryVector, limit = 5, category) {
    try {
        const mustConditions = [
            {
                key: 'user_id',
                match: {
                    value: userId
                }
            }
        ];
        if (category) {
            mustConditions.push({
                key: 'category',
                match: {
                    value: category
                }
            });
        }
        const results = await qdrantClient.search(COLLECTIONS.USER_PROFILES, {
            vector: queryVector,
            limit,
            filter: {
                must: mustConditions
            },
            with_payload: true
        });
        return results.map((hit)=>({
                id: hit.id,
                fact: hit.payload?.fact || '',
                category: hit.payload?.category || 'general',
                confidence: hit.payload?.confidence || 0.5,
                extractedFrom: hit.payload?.extractedFrom || '',
                timestamp: hit.payload?.timestamp,
                score: hit.score || 0
            }));
    } catch (error) {
        // If collection doesn't exist, return empty results
        if (error.status === 404 || error.message?.includes('Not Found')) {
            console.log('User profiles collection not found, returning empty results');
            return [];
        }
        console.error('✗ Failed to search user facts:', error);
        return [];
    }
}
async function addLearningMaterial(id, userId, topic, content, vector, metadata) {
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
                        timestamp: Date.now()
                    }
                }
            ]
        });
        return true;
    } catch (error) {
        console.error('✗ Failed to add learning material:', error);
        throw error;
    }
}
async function searchLearningMaterials(userId, queryVector, limit = 10) {
    try {
        const results = await qdrantClient.search(COLLECTIONS.LEARNING_MATERIALS, {
            vector: queryVector,
            limit,
            filter: {
                must: [
                    {
                        key: 'user_id',
                        match: {
                            value: userId
                        }
                    }
                ]
            },
            with_payload: true
        });
        return results.map((hit)=>({
                id: hit.id,
                topic: hit.payload?.topic || '',
                content: hit.payload?.content || '',
                level: hit.payload?.level || 'intermediate',
                videos: hit.payload?.videos || [],
                sources: hit.payload?.sources || [],
                pdfUrl: hit.payload?.pdfUrl || '',
                timestamp: hit.payload?.timestamp,
                score: hit.score || 0
            }));
    } catch (error) {
        if (error.status === 404 || error.message?.includes('Not Found')) {
            console.log('Learning materials collection not found, returning empty results');
            return [];
        }
        console.error('✗ Failed to search learning materials:', error);
        return [];
    }
}
async function getUserLearningMaterials(userId, limit = 50) {
    try {
        const results = await qdrantClient.scroll(COLLECTIONS.LEARNING_MATERIALS, {
            filter: {
                must: [
                    {
                        key: 'user_id',
                        match: {
                            value: userId
                        }
                    }
                ]
            },
            limit,
            with_payload: true
        });
        return results.points.map((hit)=>({
                id: hit.id,
                topic: hit.payload?.topic || '',
                content: hit.payload?.content || '',
                level: hit.payload?.level || 'intermediate',
                videos: hit.payload?.videos || [],
                sources: hit.payload?.sources || [],
                pdfUrl: hit.payload?.pdfUrl || '',
                timestamp: hit.payload?.timestamp
            }));
    } catch (error) {
        if (error.status === 404 || error.message?.includes('Not Found')) {
            return [];
        }
        console.error('✗ Failed to get learning materials:', error);
        return [];
    }
}
const KNOWLEDGE_COLLECTION = COLLECTIONS.KNOWLEDGE_BASE;
async function initKnowledgeCollection() {
    try {
        const collections = await qdrantClient.getCollections();
        const existingCollections = collections.collections.map((c)=>c.name);
        if (!existingCollections.includes(COLLECTIONS.KNOWLEDGE_BASE)) {
            await qdrantClient.createCollection(COLLECTIONS.KNOWLEDGE_BASE, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                }
            });
            console.log('✓ Created knowledge_base collection');
        }
        return true;
    } catch (error) {
        console.error('Error initializing knowledge collection:', error);
        return false;
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__266b4c90._.js.map