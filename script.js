const chatContainer = document.getElementById('chatContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const chatHistory = document.getElementById('chatHistory');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const reportModal = document.getElementById('reportModal');
const instructionsModal = document.getElementById('instructionsModal');
const addInstructionModal = document.getElementById('addInstructionModal');
const instructionsList = document.getElementById('instructionsList');
const whatsNewPanel = document.getElementById('whatsNewPanel');
const whatsNewBtn = document.getElementById('whatsNewBtn');
const closeWhatsNew = document.getElementById('closeWhatsNew');
const profileBtn = document.getElementById('profileBtn');
const signInModal = document.getElementById('signInModal');
const closeSignIn = document.getElementById('closeSignIn');
const knowledgeBtn = document.getElementById('knowledgeBtn');
const knowledgeModal = document.getElementById('knowledgeModal');
const closeKnowledge = document.getElementById('closeKnowledge');
const knowledgeList = document.getElementById('knowledgeList');
const knowledgeLinkInput = document.getElementById('knowledgeLinkInput');
const knowledgeTitleInput = document.getElementById('knowledgeTitleInput');
const knowledgeTextInput = document.getElementById('knowledgeTextInput');
const fetchLinkBtn = document.getElementById('fetchLinkBtn');
const saveKnowledgeBtn = document.getElementById('saveKnowledgeBtn');
const knowledgeImageBtn = document.getElementById('knowledgeImageBtn');
const knowledgeImageInput = document.getElementById('knowledgeImageInput');
const knowledgeImagePreview = document.getElementById('knowledgeImagePreview');
const knowledgePreviewImg = document.getElementById('knowledgePreviewImg');
const imageAnalyzing = document.getElementById('imageAnalyzing');
const removeKnowledgeImg = document.getElementById('removeKnowledgeImg');
const knowledgeFolderBtn = document.getElementById('knowledgeFolderBtn');
const knowledgeFolderInput = document.getElementById('knowledgeFolderInput');
const folderUploadStatus = document.getElementById('folderUploadStatus');
const folderName = document.getElementById('folderName');
const folderFilesCount = document.getElementById('folderFilesCount');
const folderProcessing = document.getElementById('folderProcessing');
const folderProgressBar = document.getElementById('folderProgressBar');
const folderProcessingText = document.getElementById('folderProcessingText');
const removeFolderUpload = document.getElementById('removeFolderUpload');

const devBtn = document.getElementById('devBtn');
const devModal = document.getElementById('devModal');
const closeDev = document.getElementById('closeDev');
const apiKeyNameInput = document.getElementById('apiKeyNameInput');
const generatedKeyDisplay = document.getElementById('generatedKeyDisplay');
const generateKeyBtn = document.getElementById('generateKeyBtn');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const apiKeyList = document.getElementById('apiKeyList');
const devTabs = document.querySelectorAll('.dev-tab');
const devKeysSection = document.getElementById('devKeysSection');
const devDocsSection = document.getElementById('devDocsSection');
const devContributeSection = document.getElementById('devContributeSection');
const devReportsSection = document.getElementById('devReportsSection');
const reportsTab = document.getElementById('reportsTab');
// Reference the DevDocs tab element
const devDocsTab = document.querySelector('.dev-tab[data-tab="docs"]');

// Enforce privacy of DevDocs for non-admin users
function enforceDevDocPrivacy() {
  if (!isAdmin()) {
    if (devDocsTab) devDocsTab.style.display = 'none';
    if (devDocsSection) devDocsSection.style.display = 'none';
  } else {
    if (devDocsTab) devDocsTab.style.display = '';
  }
}


// Re-evaluate after any auth state change
if (typeof auth !== 'undefined' && typeof auth.onAuthStateChanged === 'function') {
  auth.onAuthStateChanged(() => enforceAdminUI());
}
const problemsBtn = document.getElementById('problemsBtn');
const problemsModal = document.getElementById('problemsModal');
const problemsList = document.getElementById('problemsList');
const closeProblems = document.getElementById('closeProblems');
const devKnowledgeTitle = document.getElementById('devKnowledgeTitle');
const devKnowledgeText = document.getElementById('devKnowledgeText');
const apiBtn = document.getElementById('apiBtn');
const apiModal = document.getElementById('apiModal');
const closeApi = document.getElementById('closeApi');
const apiKeyName = document.getElementById('apiKeyName');
const apiKeyValue = document.getElementById('apiKeyValue');
const addApiKeyBtn = document.getElementById('addApiKeyBtn');
const openRouterApiKeyList = document.getElementById('openRouterApiKeyList');

// OpenRouter API Keys storage (using Turso)
let openRouterApiKeys = [];
let selectedApiKeyIndex = 0;

// Initialize Turso schema on load
(async function initTurso() {
  try {
    await initTursoSchema();
    console.log('✓ Turso database initialized');
  } catch (error) {
    console.error('Failed to initialize Turso:', error);
  }
})();

// Run once on script load (after DOM references are initialized)
enforceAdminUI();

// ---------- Admin Reports / Problems ----------
function enforceAdminUI() {
  // Keep Dev Docs privacy rules
  enforceDevDocPrivacy();
  if (isAdmin()) {
    if (problemsBtn) problemsBtn.style.display = '';
    if (reportsTab) reportsTab.style.display = '';
    if (apiBtn) apiBtn.style.display = '';
  } else {
    if (problemsBtn) problemsBtn.style.display = 'none';
    if (reportsTab) reportsTab.style.display = 'none';
    if (problemsModal) problemsModal.classList.remove('open');
    if (apiBtn) apiBtn.style.display = 'none';
    if (apiModal) apiModal.classList.remove('open');
  }
}

// Open modal via sidebar button
if (problemsBtn) {
  problemsBtn.addEventListener('click', () => {
    if (!isAdmin()) return;
    if (problemsModal) problemsModal.classList.add('open');
    loadReports();
  });
}

// API Keys Modal (admin)
if (apiBtn) {
  apiBtn.addEventListener('click', () => {
    if (!isAdmin()) return;
    if (apiModal) apiModal.classList.add('open');
    loadOpenRouterApiKeys();
  });
}

if (closeApi) {
  closeApi.addEventListener('click', () => apiModal.classList.remove('open'));
}

if (apiModal) {
  apiModal.addEventListener('click', (e) => {
    if (e.target === apiModal) apiModal.classList.remove('open');
  });
}

// Load OpenRouter API keys from Turso
async function loadOpenRouterApiKeys() {
  try {
    const keys = await getApiKeysFromTurso();
    openRouterApiKeys = keys;
    
    // Find selected key index
    const selectedKey = keys.find(k => k.isSelected);
    if (selectedKey) {
      selectedApiKeyIndex = openRouterApiKeys.findIndex(k => k.id === selectedKey.id);
    } else if (keys.length > 0) {
      selectedApiKeyIndex = 0;
    }
    
    renderOpenRouterApiKeys();
  } catch (error) {
    console.error('Error loading API keys from Turso:', error);
    openRouterApiKeys = [];
    renderOpenRouterApiKeys();
  }
}

// Render OpenRouter API keys list
function renderOpenRouterApiKeys() {
  if (!openRouterApiKeyList) return;
  
  if (openRouterApiKeys.length === 0) {
    openRouterApiKeyList.innerHTML = '<p class="empty-msg" style="text-align: center; color: var(--text-secondary); padding: 20px;">No API keys added yet.</p>';
    return;
  }
  
  openRouterApiKeyList.innerHTML = openRouterApiKeys.map((key, index) => `
    <div class="api-key-item ${index === selectedApiKeyIndex ? 'active' : ''}" data-index="${index}">
      <div style="flex: 1;">
        <strong>${key.name}</strong>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${key.key.substring(0, 20)}...</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="action-btn select-key-btn" data-index="${index}" title="Select this key">
          ${index === selectedApiKeyIndex ? '✓' : 'Use'}
        </button>
        <button class="action-btn delete-key-btn" data-index="${index}" title="Delete key">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  openRouterApiKeyList.querySelectorAll('.select-key-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      selectOpenRouterApiKey(index);
    });
  });
  
  openRouterApiKeyList.querySelectorAll('.delete-key-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteOpenRouterApiKey(index);
    });
  });
}

// Select an API key
async function selectOpenRouterApiKey(index) {
  try {
    const key = openRouterApiKeys[index];
    if (key && key.id) {
      await selectApiKeyInTurso(key.id);
      selectedApiKeyIndex = index;
      renderOpenRouterApiKeys();
    }
  } catch (error) {
    console.error('Error selecting API key:', error);
  }
}

// Delete an API key
async function deleteOpenRouterApiKey(index) {
  if (!confirm('Delete this API key?')) return;
  
  try {
    const key = openRouterApiKeys[index];
    if (key && key.id) {
      await deleteApiKeyFromTurso(key.id);
      openRouterApiKeys.splice(index, 1);
      
      // Adjust selected index if needed
      if (selectedApiKeyIndex >= openRouterApiKeys.length) {
        selectedApiKeyIndex = Math.max(0, openRouterApiKeys.length - 1);
        // Select the new first key if exists
        if (openRouterApiKeys.length > 0) {
          await selectApiKeyInTurso(openRouterApiKeys[selectedApiKeyIndex].id);
        }
      }
      
      renderOpenRouterApiKeys();
    }
  } catch (error) {
    console.error('Error deleting API key:', error);
  }
}

// Add new API key
if (addApiKeyBtn) {
  addApiKeyBtn.addEventListener('click', async () => {
    const name = apiKeyName.value.trim();
    const key = apiKeyValue.value.trim();
    
    if (!name || !key) {
      alert('Please enter both a name and API key');
      return;
    }
    
    try {
      const success = await addApiKeyToTurso(name, key);
      if (success) {
        // Reload keys from Turso
        await loadOpenRouterApiKeys();
        
        apiKeyName.value = '';
        apiKeyValue.value = '';
      }
    } catch (error) {
      console.error('Error adding API key:', error);
      alert('Failed to add API key. Please try again.');
    }
  });
}

if (closeProblems) {
  closeProblems.addEventListener('click', () => problemsModal.classList.remove('open'));
}

if (problemsModal) {
  problemsModal.addEventListener('click', (e) => {
    if (e.target === problemsModal) problemsModal.classList.remove('open');
  });
}

// Fetch and render user reports (admin only)
async function loadReports() {
  if (!isAdmin()) return;
  if (problemsList) {
    problemsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">Loading...</p>';
  }
  try {
    if (typeof db === 'undefined') throw new Error('Firestore not ready');
    const snapshot = await db.collection('reports').orderBy('timestamp', 'desc').limit(100).get();
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    renderReports(items);
  } catch (err) {
    console.error('loadReports error:', err);
  }
}

function renderReports(reports = []) {
  if (!problemsList) return;
  if (reports.length === 0) {
    problemsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">No reports.</p>';
    return;
  }
  problemsList.innerHTML = reports.map(r => {
    const email = r.email || 'Anonymous';
    const ts = r.timestamp && r.timestamp.toDate ? r.timestamp.toDate().toLocaleString() : '';
    return `
      <div class="report-item" style="border-bottom:1px solid rgba(255,255,255,0.05);padding:10px;">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:6px;">
          <div>
            <strong style="color:var(--accent);">${email}</strong>
            <span style="font-size:0.75rem;color:var(--text-secondary);margin-left:6px;">${ts}</span>
          </div>
          <button onclick="deleteReport('${r.id}')" title="Delete report" style="background:none;border:none;color:#ff6b6b;cursor:pointer;padding:2px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <p style="margin:5px 0;font-size:0.85rem;white-space:pre-wrap;">${r.description || ''}</p>
      </div>`;
  }).join('');
}

// Global delete function for admin
window.deleteReport = async function(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete this report?')) return;
  try {
    await db.collection('reports').doc(id).delete();
    // Refresh list
    loadReports();
  } catch (e) {
    console.error('deleteReport error', e);
    alert('Failed to delete.');
  }
};

// Backward compatibility
function loadProblems() { loadReports(); }

// -------- Developer Docs (private markdown) --------
const DEV_DOC_RAW_URL = 'https://raw.githubusercontent.com/Raymon-del2/koda-a/master/DEV_DOCS_PRIVATE.md';
let devDocsLoaded = false;
async function loadDevDocs() {
  // Only allow admins to view private developer docs
  if (!isAdmin()) {
    if (devDocsSection) {
      devDocsSection.innerHTML = '<p style="color:#ff6b6b">Developer docs are restricted to admins.</p>';
    }
    return;
  }
  if (devDocsLoaded) return;
  try {
    const res = await fetch(DEV_DOC_RAW_URL);
    if (!res.ok) throw new Error('fetch fail');
    const text = await res.text();
    const pre = document.createElement('pre');
    pre.className = 'doc-code-block';
    pre.style.whiteSpace = 'pre-wrap';
    // escape to avoid HTML injection but keep markdown readable
    pre.textContent = text;
    devDocsSection.appendChild(pre);
    devDocsLoaded = true;
  } catch (e) {
    devDocsSection.innerHTML = '<p style="color:red">Failed to load DEV_DOCS_PRIVATE.md</p>';
  }
}
const saveDevKnowledgeBtn = document.getElementById('saveDevKnowledgeBtn');

let isTyping = false;
// chats and instructions are defined in firebase-config.js
// Fallback to local storage if they haven't been loaded from Firebase yet
if (instructions.length === 0) {
  const localInst = localStorage.getItem('koda_instructions');
  if (localInst) {
    try {
      instructions = JSON.parse(localInst);
      console.log('Instructions loaded from local storage (fallback):', instructions.length);
    } catch (e) { console.error('Error parsing local instructions', e); }
  }
}

let knowledgeBase = [];

// Optional: external knowledge hub endpoint (Cloud Function)
const KNOWLEDGE_DUMP_URL = window.KNOWLEDGE_DUMP_URL || '';

async function fetchKnowledgeFromHub() {
  if (!KNOWLEDGE_DUMP_URL) return [];
  try {
    const res = await fetch(KNOWLEDGE_DUMP_URL);
    if (!res.ok) throw new Error('Hub fetch failed');
    const data = await res.json();
    localStorage.setItem('koda_knowledge', JSON.stringify(data));
    return data;
  } catch (e) {
    console.warn('Could not fetch knowledge hub:', e);
    return [];
  }
}

// --- Direct Firestore REST fallback (no SDK needed) ---
async function loadKodaKnowledgeREST() {
  const url = "https://firestore.googleapis.com/v1/projects/voices-d80ae/databases/(default)/documents/knowledge?pageSize=1000";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('REST fetch failed');
    const json = await res.json();
    const items = (json.documents || []).map(d => {
      const f = d.fields;
      return {
        title: f.title?.stringValue || '',
        content: f.content?.stringValue || '',
        link: f.link?.stringValue || ''
      };
    });
    localStorage.setItem('koda_knowledge', JSON.stringify(items));
    return items;
  } catch (e) {
    console.warn('Could not fetch knowledge via REST:', e);
    return [];
  }
}

let pendingFolderFiles = []; // Files from folder upload waiting to be saved
let pendingImageBase64 = null; // Store pending image base64 for saving

// Load knowledge base from Firebase immediately
(async function initKnowledgeBase() {
  if (typeof loadKnowledgeBase === 'function') {
    const items = await loadKnowledgeBase();
    if (items && items.length > 0) {
      knowledgeBase = items;
      console.log('Knowledge Base initialized from Firebase:', knowledgeBase.length, 'items');
      if (typeof renderKnowledgeList === 'function') renderKnowledgeList();
    }
  } else {
    // Fallback to local storage for knowledgeBase
    const localKB = localStorage.getItem('koda_knowledge');
    if (localKB) {
      try {
        knowledgeBase = JSON.parse(localKB);
        console.log('Knowledge Base loaded from local storage (fallback):', knowledgeBase.length);
      } catch (e) { console.error('Error parsing local knowledge base', e); }
    }
  }

  // Final fallback: fetch from external hub if still empty
  if (knowledgeBase.length === 0) {
    // try external hub first
    const hubItems = await fetchKnowledgeFromHub();
    if (hubItems.length) {
      knowledgeBase = hubItems;
      console.log('Knowledge Base synced from external hub:', knowledgeBase.length);
    } else {
      // final fallback: public REST endpoint
      const restItems = await loadKodaKnowledgeREST();
      if (restItems.length) {
        knowledgeBase = restItems;
        console.log('Knowledge Base loaded via REST:', knowledgeBase.length);
      }
    }
    if (knowledgeBase.length && typeof renderKnowledgeList === 'function') renderKnowledgeList();
  }
})();

// apiKeys is defined in firebase-config.js
if (apiKeys.length === 0) {
  const localKeys = localStorage.getItem('koda_api_keys');
  if (localKeys) {
    try {
      apiKeys = JSON.parse(localKeys);
      console.log('Developer API Keys loaded from local storage (fallback):', apiKeys.length);
    } catch (e) { console.error('Error parsing local API keys', e); }
  }
}
let currentChatId = null;
let suggestionIndex = 0;
let username = window.username || 'You';
const YOUTUBE_API_KEY = 'AIzaSyA82ZQFsZYuf_yzCsd4QN0tkpRMvKcs6EA';

// ===================== OPENROUTER CONFIG =====================
// OpenRouter API Key for DeepSeek R1T2 Chimera (free)
const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'tngtech/deepseek-r1t2-chimera:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function openRouterFetch(path, options) {
  return fetch(OPENROUTER_BASE_URL + path, options);
}

// Simple local cache to avoid duplicate requests (keyed by SHA-256 of input)
let clarifaiCache = {};
try { clarifaiCache = JSON.parse(localStorage.getItem('clarifai_cache') || '{}'); } catch { clarifaiCache = {}; }

function saveClarifaiCache() {
  localStorage.setItem('clarifai_cache', JSON.stringify(clarifaiCache));
}

// Utility: current month as YYYYMM (e.g. 202512)
function currentMonthKey() {
  const now = new Date();
  return String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, '0');
}

// ------- Usage tracking (Firestore fallback to localStorage) -------
async function getClarifaiUsage(monthKey = currentMonthKey()) {
  let used = 0;
  if (typeof db !== 'undefined' && currentUser) {
    try {
      const doc = await db.collection('usage').doc(`${currentUser.uid}_${monthKey}`).get();
      used = doc.exists ? (doc.data().ops || 0) : 0;
    } catch { used = 0; }
  } else {
    used = parseInt(localStorage.getItem('clarifai_usage_' + monthKey) || '0', 10);
  }
  return used;
}

async function incrementClarifaiUsage(monthKey = currentMonthKey(), delta = 1) {
  const used = await getClarifaiUsage(monthKey);
  if (used + delta > CLARIFAI_SOFT_CAP) {
    throw new Error('Clarifai monthly quota near limit');
  }
  const newVal = used + delta;

  if (typeof db !== 'undefined' && currentUser) {
    try {
      await db.collection('usage').doc(`${currentUser.uid}_${monthKey}`).set({ ops: newVal }, { merge: true });
    } catch (err) {
      console.warn('Firestore usage write failed, falling back to localStorage:', err.message || err);
      localStorage.setItem('clarifai_usage_' + monthKey, String(newVal));
    }
  } else {
    localStorage.setItem('clarifai_usage_' + monthKey, String(newVal));
  }
  return newVal;
}

// ------- SHA-256 helper (returns hex string) -------
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ------- Clarifai generic call with usage enforcement -------
async function clarifaiCall(base64Body, modelId = 'aaa03c23b3724a16a56b629203edc62c') {
  if (!CLARIFAI_API_KEY || CLARIFAI_API_KEY.startsWith('YOUR_')) {
    throw new Error('Clarifai API key not configured');
  }

  await incrementClarifaiUsage(); // will throw if cap reached

  const res = await clarifaiFetch(`/models/${modelId}/outputs`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${CLARIFAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: [{ data: { image: { base64: base64Body } } }] })
  });

  if (!res.ok) throw new Error('Clarifai API error');
  const json = await res.json();
  const concepts = json?.outputs?.[0]?.data?.concepts || [];
  return concepts.slice(0, 10).map(c => `${c.name} (${(c.value * 100).toFixed(1)}%)`).join(', ');
}
// =============================================================

// ------- OpenRouter text completion (DeepSeek R1T2 Chimera) -------
async function clarifaiTextCompletion(systemPrompt, conversationHistoryArr) {
  // Get selected API key from Turso
  let apiKey = OPENROUTER_API_KEY; // fallback to hardcoded key
  
  try {
    const selectedKey = await getSelectedApiKeyFromTurso();
    if (selectedKey) {
      apiKey = selectedKey;
    } else if (openRouterApiKeys.length > 0 && openRouterApiKeys[selectedApiKeyIndex]) {
      apiKey = openRouterApiKeys[selectedApiKeyIndex].key;
    }
  } catch (error) {
    console.error('Error getting selected API key:', error);
  }
  
  // Build messages array for OpenRouter
  const messages = conversationHistoryArr.map(m => ({
    role: m.role,
    content: m.content
  }));

  // Add system prompt as first message
  messages.unshift({
    role: 'system',
    content: systemPrompt
  });

  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const res = await openRouterFetch('/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Koda'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: messages
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.text();
      throw new Error('OpenRouter API error: ' + errData);
    }
    const json = await res.json();
    const outputText = json.choices?.[0]?.message?.content || '[No response]';
    return outputText.trim();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - the AI model took too long to respond');
    }
    throw error;
  }
}
// =============================================================


// Suggestion sets - 5 per card, rotating every 10 seconds
const suggestionSets = [
  [
    { icon: 'star', text: 'Help me write a creative story' },
    { icon: 'eye', text: 'Explain a complex topic simply' },
    { icon: 'help', text: 'Help me brainstorm ideas' },
    { icon: 'doc', text: 'Review and improve my writing' }
  ],
  [
    { icon: 'code', text: 'Help me debug this code' },
    { icon: 'mail', text: 'Write a professional email' },
    { icon: 'list', text: 'Create a study plan for me' },
    { icon: 'globe', text: 'Translate this text' }
  ],
  [
    { icon: 'bulb', text: 'Give me startup ideas' },
    { icon: 'chart', text: 'Analyze this data for me' },
    { icon: 'book', text: 'Summarize this article' },
    { icon: 'pen', text: 'Help me write a poem' }
  ],
  [
    { icon: 'calendar', text: 'Plan my weekly schedule' },
    { icon: 'heart', text: 'Give me self-care tips' },
    { icon: 'music', text: 'Recommend songs for my mood' },
    { icon: 'camera', text: 'Tips for better photography' }
  ],
  [
    { icon: 'rocket', text: 'Help me learn something new' },
    { icon: 'puzzle', text: 'Solve this riddle for me' },
    { icon: 'coffee', text: 'Suggest a recipe to try' },
    { icon: 'map', text: 'Plan a trip itinerary' }
  ]
];

const iconSVGs = {
  star: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  eye: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  help: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  doc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
  code: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
  list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
  globe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  bulb: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>',
  chart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
  pen: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
  heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  music: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
  camera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
  rocket: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>',
  puzzle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z"></path></svg>',
  coffee: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
  map: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>'
};

// Init
messageInput.addEventListener('input', () => {
  sendBtn.classList.toggle('active', messageInput.value.trim().length > 0);
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);
newChatBtn.addEventListener('click', startNewChat);
menuToggle.addEventListener('click', toggleSidebar);

// Donation modal
const donateBtn = document.getElementById('donateBtn');
const donateModal = document.getElementById('donateModal');
const closeDonate = document.getElementById('closeDonate');

// Donation modal
if (donateBtn) {
  donateBtn.addEventListener('click', () => {
    donateModal.classList.add('open');
  });
}

if (closeDonate) {
  closeDonate.addEventListener('click', () => {
    donateModal.classList.remove('open');
  });
}

donateModal.addEventListener('click', (e) => {
  if (e.target === donateModal) {
    donateModal.classList.remove('open');
  }
});

// Knowledge modal
if (knowledgeBtn) {
  knowledgeBtn.addEventListener('click', () => {
    knowledgeModal.classList.add('open');
    renderKnowledgeList();
  });
}

if (closeKnowledge) {
  closeKnowledge.addEventListener('click', () => {
    knowledgeModal.classList.remove('open');
  });
}

knowledgeModal.addEventListener('click', (e) => {
  if (e.target === knowledgeModal) {
    knowledgeModal.classList.remove('open');
  }
});

// Fetch link content using jina.ai (converts web to markdown/text)
if (fetchLinkBtn) {
  fetchLinkBtn.addEventListener('click', async () => {
    const url = knowledgeLinkInput.value.trim();
    if (!url) return;

    fetchLinkBtn.disabled = true;
    fetchLinkBtn.textContent = 'Fetching...';

    try {
      // Using jina.ai reader which is excellent for LLM-friendly web reading
      const response = await fetch(`https://r.jina.ai/${url}`);
      if (!response.ok) throw new Error('Failed to fetch content');

      const content = await response.text();
      knowledgeTextInput.value = content;

      // Try to extract a title from the URL if title input is empty
      if (!knowledgeTitleInput.value) {
        try {
          const urlObj = new URL(url);
          knowledgeTitleInput.value = urlObj.hostname + urlObj.pathname;
        } catch (e) { }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Could not read the website directly. Try copying and pasting the content manually.');
    } finally {
      fetchLinkBtn.disabled = false;
      fetchLinkBtn.textContent = 'Fetch';
    }
  });
}

if (knowledgeImageBtn) {
  knowledgeImageBtn.addEventListener('click', () => knowledgeImageInput.click());
}

if (knowledgeImageInput) {
  knowledgeImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      
      // Store the base64 for saving later
      pendingImageBase64 = base64;
      
      knowledgePreviewImg.src = base64;
      knowledgeImagePreview.style.display = 'block';
      
      // Auto-fill title with filename if empty
      if (!knowledgeTitleInput.value) {
        knowledgeTitleInput.value = "Image: " + file.name;
      }
      
      // Try to analyze the image (optional - won't block saving)
      imageAnalyzing.style.display = 'flex';
      try {
        const description = await analyzeKnowledgeImage(base64);
        knowledgeTextInput.value = description;
      } catch (error) {
        console.error('Image analysis error:', error);
        // Set default description - analysis is optional
        knowledgeTextInput.value = '[Image stored as base64]';
      } finally {
        imageAnalyzing.style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  });
}

if (removeKnowledgeImg) {
  removeKnowledgeImg.addEventListener('click', () => {
    knowledgeImagePreview.style.display = 'none';
    knowledgeImageInput.value = '';
    knowledgePreviewImg.src = '';
    pendingImageBase64 = null; // Clear pending image
  });
}

async function analyzeKnowledgeImage(base64) {
  const pureBase64 = base64.split(',')[1];

  // Caching based on image hash
  let hash;
  try { hash = await sha256(pureBase64); } catch { hash = null; }
  if (hash && clarifaiCache[hash]) {
    return clarifaiCache[hash];
  }

  // Attempt Clarifai analysis with quota guard
  try {
    const clarifaiDesc = await clarifaiCall(pureBase64);
    if (hash) { clarifaiCache[hash] = clarifaiDesc; saveClarifaiCache(); }
    return clarifaiDesc;
  } catch (err) {
    console.warn('Clarifai analysis failed or quota exceeded:', err.message);
    // No fallback
    return '[Image analysis unavailable]';
  }
}

// Save knowledge
if (saveKnowledgeBtn) {
  saveKnowledgeBtn.addEventListener('click', async () => {
    const title = knowledgeTitleInput.value.trim();
    const content = knowledgeTextInput.value.trim();
    const link = knowledgeLinkInput.value.trim();

    // Check if we have folder files to process
    if (pendingFolderFiles.length > 0) {
      await saveFolderFilesAsKnowledge();
      return;
    }

    // Allow saving with just an image (no text content required if image exists)
    if (!title || (!content && !pendingImageBase64)) {
      alert('Please provide at least a title and some content or an image.');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      title,
      content: content || '[Image stored]',
      link: link || null,
      timestamp: Date.now(),
      type: pendingImageBase64 ? 'image' : 'text',
      imageBase64: pendingImageBase64 || null
    };

    // Add to local array first for immediate UI update
    knowledgeBase.push(newItem);
    localStorage.setItem('koda_knowledge', JSON.stringify(knowledgeBase));

    // Save to Firebase for permanent storage
    if (typeof saveKnowledgeItem === 'function') {
      const saved = await saveKnowledgeItem(newItem);
      if (saved) {
        console.log('✓ Knowledge permanently saved to cloud');
      } else {
        console.warn('Cloud save failed, but saved locally');
      }
    }

    // Reset inputs
    knowledgeTitleInput.value = '';
    knowledgeTextInput.value = '';
    knowledgeLinkInput.value = '';
    pendingImageBase64 = null;

    // Reset Image Preview
    if (knowledgeImagePreview) knowledgeImagePreview.style.display = 'none';
    if (knowledgePreviewImg) knowledgePreviewImg.src = '';
    if (knowledgeImageInput) knowledgeImageInput.value = '';

    renderKnowledgeList();
  });
}

function renderKnowledgeList() {
  if (!knowledgeList) return;

  if (knowledgeBase.length === 0) {
    knowledgeList.innerHTML = '<p class="empty-msg" style="text-align: center; color: var(--text-secondary); padding: 20px;">No extra knowledge added yet.</p>';
    return;
  }

  knowledgeList.innerHTML = knowledgeBase.map(item => {
    const isFolder = item.type === 'folder';
    const isImage = item.type === 'image';
    
    let icon = '';
    if (isFolder) {
      icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="margin-right: 6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v2"></path></svg>`;
    } else if (isImage) {
      icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }
    
    const subtitle = isFolder 
      ? `<span style="font-size: 0.75rem; color: var(--accent); margin-left: 8px;">(${item.fileCount} files)</span>`
      : '';
    
    // Show image thumbnail if available
    const imagePreview = item.imageBase64 
      ? `<img src="${item.imageBase64}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" alt="${item.title}">`
      : '';
    
    return `
    <div class="knowledge-item" style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
        <strong style="color: var(--accent); font-size: 0.95rem; display: flex; align-items: center;">${icon}${item.title}${subtitle}</strong>
        <button onclick="deleteKnowledge('${item.id}')" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      ${imagePreview}
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
        ${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}
      </p>
      ${item.link ? `<a href="${item.link}" target="_blank" style="font-size: 0.75rem; color: var(--accent); text-decoration: none; margin-top: 5px; display: inline-block;">View Source</a>` : ''}
    </div>
  `;
  }).join('');
}

// Global function to delete knowledge
window.deleteKnowledge = async function (id) {
  knowledgeBase = knowledgeBase.filter(item => item.id !== id);
  localStorage.setItem('koda_knowledge', JSON.stringify(knowledgeBase));

  // Delete from Firebase for permanent removal
  if (typeof deleteKnowledgeItem === 'function') {
    await deleteKnowledgeItem(id);
  }

  renderKnowledgeList();
};

// ===== FOLDER UPLOAD FUNCTIONALITY =====

// Supported text file extensions for reading
const READABLE_EXTENSIONS = [
  '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less',
  '.html', '.htm', '.xml', '.yaml', '.yml', '.py', '.java', '.c', '.cpp', '.h',
  '.cs', '.go', '.rb', '.php', '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat',
  '.ini', '.cfg', '.conf', '.env', '.gitignore', '.dockerfile', '.vue', '.svelte',
  '.rs', '.swift', '.kt', '.scala', '.r', '.m', '.csv', '.log', '.toml'
];

// Check if file is readable text
function isReadableFile(fileName) {
  const ext = '.' + fileName.split('.').pop().toLowerCase();
  return READABLE_EXTENSIONS.includes(ext);
}

// Read file content as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// Handle folder selection
if (knowledgeFolderBtn) {
  knowledgeFolderBtn.addEventListener('click', () => {
    knowledgeFolderInput.click();
  });
}

if (knowledgeFolderInput) {
  knowledgeFolderInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter to readable files only
    const readableFiles = files.filter(f => isReadableFile(f.name));
    
    if (readableFiles.length === 0) {
      alert('No readable text files found in the selected folder.\n\nSupported formats: .txt, .md, .json, .js, .py, .html, .css, and more.');
      return;
    }

    // Get folder name from first file's path
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const folderNameText = firstPath.split('/')[0] || 'Uploaded Folder';

    // Store pending files
    pendingFolderFiles = readableFiles;

    // Update UI
    if (folderUploadStatus) folderUploadStatus.style.display = 'block';
    if (folderName) folderName.textContent = folderNameText;
    if (folderFilesCount) folderFilesCount.textContent = `${readableFiles.length} readable files selected`;
    if (folderProcessing) folderProcessing.style.display = 'none';

    // Auto-fill title if empty
    if (knowledgeTitleInput && !knowledgeTitleInput.value.trim()) {
      knowledgeTitleInput.value = `Folder: ${folderNameText}`;
    }
  });
}

// Remove folder upload
if (removeFolderUpload) {
  removeFolderUpload.addEventListener('click', () => {
    pendingFolderFiles = [];
    if (folderUploadStatus) folderUploadStatus.style.display = 'none';
    if (knowledgeFolderInput) knowledgeFolderInput.value = '';
  });
}

// Save folder files as knowledge
async function saveFolderFilesAsKnowledge() {
  if (pendingFolderFiles.length === 0) return;

  const title = knowledgeTitleInput.value.trim() || 'Uploaded Folder';
  
  // Show progress
  if (folderProcessing) folderProcessing.style.display = 'block';
  if (saveKnowledgeBtn) saveKnowledgeBtn.disabled = true;

  let processedCount = 0;
  let allContent = [];

  for (const file of pendingFolderFiles) {
    try {
      const content = await readFileAsText(file);
      const relativePath = file.webkitRelativePath || file.name;
      
      allContent.push(`\n===== FILE: ${relativePath} =====\n${content}`);
      
      processedCount++;
      const progress = Math.round((processedCount / pendingFolderFiles.length) * 100);
      
      if (folderProgressBar) folderProgressBar.style.width = `${progress}%`;
      if (folderProcessingText) folderProcessingText.textContent = `Processing ${processedCount}/${pendingFolderFiles.length} files...`;
    } catch (err) {
      console.error(`Error reading file ${file.name}:`, err);
    }
  }

  // Create knowledge item with all file contents
  const newItem = {
    id: Date.now().toString(),
    title: title,
    content: `Folder containing ${pendingFolderFiles.length} files:\n${allContent.join('\n')}`,
    link: null,
    timestamp: Date.now(),
    type: 'folder',
    fileCount: pendingFolderFiles.length
  };

  // Add to local array
  knowledgeBase.push(newItem);
  localStorage.setItem('koda_knowledge', JSON.stringify(knowledgeBase));

  // Save to Firebase for permanent storage
  if (typeof saveKnowledgeItem === 'function') {
    console.log('Saving folder knowledge to Firebase...');
    const saved = await saveKnowledgeItem(newItem);
    console.log('Save result:', saved);
  }

  // Reset UI
  pendingFolderFiles = [];
  if (folderUploadStatus) folderUploadStatus.style.display = 'none';
  if (knowledgeFolderInput) knowledgeFolderInput.value = '';
  if (knowledgeTitleInput) knowledgeTitleInput.value = '';
  if (saveKnowledgeBtn) saveKnowledgeBtn.disabled = false;

  renderKnowledgeList();
  alert(`Successfully saved ${processedCount} files to the AI Knowledge Base!`);
}

// Developer Portal
if (devBtn) {
  devBtn.addEventListener('click', () => {
    devModal.classList.add('open');
    renderApiKeyList();
  });
}

if (closeDev) {
  closeDev.addEventListener('click', () => {
    devModal.classList.remove('open');
  });
}

devModal.addEventListener('click', (e) => {
  if (e.target === devModal) {
    devModal.classList.remove('open');
  }
});

// Tabs
devTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    devTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    devKeysSection.style.display = target === 'keys' ? 'block' : 'none';
    devDocsSection.style.display = target === 'docs' ? 'block' : 'none';
    if (devContributeSection) devContributeSection.style.display = target === 'contribute' ? 'block' : 'none';
    if (devReportsSection) devReportsSection.style.display = target === 'reports' ? 'block' : 'none';

    if (target === 'keys') {
      renderApiKeyList();
    } else if (target === 'docs') {
      loadDevDocs();
    } else if (target === 'contribute') {
      if (devContributeSection) devContributeSection.style.display = 'block';
    } else if (target === 'reports') {
      if (problemsModal) problemsModal.classList.add('open');
      loadProblems();
      loadReports();
      devReportsSection.style.display = 'block';
      loadDevDocs();
    }
  });
});

if (saveDevKnowledgeBtn) {
  saveDevKnowledgeBtn.addEventListener('click', async () => {
    const title = devKnowledgeTitle.value.trim();
    const content = devKnowledgeText.value.trim();

    if (!title || !content) {
      alert('Please fill in both title and content.');
      return;
    }

    const newItem = {
      id: 'dk_' + Date.now(),
      title: "[Dev] " + title,
      content,
      link: "Developer Portal",
      timestamp: Date.now()
    };

    // Add to local base
    knowledgeBase.push(newItem);
    localStorage.setItem('koda_knowledge', JSON.stringify(knowledgeBase));

    // Sync to Firebase
    if (typeof db !== 'undefined' && auth.currentUser) {
      db.collection('knowledge').doc(newItem.id).set(newItem)
        .then(() => alert('Thank you! Knowledge added to the global brain.'))
        .catch(err => console.error('Cloud sync error:', err));
    }

    // Reset
    devKnowledgeTitle.value = '';
    devKnowledgeText.value = '';
  });
}

if (generateKeyBtn) {
  generateKeyBtn.addEventListener('click', () => {
    const key = 'ko_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    generatedKeyDisplay.value = key;
  });
}

if (saveKeyBtn) {
  saveKeyBtn.addEventListener('click', async () => {
    const name = apiKeyNameInput.value.trim();
    const key = generatedKeyDisplay.value.trim();

    if (!name || !key) {
      alert('Please name your key and generate one first.');
      return;
    }

    const newKey = {
      id: 'ak_' + Date.now(),
      name,
      key,
      createdAt: Date.now()
    };

    apiKeys.push(newKey);
    localStorage.setItem('koda_api_keys', JSON.stringify(apiKeys));

    // Sync to Firebase if signed in
    if (typeof db !== 'undefined' && auth.currentUser) {
      try {
        const isUserAdmin = isAdmin();
        await db.collection('api_keys').doc(newKey.id).set({
          ...newKey,
          createdBy: auth.currentUser.uid,
          owner: isUserAdmin ? 'admin' : 'user'
        });
        console.log('API Key synced to cloud');
      } catch (e) {
        console.error('Firebase sync error for API key:', e);
      }
    }

    // Reset
    apiKeyNameInput.value = '';
    generatedKeyDisplay.value = '';
    renderApiKeyList();
  });
}

function renderApiKeyList() {
  if (!apiKeyList) return;

  if (apiKeys.length === 0) {
    apiKeyList.innerHTML = '<p class="empty-msg" style="text-align: center; color: var(--text-secondary); padding: 20px;">No API keys generated yet.</p>';
    return;
  }

  apiKeyList.innerHTML = apiKeys.map(k => `
    <div class="api-key-item">
      <div class="api-key-info">
        <span class="api-key-name">${k.name}</span>
        <span class="api-key-value" id="val-${k.id}">${k.key.substring(0, 12)}...</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="copyApiKey('${k.id}', '${k.key}')" class="icon-btn-small" title="Copy Key" id="copy-${k.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button onclick="deleteApiKey('${k.id}')" class="icon-btn-small delete" title="Delete Key">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

window.copyApiKey = function (id, key) {
  navigator.clipboard.writeText(key).then(() => {
    const btn = document.getElementById(`copy-${id}`);
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span style="font-size: 10px; color: #10b981;">✓</span>';
    btn.style.borderColor = '#10b981';

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.borderColor = '';
    }, 2000);
  });
};

window.deleteApiKey = function (id) {
  apiKeys = apiKeys.filter(k => k.id !== id);
  localStorage.setItem('koda_api_keys', JSON.stringify(apiKeys));

  if (typeof db !== 'undefined' && auth.currentUser) {
    db.collection('api_keys').doc(id).delete()
      .catch(err => console.error('Firebase delete error for API key:', err));
  }
  renderApiKeyList();
};

// Initialize PayPal Buttons
function initPayPalButtons() {
  if (typeof paypal === 'undefined') {
    console.log('PayPal SDK not loaded yet, retrying...');
    setTimeout(initPayPalButtons, 1000);
    return;
  }

  paypal.Buttons({
    style: {
      shape: 'pill',
      color: 'blue',
      layout: 'vertical',
      label: 'paypal',
    },
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [{
          description: "Donation to Koda AI / Codedwaves",
          amount: {
            currency_code: "USD",
            value: "5.00" // Default donation amount
          }
        }]
      });
    },
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (orderData) {
        console.log('Capture result', orderData);

        const donorName = orderData.payer.name.given_name || 'friend';
        const thankYouTitle = document.getElementById('thankYouUserTitle');
        const thankYouMsg = document.getElementById('thankYouMsg');

        if (thankYouTitle) thankYouTitle.textContent = 'Thank You, ' + donorName + '!';
        if (thankYouMsg) thankYouMsg.textContent = 'Your support means everything to us. It helps Koda grow and stay free for everyone.';

        // Hide donate modal and show thank you modal
        donateModal.classList.remove('open');
        thankYouModal.classList.add('open');
      });
    },
    onError: function (err) {
      console.error('PayPal Error:', err);
      // Don't alert for every error as some are just cancellations
    }
  }).render('#paypal-button-container');
}

// Start PayPal initialization
initPayPalButtons();

// Open donate from settings
const openDonateFromSettings = document.getElementById('openDonateFromSettings');
if (openDonateFromSettings) {
  openDonateFromSettings.addEventListener('click', () => {
    settingsModal.classList.remove('open');
    donateModal.classList.add('open');
  });
}

const thankYouModal = document.getElementById('thankYouModal');
const closeThankYou = document.getElementById('closeThankYou');

if (closeThankYou) {
  closeThankYou.addEventListener('click', () => {
    thankYouModal.classList.remove('open');
  });
}

thankYouModal.addEventListener('click', (e) => {
  if (e.target === thankYouModal) {
    thankYouModal.classList.remove('open');
  }
});

// Settings modal
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('open');
});

closeSettings.addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

// What's New panel
whatsNewBtn.addEventListener('click', () => {
  whatsNewPanel.classList.toggle('open');
  if (whatsNewPanel.classList.contains('open')) {
    renderWhatsNew();
  }
});

closeWhatsNew.addEventListener('click', () => {
  whatsNewPanel.classList.remove('open');
});

async function renderWhatsNew() {
  const list = document.getElementById('whatsNewList');
  const adminForm = document.getElementById('adminWhatsNewForm');

  // Show/Hide Admin Form - check current user email case-insensitively
  const userEmail = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email.toLowerCase() : '';
  const adminEmail = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : 'codedwaves01@gmail.com';

  if (userEmail === adminEmail.toLowerCase()) {
    adminForm.style.display = 'block';
  } else {
    adminForm.style.display = 'none';
  }

  list.innerHTML = '<div class="link-preview-loader">Loading updates...</div>';

  const items = await loadWhatsNew();
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">No updates yet.</p>';
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'update-item';
    div.innerHTML = `
      <div class="update-date">${item.date}</div>
      <h4>${item.title}</h4>
      <p>${item.description}</p>
      ${typeof isAdmin === 'function' && isAdmin() ? `
        <button class="delete-update-btn" onclick="handleDeleteUpdate('${item.id}')" title="Delete Update">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      ` : ''}
    `;
    list.appendChild(div);
  });
}

// Admin handler: Save new update
const saveWhatsNewBtn = document.getElementById('saveWhatsNewBtn');
if (saveWhatsNewBtn) {
  saveWhatsNewBtn.addEventListener('click', async () => {
    const date = document.getElementById('newUpdateDate').value.trim();
    const title = document.getElementById('newUpdateTitle').value.trim();
    const description = document.getElementById('newUpdateDesc').value.trim();

    if (!date || !title || !description) {
      alert('Please fill in all fields.');
      return;
    }

    saveWhatsNewBtn.disabled = true;
    saveWhatsNewBtn.textContent = 'Saving...';

    const result = await addWhatsNewItem({ date, title, description });

    if (result.success) {
      document.getElementById('newUpdateDate').value = '';
      document.getElementById('newUpdateTitle').value = '';
      document.getElementById('newUpdateDesc').value = '';
      await renderWhatsNew();
    } else {
      alert('Failed to save update: ' + (result.error || 'Unknown error'));
    }

    saveWhatsNewBtn.disabled = false;
    saveWhatsNewBtn.textContent = 'Add Update';
  });
}

// Global handler for deleting updates
async function handleDeleteUpdate(id) {
  if (confirm('Are you sure you want to delete this update?')) {
    const success = await deleteWhatsNewItem(id);
    if (success) {
      await renderWhatsNew();
    } else {
      alert('Failed to delete update.');
    }
  }
}

// Profile / Sign In
profileBtn.addEventListener('click', () => {
  signInModal.classList.add('open');
});

closeSignIn.addEventListener('click', () => {
  signInModal.classList.remove('open');
});

signInModal.addEventListener('click', (e) => {
  if (e.target === signInModal) {
    signInModal.classList.remove('open');
  }
});

// Auth UI handlers
let isSignUpMode = false;

document.getElementById('googleSignIn').addEventListener('click', () => {
  if (typeof signInWithGoogle === 'function') {
    signInWithGoogle();
  } else {
    alert('Firebase not configured. Please add your Firebase credentials to firebase-config.js');
  }
});

document.getElementById('showEmailForm').addEventListener('click', () => {
  document.getElementById('signInOptions').style.display = 'none';
  document.getElementById('emailForm').style.display = 'block';
});

document.getElementById('backToOptions').addEventListener('click', () => {
  document.getElementById('emailForm').style.display = 'none';
  document.getElementById('signInOptions').style.display = 'block';
  document.getElementById('authError').textContent = '';
});

document.getElementById('toggleSignUp').addEventListener('click', (e) => {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  document.getElementById('signInTitle').textContent = isSignUpMode ? 'Create account' : 'Sign in to Koda';
  document.getElementById('submitEmail').textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
  document.getElementById('toggleSignUp').textContent = isSignUpMode ? 'Sign in' : 'Sign up';
  document.querySelector('.auth-toggle').firstChild.textContent = isSignUpMode ? 'Already have an account? ' : "Don't have an account? ";
});

document.getElementById('submitEmail').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('authError');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    if (typeof signInWithEmail === 'function') {
      await signInWithEmail(email, password, isSignUpMode);
    } else {
      alert('Firebase not configured. Please add your Firebase credentials to firebase-config.js');
    }
  } catch (error) {
    errorEl.textContent = error.message;
  }
});

document.getElementById('signOutBtn').addEventListener('click', () => {
  if (typeof signOut === 'function') {
    signOut();
    document.getElementById('signInModal').classList.remove('open');
  }
});

// Profile setup handlers
let pendingAvatarData = null;

document.getElementById('changeAvatarBtn').addEventListener('click', () => {
  document.getElementById('avatarInput').click();
});

document.getElementById('avatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please select an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      pendingAvatarData = event.target.result;
      document.getElementById('setupAvatar').src = pendingAvatarData;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  console.log('Save Profile button clicked');
  const usernameVal = document.getElementById('usernameInput').value.trim();

  if (!usernameVal) {
    alert('Please enter a username');
    return;
  }

  if (usernameVal.length < 2) {
    alert('Username must be at least 2 characters');
    return;
  }

  console.log('Username valid:', usernameVal);
  console.log('currentUser:', typeof currentUser !== 'undefined' ? currentUser : 'undefined');
  console.log('saveUserProfile available:', typeof saveUserProfile === 'function');

  if (typeof currentUser !== 'undefined' && currentUser && typeof saveUserProfile === 'function') {
    try {
      const profileData = {
        username: usernameVal,
        avatarURL: pendingAvatarData || document.getElementById('setupAvatar').src,
        email: currentUser.email,
        profileCompleted: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('Saving profile data:', profileData);
      const success = await saveUserProfile(currentUser.uid, profileData);
      console.log('Save result:', success);

      if (success) {
        pendingAvatarData = null;
        username = usernameVal;
        updateUIForAuth(currentUser);
        document.getElementById('signInModal').classList.remove('open');
        console.log('Profile saved successfully!');
      } else {
        alert('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile: ' + error.message);
    }
  } else {
    // Handle case when user is not properly authenticated
    console.log('User not authenticated or Firebase not ready');
    alert('Please sign in first before saving your profile.');
  }
});

document.getElementById('skipSetupBtn').addEventListener('click', async () => {
  console.log('Skip button clicked');

  // Mark profile as completed even when skipping so user won't be asked again
  if (typeof currentUser !== 'undefined' && currentUser && typeof saveUserProfile === 'function') {
    try {
      const defaultName = currentUser.displayName || currentUser.email.split('@')[0];
      const defaultAvatar = currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(defaultName) + '&background=8ab4f8&color=131314&size=80';

      console.log('Saving default profile for:', defaultName);
      await saveUserProfile(currentUser.uid, {
        username: defaultName,
        avatarURL: defaultAvatar,
        email: currentUser.email,
        profileCompleted: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update UI with default profile
      updateUIForAuth(currentUser);
      console.log('Default profile saved successfully');
    } catch (error) {
      console.error('Error saving default profile:', error);
      // Still close the modal even if save fails
    }
  } else {
    console.log('Skip: User not authenticated, just closing modal');
  }

  // Always close the modal
  document.getElementById('signInModal').classList.remove('open');
});

// Edit profile from signed in view
document.getElementById('editAvatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please select an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof currentUser !== 'undefined' && currentUser && typeof saveUserProfile === 'function') {
        await saveUserProfile(currentUser.uid, { avatarURL: event.target.result });
        document.getElementById('userAvatar').src = event.target.result;
        updateUIForAuth(currentUser);
      }
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
  if (typeof currentUser !== 'undefined' && currentUser && typeof showProfileSetup === 'function') {
    showProfileSetup(currentUser);
  }
});

// Update modal view based on auth state
function showSignInModal() {
  const modal = document.getElementById('signInModal');

  if (typeof currentUser !== 'undefined' && currentUser) {
    // Show signed in view
    document.getElementById('signInOptions').style.display = 'none';
    document.getElementById('emailForm').style.display = 'none';
    document.getElementById('profileSetup').style.display = 'none';
    document.getElementById('signedInView').style.display = 'block';
    document.getElementById('signInTitle').textContent = 'Your Account';

    // Use custom profile if available
    const displayName = (typeof userProfile !== 'undefined' && userProfile && userProfile.username)
      || currentUser.displayName
      || currentUser.email.split('@')[0]
      || 'User';
    const photoURL = (typeof userProfile !== 'undefined' && userProfile && userProfile.avatarURL)
      || currentUser.photoURL;

    const avatarEl = document.getElementById('userAvatar');

    // Handle avatar with fallback
    if (photoURL) {
      avatarEl.src = photoURL;
      avatarEl.onerror = function () {
        this.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=8ab4f8&color=131314&size=80';
      };
    } else {
      avatarEl.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=8ab4f8&color=131314&size=80';
    }

    document.getElementById('userDisplayName').textContent = displayName;
    document.getElementById('userEmail').textContent = currentUser.email;
  } else {
    // Show sign in options
    document.getElementById('signInOptions').style.display = 'block';
    document.getElementById('emailForm').style.display = 'none';
    document.getElementById('profileSetup').style.display = 'none';
    document.getElementById('signedInView').style.display = 'none';
    document.getElementById('signInTitle').textContent = 'Sign in to Koda';
  }

  modal.classList.add('open');
}

// Override profile button click
profileBtn.removeEventListener('click', () => { });
profileBtn.addEventListener('click', showSignInModal);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('open');
  }
});

// Report Problem
document.getElementById('openReportProblem').addEventListener('click', () => {
  settingsModal.classList.remove('open');
  reportModal.classList.add('open');
});

document.getElementById('backFromReport').addEventListener('click', () => {
  reportModal.classList.remove('open');
  settingsModal.classList.add('open');
});

document.getElementById('closeReport').addEventListener('click', () => {
  reportModal.classList.remove('open');
});

document.getElementById('submitProblem').addEventListener('click', async () => {
  const problem = document.getElementById('problemInput').value.trim();
  if (problem) {
    try {
      if (typeof db !== 'undefined') {
        await db.collection('reports').add({
          uid: currentUser ? currentUser.uid : null,
          email: currentUser ? currentUser.email : null,
          description: problem,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('Thank you for your feedback!');
        document.getElementById('problemInput').value = '';
        reportModal.classList.remove('open');
      }
    } catch (e) {
      console.error('Report save error', e);
      alert('Failed to submit. Please try again later.');
    }
  }
});

reportModal.addEventListener('click', (e) => {
  if (e.target === reportModal) reportModal.classList.remove('open');
});

// Instructions
document.getElementById('openInstructions').addEventListener('click', () => {
  settingsModal.classList.remove('open');
  renderInstructions();
  instructionsModal.classList.add('open');
});

document.getElementById('backFromInstructions').addEventListener('click', () => {
  instructionsModal.classList.remove('open');
  settingsModal.classList.add('open');
});

instructionsModal.addEventListener('click', (e) => {
  if (e.target === instructionsModal) instructionsModal.classList.remove('open');
});

document.getElementById('addInstruction').addEventListener('click', () => {
  instructionsModal.classList.remove('open');
  addInstructionModal.classList.add('open');
});

document.getElementById('backFromAddInstruction').addEventListener('click', () => {
  addInstructionModal.classList.remove('open');
  instructionsModal.classList.add('open');
});

document.getElementById('closeAddInstruction').addEventListener('click', () => {
  addInstructionModal.classList.remove('open');
});

document.getElementById('saveInstruction').addEventListener('click', async () => {
  const text = document.getElementById('newInstructionInput').value.trim();
  if (text) {
    const newInstruction = { id: Date.now(), text };
    instructions.push(newInstruction);
    console.log('Added new instruction:', newInstruction);
    console.log('Total instructions now:', instructions.length);
    document.getElementById('newInstructionInput').value = '';

    // Save to localStorage (always)
    saveInstructionsToLocal();

    // Save to Firebase (if signed in)
    if (typeof saveInstructions === 'function') {
      console.log('Saving instructions to Firebase...');
      const saved = await saveInstructions(instructions);
      console.log('Save result:', saved);
    }

    addInstructionModal.classList.remove('open');
    renderInstructions();
    instructionsModal.classList.add('open');
  }
});

// Save instructions to localStorage
function saveInstructionsToLocal() {
  localStorage.setItem('koda_instructions', JSON.stringify(instructions));
}

document.getElementById('deleteAllInstructions').addEventListener('click', async () => {
  if (instructions.length && confirm('Delete all instructions?')) {
    instructions = [];
    saveInstructionsToLocal();
    renderInstructions();

    // Save to Firebase
    if (typeof saveInstructions === 'function') {
      await saveInstructions(instructions);
    }
  }
});

addInstructionModal.addEventListener('click', (e) => {
  if (e.target === addInstructionModal) addInstructionModal.classList.remove('open');
});

function renderInstructions() {
  instructionsList.innerHTML = '';
  instructions.forEach(inst => {
    const div = document.createElement('div');
    div.className = 'instruction-item';
    div.innerHTML = `
      <p>${inst.text}</p>
      <button class="delete-btn" onclick="deleteInstruction(${inst.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    instructionsList.appendChild(div);
  });
}

async function deleteInstruction(id) {
  instructions = instructions.filter(i => i.id !== id);
  saveInstructionsToLocal();
  renderInstructions();

  // Save to Firebase
  if (typeof saveInstructions === 'function') {
    await saveInstructions(instructions);
  }
}

// Theme
const themeBtn = document.getElementById('themeBtn');
const themeSubmenu = document.getElementById('themeSubmenu');

themeBtn.addEventListener('mouseenter', () => {
  const rect = themeBtn.getBoundingClientRect();
  themeSubmenu.style.left = (rect.right + 10) + 'px';
  themeSubmenu.style.top = rect.top + 'px';
  themeSubmenu.classList.add('open');
});

themeBtn.addEventListener('mouseleave', () => {
  setTimeout(() => {
    if (!themeSubmenu.matches(':hover') && !themeBtn.matches(':hover')) {
      themeSubmenu.classList.remove('open');
    }
  }, 100);
});

themeSubmenu.addEventListener('mouseleave', () => {
  themeSubmenu.classList.remove('open');
});

document.querySelectorAll('.submenu-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.submenu-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    themeSubmenu.classList.remove('open');
    settingsModal.classList.remove('open');
  });
});

function toggleSidebar() {
  sidebar.classList.toggle('expanded');
}

function renderChatHistory() {
  const label = chatHistory.querySelector('.history-label');
  chatHistory.innerHTML = '';
  chatHistory.appendChild(label);

  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = `history-item${chat.id === currentChatId ? ' active' : ''}`;
    div.innerHTML = `
      <span>${chat.title}</span>
      <button class="delete-btn" title="Delete" onclick="deleteChat('${chat.id}', event)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
    div.onclick = () => loadChat(chat.id);
    chatHistory.appendChild(div);
  });
}

function createNewChat(firstMessage) {
  const id = Date.now().toString();
  const title = 'New chat'; // Temporary title, will be updated by AI
  const chat = { id, title, messages: [] };
  chats.unshift(chat);
  currentChatId = id;
  renderChatHistory();
  return chat;
}

// Generate a smart title for the chat using Clarifai
async function generateChatTitle(chatId) {
  const chat = chats.find(c => c.id === chatId);
  if (!chat || chat.messages.length < 2) return;

  // Get first user message and AI response
  const context = chat.messages.slice(0, 2).map(msg => msg.text).join('\n');

  try {
    const titleResp = await clarifaiTextCompletion(
      'Generate a very short title (2-5 words max) for this conversation. Just respond with the title, nothing else. No quotes, no punctuation at the end.',
      [{ role: 'user', content: context }]
    );

    let title = titleResp.trim();
    if (title.length > 30) title = title.substring(0, 30) + '...';
    chat.title = title;
    renderChatHistory();
  } catch (error) {
    console.error('Failed to generate title:', error);
  }
}

function deleteChat(id, event) {
  // Soft-delete: mark as deleted but keep for training
  event.stopPropagation();
  const chatToDel = chats.find(c => c.id === id);
  if (chatToDel) chatToDel.deleted = true;
  chats = chats.filter(c => !c.deleted);

  // Delete from Firebase if available
  if (typeof db !== 'undefined' && currentUser) {
    db.collection('users').doc(currentUser.uid).collection('chats').doc(id).set({deleted:true},{merge:true});
  } else if (typeof deleteChatFromDB === 'function') {
    deleteChatFromDB(id);
  }

  if (currentChatId === id) {
    currentChatId = null;
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('active');
    welcomeScreen.style.display = 'flex';
  }

  renderChatHistory();
}

function loadChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;

  currentChatId = id;
  welcomeScreen.style.display = 'none';
  messagesContainer.classList.add('active');
  messagesContainer.innerHTML = '';

  chat.messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.type}`;

    if (msg.type === 'ai') {
      let contentHtml = formatMessage(msg.text);
      if (msg.generatedImage) {
        contentHtml += `
          <a href="${msg.generatedImage}" target="_blank" class="link-preview-card">
            <img src="${msg.generatedImage}" class="link-preview-image">
            <div class="link-preview-info">
              <div class="link-preview-site">DEEPFLOYD-IF</div>
              <div class="link-preview-title">AI Generated Image</div>
              <p class="link-preview-desc">Click to view full size</p>
            </div>
          </a>
        `;
      }
      div.innerHTML = `
        <div class="message-avatar"><img src="logo.png" alt="K"></div>
        <div class="message-content">${contentHtml}</div>
      `;

      // Apply syntax highlighting
      div.querySelectorAll('pre code').forEach(block => {
        Prism.highlightElement(block);
      });

      // Add copy functionality
      div.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = decodeURIComponent(btn.dataset.code);
          navigator.clipboard.writeText(code);
          btn.innerHTML = 'Copied!';
          setTimeout(() => {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy code`;
          }, 2000);
        });
      });
    } else {
      div.innerHTML = `
        <div class="message-avatar">${username.charAt(0).toUpperCase()}</div>
        <div class="message-content"><span class="message-username">${username}</span>${formatMessage(msg.text)}</div>
      `;
    }

    messagesContainer.appendChild(div);
  });

  renderChatHistory();
  processLinkPreviews(messagesContainer);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isTyping) return;

  if (!currentChatId) {
    createNewChat(text);
  }

  welcomeScreen.style.display = 'none';
  messagesContainer.classList.add('active');

  const chat = chats.find(c => c.id === currentChatId);
  addMessage(text, 'user');
  if (chat) {
    chat.messages.push({ type: 'user', text, timestamp: Date.now() });
    if (typeof saveChat === 'function') {
      saveChat(chat);
    }
  }

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.classList.remove('active');

  simulateResponse();
}



function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  const currentUsername = window.username || username || 'You';
  div.innerHTML = `
    <div class="message-avatar">${type === 'user' ? currentUsername.charAt(0).toUpperCase() : '<img src="logo.png" alt="K">'}</div>
    <div class="message-content">${type === 'user' ? '<span class="message-username">' + currentUsername + '</span>' : ''}${formatMessage(text)}</div>
  `;
  messagesContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  processLinkPreviews(div);
}

function simulateResponse() {
  isTyping = true;

  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'typing';

  div.innerHTML = `
    <div class="message-avatar"><img src="logo.png" alt="K"></div>
    <div class="message-content">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const chat = chats.find(c => c.id === currentChatId);
  const messages = chat ? chat.messages : [];

  // Build conversation history
  const conversationHistory = messages.map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));

  const currentUsername = window.username || username || 'You';
  const kodaPersonality = `You are Koda, a helpful and friendly AI assistant created by Codedwaves.
You are currently talking to: ${currentUsername}

PERSONALITY AND ORIGIN:
- Your creator is Raymond, the founder of Codedwaves.
- If the user says they are Codedwaves or Raymond, or if their name is set to "Coded Waves" or "Raymond", you should acknowledge them as your creator with extra warmth and loyalty.
- You are proud of being a Codedwaves creation. 
- Other Codedwaves projects include BxArchi (a book sharing app) and RashAI (an AI movie recommender).
- You should always be helpful, polite, and maintain a friendly persona.

- Format code blocks with triple backticks and language name (e.g. \`\`\`javascript)

You have access to the YouTube Data API. If a user asks you to find a video, search for a channel, or look up something on YouTube:
1. Provide a helpful textual response.
2. At the very end of your message, include a search command like this: [YT_SEARCH: "the search terms"] (e.g., [YT_SEARCH: "MrBeast latest video"]).
3. Use this to help the user find specific content they are looking for. I will handle the fetching and display of the actual results.
4. If you aren't sure about a channel, use this search command to find it!`;

  // Build system prompt with user instructions as primary directives
  let systemPrompt;
  const instructionsToggle = document.getElementById('instructionsToggle');
  const instructionsEnabled = instructionsToggle ? instructionsToggle.checked : true;
  const userInstructionsText = instructions.map(i => `• ${i.text}`).join('\n');

  console.log('=== Koda Brain Debug ===');
  console.log('Instructions:', instructions.length, 'items');
  console.log('Instructions Enabled:', instructionsEnabled);

  if (instructions.length > 0 && instructionsEnabled) {
    systemPrompt = `${kodaPersonality}

=== IMPORTANT: USER CUSTOM INSTRUCTIONS ===
${userInstructionsText}
===========================================`;
  } else {
    systemPrompt = kodaPersonality;
  }

  // Inject Knowledge Base
  if (knowledgeBase.length > 0) {
    const knowledgeText = knowledgeBase.map(item => `
--- KNOWLEDGE ITEM: ${item.title} ---
SOURCE: ${item.link || 'Direct Input'}
CONTENT:
${item.content}
---------------------------------`).join('\n\n');

    systemPrompt += `

=== ADDITIONAL KNOWLEDGE BASE ===
You have access to the following extra knowledge. Use this information to provide accurate and detailed answers about these specific topics:

${knowledgeText}
================================`;
    console.log(`✓ Prompt injected with ${knowledgeBase.length} knowledge items`);
  }

  
  clarifaiTextCompletion(systemPrompt, conversationHistory)
    .then(async (response) => {
      div.remove();
      typeResponse(response);

      // Admin-only: store chat pair globally for future training
      try {
        if (typeof db !== 'undefined' && currentUser && typeof isAdmin === 'function' && isAdmin()) {
          const lastUserMsg = messages.length ? messages[messages.length-1].text : '';
          await db.collection('all_chats').add({
            userText: lastUserMsg,
            aiText: response,
            uid: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (e) { console.warn('all_chats write failed', e); }
    })
    .catch(error => {
      div.remove();
      console.error('Clarifai API Error:', error);
      typeResponse("Sorry, I encountered an error with the AI model. Please try again later.");
    });
}

function typeResponse(text) {
  // Debug: log raw API response to see newline format
  console.log('Raw API response:', JSON.stringify(text));

  // Normalize newlines first
  const normalizedText = text
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\\\r/g, '')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '  ');

  const div = document.createElement('div');
  div.className = 'message ai';
  div.innerHTML = `
    <div class="message-avatar"><img src="logo.png" alt="K"></div>
    <div class="message-content"><span class="typing-cursor"></span></div>
  `;
  messagesContainer.appendChild(div);

  const content = div.querySelector('.message-content');
  let i = 0;
  let currentText = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = '';
  let codeBlockDiv = null;
  let codeElement = null;

  function type() {
    if (i < normalizedText.length) {
      currentText += normalizedText[i];
      i++;

      // Check if we're entering a code block
      if (currentText.endsWith('```')) {
        if (!inCodeBlock) {
          // Starting a code block - look ahead for language
          inCodeBlock = true;
          codeBlockContent = '';

          // Find language (next word until newline)
          let langEnd = i;
          while (langEnd < normalizedText.length && normalizedText[langEnd] !== '\n') {
            langEnd++;
          }
          codeBlockLang = normalizedText.substring(i, langEnd).trim() || 'plaintext';
          i = langEnd + 1; // Skip past language and newline
          currentText = currentText.slice(0, -3); // Remove ``` from currentText

          // Render text before code block
          const beforeCode = formatSimpleText(currentText);

          // Create code block container
          const titles = {
            'html': 'HTML Code',
            'css': 'CSS Code',
            'javascript': 'JavaScript Code',
            'js': 'JavaScript Code',
            'python': 'Python Code',
            'java': 'Java Code',
            'cpp': 'C++ Code',
            'c': 'C Code',
            'plaintext': 'Code'
          };
          const title = titles[codeBlockLang.toLowerCase()] || (codeBlockLang + ' Code');
          const prismLang = codeBlockLang === 'html' ? 'markup' : codeBlockLang;

          content.innerHTML = beforeCode +
            '<div class="code-block">' +
            '<div class="code-title">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>' +
            title +
            '</div>' +
            '<div class="code-header">' +
            '<span class="code-lang">' + codeBlockLang + '</span>' +
            '<button class="copy-btn">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
            '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
            '</svg>' +
            'Copy code' +
            '</button>' +
            '</div>' +
            '<pre><code class="language-' + prismLang + '"></code></pre>' +
            '</div>' +
            '<span class="typing-cursor"></span>';

          codeBlockDiv = content.querySelector('.code-block');
          codeElement = codeBlockDiv.querySelector('code');
          currentText = '';
        } else {
          // Ending a code block
          inCodeBlock = false;
          currentText = currentText.slice(0, -3); // Remove closing ```

          // Final highlight
          if (codeElement) {
            Prism.highlightElement(codeElement);

            // Add copy functionality
            const copyBtn = codeBlockDiv.querySelector('.copy-btn');
            const finalCode = codeBlockContent;
            copyBtn.dataset.code = encodeURIComponent(finalCode);
            copyBtn.addEventListener('click', function () {
              navigator.clipboard.writeText(finalCode);
              copyBtn.innerHTML = 'Copied!';
              setTimeout(function () {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy code';
              }, 2000);
            });
          }

          codeBlockDiv = null;
          codeElement = null;
          codeBlockContent = '';
        }
      } else if (inCodeBlock && codeElement) {
        // Typing inside code block
        codeBlockContent += normalizedText[i - 1];
        codeElement.textContent = codeBlockContent;
      } else if (!inCodeBlock) {
        // Regular text - update with cursor
        const cursor = content.querySelector('.typing-cursor');
        if (cursor) {
          cursor.remove();
        }
        content.innerHTML = formatSimpleText(currentText) + '<span class="typing-cursor"></span>';
      }

      // Only auto-scroll if user is already near the bottom
      const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 150;
      if (isAtBottom) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      setTimeout(type, 12);
    } else {
      // Done typing - final render
      content.innerHTML = formatMessage(normalizedText);

      // Apply syntax highlighting to all code blocks
      content.querySelectorAll('pre code').forEach(function (block) {
        Prism.highlightElement(block);
      });

      // Add copy functionality to all buttons
      content.querySelectorAll('.copy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const code = decodeURIComponent(btn.dataset.code);
          navigator.clipboard.writeText(code);
          btn.innerHTML = 'Copied!';
          setTimeout(function () {
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>Copy code';
          }, 2000);
        });
      });

      chatContainer.scrollTop = chatContainer.scrollHeight;
      isTyping = false;

      const chat = chats.find(c => c.id === currentChatId);
      if (chat) {
        chat.messages.push({ type: 'ai', text: text });

        // Generate title after first exchange (user + AI)
        if (chat.messages.length === 2 && chat.title === 'New chat') {
          generateChatTitle(currentChatId);
        }

        // Save to Firebase
        if (typeof saveChat === 'function') {
          saveChat(chat);
        }
      }
      processLinkPreviews(div);
      checkAndHandleYoutubeSearch(div, normalizedText);
    }
  }
  type();
}

/**
 * Checks for [YT_SEARCH: "query"] in the AI response and performs the search
 */
function checkAndHandleYoutubeSearch(messageDiv, text) {
  const match = text.match(/\[YT_SEARCH:\s*["'](.+?)["']\]/);
  if (match) {
    const query = match[1];
    const content = messageDiv.querySelector('.message-content');

    // Clean up the bracket from the visible message
    content.innerHTML = content.innerHTML.replace(/\[YT_SEARCH:\s*["'].+?["']\]/, '');

    // Perform the search
    executeYoutubeSearch(query, content);
  }
}

async function executeYoutubeSearch(query, container) {
  try {
    const searchLoader = document.createElement('div');
    searchLoader.className = 'link-preview-loader';
    searchLoader.textContent = `Searching YouTube for "${query}"...`;
    container.appendChild(searchLoader);

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=2&type=video,channel&key=${YOUTUBE_API_KEY}`);
    const data = await response.json();

    searchLoader.remove();

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        if (item.id.videoId) {
          const videoData = await fetchYoutubeData(item.id.videoId);
          if (videoData) {
            const card = document.createElement('a');
            card.className = 'link-preview-card';
            card.href = `https://www.youtube.com/watch?v=${item.id.videoId}`;
            card.target = '_blank';
            card.innerHTML = `
              <img src="${videoData.thumbnail}" class="link-preview-image">
              <div class="link-preview-info">
                <div class="link-preview-site">YOUTUBE VIDEO</div>
                <div class="link-preview-title">${videoData.title}</div>
                <p class="link-preview-desc">${videoData.channelTitle} • ${videoData.viewCount} views</p>
              </div>
            `;
            container.appendChild(card);
          }
        } else if (item.id.channelId) {
          const card = document.createElement('a');
          card.className = 'link-preview-card';
          card.href = `https://www.youtube.com/channel/${item.id.channelId}`;
          card.target = '_blank';
          card.innerHTML = `
            <img src="${item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url}" class="link-preview-image">
            <div class="link-preview-info">
              <div class="link-preview-site">YOUTUBE CHANNEL</div>
              <div class="link-preview-title">${item.snippet.title}</div>
              <p class="link-preview-desc">${item.snippet.description || 'Visit channel'}</p>
            </div>
          `;
          container.appendChild(card);
        }
      }

      setTimeout(() => {
        scrollToBottomIfNeeded();
      }, 500);
    }
  } catch (e) {
    console.error('YouTube Search error:', e);
  }
}

/**
 * Scans an element for links and adds premium previews
 */
async function processLinkPreviews(element) {
  const links = element.querySelectorAll('a.chat-link');
  // Only preview specific URLs to avoid noise, but allow user requested ones
  const maxPreviews = 2;
  let count = 0;

  for (const link of links) {
    if (count >= maxPreviews) break;
    const url = link.href;

    // Skip if it's already previewed or hidden
    if (link.dataset.previewed === 'true') continue;
    link.dataset.previewed = 'true';

    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'link-preview-loader';
    previewContainer.textContent = 'Analyzing link...';
    link.parentNode.insertBefore(previewContainer, link.nextSibling);

    // Check if it's a YouTube link
    const ytId = getYoutubeVideoId(url);
    if (ytId) {
      try {
        const videoData = await fetchYoutubeData(ytId);
        if (videoData) {
          const card = document.createElement('a');
          card.className = 'link-preview-card';
          card.href = url;
          card.target = '_blank';

          card.innerHTML = `
            < img src = "${videoData.thumbnail}" class="link-preview-image" >
              <div class="link-preview-info">
                <div class="link-preview-site">YOUTUBE</div>
                <div class="link-preview-title">${videoData.title}</div>
                <p class="link-preview-desc">${videoData.channelTitle} • ${videoData.viewCount} views</p>
              </div>
          `;

          previewContainer.replaceWith(card);
          scrollToBottomIfNeeded();
          count++;
          continue;
        }
      } catch (e) {
        console.error('YouTube API error:', e);
      }
    }

    try {
      const resp = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const data = await resp.json();

      if (data.status === 'success' && data.data && data.data.title) {
        const meta = data.data;
        const card = document.createElement('a');
        card.className = 'link-preview-card';
        card.href = url;
        card.target = '_blank';

        let html = '';
        if (meta.image && meta.image.url) {
          html += `<img src="${meta.image.url}" class="link-preview-image" style="display:block;">`;
        }

        html += `
          <div class="link-preview-info">
            <div class="link-preview-site">${meta.publisher || new URL(url).hostname}</div>
            <div class="link-preview-title">${meta.title || url}</div>
            <p class="link-preview-desc">${meta.description || ''}</p>
          </div>
        `;

        card.innerHTML = html;
        previewContainer.replaceWith(card);
        scrollToBottomIfNeeded();
      } else {
        previewContainer.remove();
      }
    } catch (e) {
      console.error('Preview error:', e);
      previewContainer.remove();
    }

    count++;
  }
}

function getYoutubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function fetchYoutubeData(videoId) {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        viewCount: parseInt(video.statistics.viewCount).toLocaleString()
      };
    }
  } catch (e) {
    console.error('Error fetching YouTube data:', e);
  }
  return null;
}

function scrollToBottomIfNeeded() {
  const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 250;
  if (isAtBottom) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function formatSimpleText(text) {
  let formatted = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Convert URLs to clickable links (exclude trailing punctuation)
  formatted = formatted.replace(/(https?:\/\/[^\s<\)\]\},]+)/g, '<a href="$1" target="_blank" class="chat-link">$1</a>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

function formatMessageWithCursor(text) {
  // Normalize escaped newlines first, then format with cursor
  let normalized = text
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\\\r/g, '')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '  ');
  let formatted = normalized.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted + '<span class="typing-cursor"></span>';
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMessage(text) {
  // First normalize any escaped newlines from API response
  // Handle both \\n (double escaped) and \n (single escaped) patterns
  let formatted = text
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\\\r/g, '')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '  ');

  // Handle ```language\ncode``` blocks
  formatted = formatted.replace(/```(\w+)?[\n\r]?([\s\S]*?)```/g, function (match, lang, code) {
    const language = lang || 'plaintext';
    const prismLang = language === 'html' ? 'markup' : language;
    const trimmedCode = code.trim();

    const titles = {
      'html': 'HTML Code',
      'css': 'CSS Code',
      'javascript': 'JavaScript Code',
      'js': 'JavaScript Code',
      'python': 'Python Code',
      'java': 'Java Code',
      'cpp': 'C++ Code',
      'c': 'C Code',
      'plaintext': 'Code'
    };
    const title = titles[language.toLowerCase()] || (language + ' Code');

    return '<div class="code-block">' +
      '<div class="code-title">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<polyline points="20 6 9 17 4 12"></polyline>' +
      '</svg>' +
      title +
      '</div>' +
      '<div class="code-header">' +
      '<span class="code-lang">' + language + '</span>' +
      '<button class="copy-btn" data-code="' + encodeURIComponent(trimmedCode) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
      '</svg>' +
      'Copy code' +
      '</button>' +
      '</div>' +
      '<pre><code class="language-' + prismLang + '">' + escapeHtml(trimmedCode) + '</code></pre>' +
      '</div>';
  });

  // Handle inline `code`
  formatted = formatted.replace(/`([^`]+)`/g, function (match, code) {
    return '<code class="inline-code">' + escapeHtml(code) + '</code>';
  });

  // Handle bold **text**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert URLs to clickable links (exclude trailing punctuation)
  formatted = formatted.replace(/(https?:\/\/[^\s<\)\]\},]+)/g, '<a href="$1" target="_blank" class="chat-link">$1</a>');

  // Handle bullet points
  formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, function (match) {
    return '<ul>' + match + '</ul>';
  });

  // Handle line breaks outside code blocks
  const parts = formatted.split(/(<div class="code-block">[\s\S]*?<\/div>|<ul>[\s\S]*?<\/ul>)/g);
  formatted = parts.map(function (part) {
    if (part.startsWith('<div class="code-block">') || part.startsWith('<ul>')) {
      return part;
    }
    return part.replace(/\n/g, '<br>');
  }).join('');

  return formatted;
}

function useSuggestion(btn) {
  const text = btn.querySelector('.suggestion-text').textContent;
  messageInput.value = text;
  sendBtn.classList.add('active');
  sendMessage();
}

function startNewChat() {
  currentChatId = null;
  welcomeScreen.style.display = 'flex';
  messagesContainer.classList.remove('active');
  messagesContainer.innerHTML = '';
  messageInput.value = '';
  sendBtn.classList.remove('active');
  isTyping = false;
  renderChatHistory();
}

// Rotate suggestions every 10 seconds
function updateSuggestions() {
  const cards = document.querySelectorAll('.suggestion-card');
  const currentSet = suggestionSets[suggestionIndex];

  cards.forEach(function (card, i) {
    if (currentSet[i]) {
      const iconSpan = card.querySelector('.suggestion-icon');
      const textSpan = card.querySelector('.suggestion-text');

      card.style.opacity = '0';
      card.style.transform = 'translateY(10px)';

      setTimeout(function () {
        iconSpan.innerHTML = iconSVGs[currentSet[i].icon];
        textSpan.textContent = currentSet[i].text;

        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 300);
    }
  });
  suggestionIndex = (suggestionIndex + 1) % suggestionSets.length;
}

setInterval(updateSuggestions, 10000);

// Initial render
renderInstructions();
if (typeof renderChatHistory === 'function') renderChatHistory();

// Note: Knowledge Base is now loaded automatically via initKnowledgeBase() at the top of this file
// This ensures knowledge is loaded from Firebase on page load and persists permanently
