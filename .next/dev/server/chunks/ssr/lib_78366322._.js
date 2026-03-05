module.exports = [
"[project]/lib/qdrant.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_d0b5892c._.js",
  "server/chunks/ssr/[root-of-the-server]__266b4c90._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/lib/qdrant.ts [app-ssr] (ecmascript)");
    });
});
}),
"[project]/lib/embeddings.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/lib_embeddings_ts_f88d5fc0._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/lib/embeddings.ts [app-ssr] (ecmascript)");
    });
});
}),
];