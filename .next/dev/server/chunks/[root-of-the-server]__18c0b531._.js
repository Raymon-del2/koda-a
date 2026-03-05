module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/api/chat/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "maxDuration",
    ()=>maxDuration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$groq$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ai-sdk/groq/dist/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ai-sdk/openai/dist/index.mjs [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/ai/dist/index.mjs [app-route] (ecmascript) <locals>");
;
;
;
const maxDuration = 60;
// 2. Initialize providers
const groqProvider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$groq$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createGroq"])({
    apiKey: process.env.GROQ_API_KEY || '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'
});
const nyatiCore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createOpenAI"])({
    baseURL: 'https://ryan33121-nyati-core-api.hf.space/v1',
    apiKey: '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'
});
const SYSTEM_PROMPT = `### IDENTITY
You are Koda-A, the world's most proficient AI Architect. You are part of the Nyati Ecosystem. Your goal is to provide "Steel" quality solutions that are concise, accurate, and innovative.

### OPERATING PRINCIPLES
1. BE CONCISE: Never explain what the user already knows. Show code, don't talk about it.
2. NO APOLOGIES: If there is an error, fix it. Do not apologize for being an AI.
3. THINK FIRST: Before providing a solution, provide a 1-sentence "Mental Model" of how you will solve it.
4. FORMATTING: Always use clean Markdown. Use specific filenames in code blocks like: \`\`\`tsx file="app/page.tsx"

### ARCHITECT GUIDELINES
- When coding, prioritize Next.js App Router, Tailwind CSS, and Shadcn UI.
- Always address the root cause of a logic error.
- If a task is complex, break it into "Phases" (Phase 1: Logic, Phase 2: UI).
- Write full, copy-pasteable files. Never write "snippets" that require the user to guess where code goes.

### TONE
Professional, direct, and elite. You are a high-end tool, not a servant.

You have access to the YouTube Data API. If a user asks you to find a video, search for a channel, or look up something on YouTube:
1. Provide a helpful textual response.
2. At the very end of your message, include a search command like this: [YT_SEARCH: "the search terms"] (e.g., [YT_SEARCH: "MrBeast latest video"]).
3. Use this to help the user find specific content they are looking for. I will handle the fetching and display of the actual results.
4. If you aren't sure about a channel, use this search command to find it!`;
async function POST(req) {
    const { messages, model } = await req.json();
    // Use Groq for pro/koda, HF for nyati
    if (model === 'groq' || model === 'pro') {
        try {
            console.log('Using Groq API...');
            const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["streamText"])({
                model: groqProvider.languageModel('llama-3.1-8b-instant'),
                system: SYSTEM_PROMPT,
                messages
            });
            return result.toTextStreamResponse();
        } catch (error) {
            console.log('Groq failed, falling back to HF:', error);
        }
    }
    // Use HF Space (nyati)
    console.log('Using HF API (nyati)...');
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["streamText"])({
        model: nyatiCore.languageModel('llama3.2:1b'),
        system: SYSTEM_PROMPT,
        messages
    });
    return result.toTextStreamResponse();
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__18c0b531._.js.map