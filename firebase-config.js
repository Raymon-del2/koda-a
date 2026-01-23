// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyoBS2qSBYCQCzfJcoKig44H-gD2lpjqc",
  authDomain: "koda-021.firebaseapp.com",
  projectId: "koda-021",
  storageBucket: "koda-021.firebasestorage.app",
  messagingSenderId: "430672411340",
  appId: "1:430672411340:web:69a7a82ddbe926a71c6069",
  measurementId: "G-MY056KJXWS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Global state - defined here so they're available for both scripts
let chats = [];
let instructions = [];
let currentUser = null;
let userProfile = null;

let whatsNewItems = [];
let apiKeys = [];

const ADMIN_EMAIL = 'codedwaves01@gmail.com'.toLowerCase(); // Admin account

function isAdmin() {
  const userEmail = (currentUser && currentUser.email) ? currentUser.email.toLowerCase() : '';
  const result = userEmail === ADMIN_EMAIL;
  return result;
}

// --- Function Definitions (Defined first to avoid hoisting issues) ---

// Load "What's New" items from Firestore (Global)
async function loadWhatsNew() {
  try {
    console.log('Fetching What\'s New updates...');
    const snapshot = await db.collection('whats_new').orderBy('timestamp', 'desc').get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    whatsNewItems = items;
    return items;
  } catch (error) {
    console.error('Error loading what\'s new:', error);
    return [];
  }
}

// Save a new "What's New" item (Admin only)
async function addWhatsNewItem(item) {
  if (!isAdmin()) {
    console.error('Add failed: User is not admin');
    return { success: false, error: 'User is not admin' };
  }

  try {
    console.log('Attempting to add what\'s new item to Firebase...');
    const docRef = await db.collection('whats_new').add({
      ...item,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Successfully added item with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Firebase Error adding what\'s new item:', error);
    return { success: false, error: error.message };
  }
}

// Delete a "What's New" item (Admin only)
async function deleteWhatsNewItem(id) {
  if (!isAdmin()) return false;
  try {
    await db.collection('whats_new').doc(id).delete();
    return true;
  } catch (error) {
    console.error('Error deleting what\'s new item:', error);
    return false;
  }
}

// Load user instructions from Firestore
async function loadInstructions() {
  if (!currentUser) {
    return [];
  }

  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();

    if (doc.exists && doc.data().instructions && Array.isArray(doc.data().instructions)) {
      const loadedInstructions = doc.data().instructions;
      return loadedInstructions;
    }

    return [];
  } catch (error) {
    console.error('Error loading instructions:', error);
    return [];
  }
}

// Save user instructions to Firestore
async function saveInstructions(instructionsArray) {
  if (!currentUser) {
    return false;
  }

  try {
    console.log('Saving instructions to Firebase:', instructionsArray.length, 'items');
    await db.collection('users').doc(currentUser.uid).set({
      instructions: instructionsArray
    }, { merge: true });
    console.log('Instructions saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving instructions:', error);
    return false;
  }
}

// Load user profile from Firestore
async function loadUserProfile(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

// Save user profile to Firestore
async function saveUserProfile(uid, profileData) {
  try {
    await db.collection('users').doc(uid).set(profileData, { merge: true });
    userProfile = { ...userProfile, ...profileData };
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
}

// Load user's chats from Firestore
async function loadUserChats() {
  if (!currentUser) return;

  try {
    const snapshot = await db.collection('users').doc(currentUser.uid)
      .collection('chats')
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (typeof renderChatHistory === 'function') {
      renderChatHistory();
    }
  } catch (error) {
    console.error('Error loading chats:', error);
  }
}

// Save chat to Firestore
async function saveChat(chat) {
  if (!currentUser) return;

  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('chats').doc(chat.id)
      .set({
        title: chat.title,
        messages: chat.messages.map(m => ({
          type: m.type,
          text: m.text,
          timestamp: m.timestamp || Date.now()
        })),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  } catch (error) {
    console.error('Error saving chat:', error);
  }
}

// Delete chat from Firestore
async function deleteChatFromDB(chatId) {
  if (!currentUser) return;

  try {
    await db.collection('users').doc(currentUser.uid)
      .collection('chats').doc(chatId).delete();
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
}

// ===== KNOWLEDGE BASE PERSISTENCE =====

// Load knowledge base from Firebase (global collection)
async function loadKnowledgeBase() {
  try {
    const snapshot = await db.collection('knowledge').orderBy('timestamp', 'desc').get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('✓ Knowledge Base loaded:', items.length, 'items');
    // Always update localStorage as backup
    localStorage.setItem('koda_knowledge', JSON.stringify(items));
    return items;
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    // Fallback to localStorage
    const localKB = localStorage.getItem('koda_knowledge');
    if (localKB) {
      try {
        return JSON.parse(localKB);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}

// Save a knowledge item to Firebase
async function saveKnowledgeItem(item) {
  try {
    await db.collection('knowledge').doc(item.id).set({
      ...item,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Knowledge item saved to cloud:', item.id);
    return true;
  } catch (error) {
    console.error('Error saving knowledge item:', error);
    return false;
  }
}

// Delete a knowledge item from Firebase
async function deleteKnowledgeItem(id) {
  try {
    await db.collection('knowledge').doc(id).delete();
    console.log('✓ Knowledge item deleted from cloud:', id);
    return true;
  } catch (error) {
    console.error('Error deleting knowledge item:', error);
    return false;
  }
}

// Sync all local knowledge to Firebase (for migration)
async function syncAllKnowledgeToCloud(items) {
  console.log('Syncing all knowledge to Firebase:', items.length, 'items');
  const batch = db.batch();
  
  for (const item of items) {
    const docRef = db.collection('knowledge').doc(item.id);
    batch.set(docRef, {
      ...item,
      timestamp: item.timestamp || firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  
  try {
    await batch.commit();
    console.log('✓ All knowledge synced to cloud');
    return true;
  } catch (error) {
    console.error('Error syncing knowledge:', error);
    return false;
  }
}

// Load user's API keys from Firestore
async function loadUserApiKeys() {
  if (!currentUser) return;

  try {
    // If admin, load all admin keys, else load keys created by user
    let query = db.collection('api_keys');
    if (!isAdmin()) {
      query = query.where('createdBy', '==', currentUser.uid);
    } else {
      query = query.where('owner', '==', 'admin');
    }

    const snapshot = await query.get();
    apiKeys = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Update local storage for fallback
    localStorage.setItem('koda_api_keys', JSON.stringify(apiKeys));

    if (typeof renderApiKeyList === 'function') {
      renderApiKeyList();
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
  }
}

// --- Auth state observer ---

auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  if (user) {
    // 1. Load Profile
    userProfile = await loadUserProfile(user.uid);
    updateUIForAuth(user);

    // 2. Load Chats
    loadUserChats();

    // 3. Load Instructions
    const firebaseInstructions = await loadInstructions();
    if (firebaseInstructions && firebaseInstructions.length > 0) {
      instructions = firebaseInstructions;
      if (typeof renderInstructions === 'function') {
        renderInstructions();
      }
    }

    // 4. Load API Keys
    loadUserApiKeys();

    // 5. Check if profile needs setup
    if (!userProfile || !userProfile.profileCompleted) {
      showProfileSetup(user);
    }
  } else {
    userProfile = null;
    updateUIForAuth(null);
    chats = [];
    instructions = [];
    apiKeys = [];
    if (typeof renderChatHistory === 'function') renderChatHistory();
    if (typeof renderInstructions === 'function') renderInstructions();
    if (typeof renderApiKeyList === 'function') renderApiKeyList();
  }
});

// --- Auth Helper Functions ---

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider).catch(error => {
    console.error('Google Sign In Error:', error);
    alert('Sign in failed: ' + error.message);
  });
}

function signInWithEmail(email, password, isSignUp = false) {
  if (isSignUp) {
    return auth.createUserWithEmailAndPassword(email, password);
  } else {
    return auth.signInWithEmailAndPassword(email, password);
  }
}

function signOut() {
  return auth.signOut().catch(error => {
    console.error('Sign Out Error:', error);
  });
}

// --- UI Helper Functions ---

function showProfileSetup(user) {
  const modal = document.getElementById('signInModal');
  if (!modal) return;

  document.getElementById('signInOptions').style.display = 'none';
  document.getElementById('emailForm').style.display = 'none';
  document.getElementById('signedInView').style.display = 'none';
  document.getElementById('profileSetup').style.display = 'block';
  document.getElementById('signInTitle').textContent = 'Welcome to Koda!';

  const setupAvatar = document.getElementById('setupAvatar');
  const defaultName = user.displayName || user.email.split('@')[0];
  const avatarUrl = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(defaultName) + '&background=8ab4f8&color=131314&size=80';

  setupAvatar.src = avatarUrl;
  setupAvatar.onerror = function () {
    this.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(defaultName) + '&background=8ab4f8&color=131314&size=80';
  };

  document.getElementById('usernameInput').value = defaultName;
  modal.classList.add('open');
}

function updateUIForAuth(user, retryCount = 0) {
  // If no user, reset immediately
  if (!user) {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const profileIcon = document.getElementById('profileIcon');
    const profileLabel = document.getElementById('profileLabel');
    const knowledgeBtn = document.getElementById('knowledgeBtn');
    const devBtn = document.getElementById('devBtn');
    if (sidebarAvatar) sidebarAvatar.style.display = 'none';
    if (profileIcon) profileIcon.style.display = 'block';
    if (profileLabel) profileLabel.textContent = 'Sign in';
    if (knowledgeBtn) knowledgeBtn.style.display = 'none';
    if (devBtn) devBtn.style.display = 'none';
    if (typeof window !== 'undefined') window.username = 'You';
    return;
  }

  // Check if critical elements exist
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const profileIcon = document.getElementById('profileIcon');
  const profileLabel = document.getElementById('profileLabel');

  // If elements aren't ready yet, retry a few times (helps with race conditions)
  if (!sidebarAvatar && retryCount < 10) {
    setTimeout(() => updateUIForAuth(user, retryCount + 1), 100);
    return;
  }

  const name = userProfile?.username || user.displayName || user.email.split('@')[0];
  const avatar = userProfile?.avatarURL || user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=8ab4f8&color=131314&size=80';


  // Update Profile Modal (Top)
  const userAvatar = document.getElementById('userAvatar');
  const userDisplayName = document.getElementById('userDisplayName');
  const userEmail = document.getElementById('userEmail');
  if (userAvatar) userAvatar.src = avatar;
  if (userDisplayName) userDisplayName.textContent = name;
  if (userEmail) userEmail.textContent = user.email;

  // Update Sidebar (Bottom)
  if (sidebarAvatar) {
    sidebarAvatar.src = avatar;
    sidebarAvatar.style.display = 'block';
    sidebarAvatar.style.visibility = 'visible';
    sidebarAvatar.style.opacity = '1';
  }

  if (profileIcon) {
    profileIcon.style.display = 'none';
    profileIcon.style.visibility = 'hidden';
  }

  if (profileLabel) {
    profileLabel.textContent = name;
  }

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.title = 'Account: ' + name;
  }

  // Update global username for script.js
  if (typeof window !== 'undefined') {
    window.username = name;
  }

  // Show knowledge and dev button only for admin
  const knowledgeBtn = document.getElementById('knowledgeBtn');
  const devBtn = document.getElementById('devBtn');
  const isUserAdmin = isAdmin();

  if (knowledgeBtn) knowledgeBtn.style.display = isUserAdmin ? 'flex' : 'none';
  if (devBtn) devBtn.style.display = 'flex';

  // Close modal if profile is completed
  const signInModal = document.getElementById('signInModal');
  if (userProfile && userProfile.profileCompleted && signInModal) {
    signInModal.classList.remove('open');
  }

  // Refresh What's New if open
  const whatsNewPanel = document.getElementById('whatsNewPanel');
  if (whatsNewPanel && whatsNewPanel.classList.contains('open')) {
    if (typeof renderWhatsNew === 'function') renderWhatsNew();
  }
}