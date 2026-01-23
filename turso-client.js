// Firebase Firestore Client for API Key Management
// Using Firebase instead of Turso to avoid CORS issues

// Get Firestore instance (already initialized in firebase-config.js)
function getFirestore() {
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    return firebase.firestore();
  }
  return null;
}

// Initialize database schema (no-op for Firestore - it's schemaless)
async function initTursoSchema() {
  console.log('✓ Firebase Firestore ready for API keys');
  return true;
}

// API Key Operations using Firebase Firestore
async function getApiKeysFromTurso() {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      console.error('Firestore not available');
      return [];
    }

    const snapshot = await firestore.collection('api_keys').orderBy('createdAt', 'desc').get();
    const keys = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      keys.push({
        id: doc.id,
        name: data.name,
        key: data.key,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(),
        isSelected: data.isSelected || false
      });
    });
    return keys;
  } catch (error) {
    console.error('Failed to fetch API keys from Firestore:', error);
    return [];
  }
}

async function addApiKeyToTurso(name, key) {
  try {
    console.log('Adding API key to Firestore...');
    const firestore = getFirestore();
    if (!firestore) {
      console.error('Firestore not available');
      return false;
    }

    // Check if this is the first key, make it selected
    const existingKeys = await getApiKeysFromTurso();
    const isSelected = existingKeys.length === 0;

    await firestore.collection('api_keys').add({
      name: name,
      key: key,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isSelected: isSelected
    });

    console.log('✓ API key added to Firestore');
    return true;
  } catch (error) {
    console.error('Failed to add API key to Firestore:', error);
    return false;
  }
}

async function deleteApiKeyFromTurso(id) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      console.error('Firestore not available');
      return false;
    }

    await firestore.collection('api_keys').doc(id).delete();
    console.log('✓ API key deleted from Firestore');
    return true;
  } catch (error) {
    console.error('Failed to delete API key from Firestore:', error);
    return false;
  }
}

async function selectApiKeyInTurso(id) {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      console.error('Firestore not available');
      return false;
    }

    // Use a batch transaction to unselect all and select one
    const batch = firestore.batch();
    
    // Unselect all keys
    const snapshot = await firestore.collection('api_keys').get();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { isSelected: false });
    });
    
    // Select the specified key
    batch.update(firestore.collection('api_keys').doc(id), { isSelected: true });
    
    await batch.commit();
    console.log('✓ API key selected in Firestore');
    return true;
  } catch (error) {
    console.error('Failed to select API key in Firestore:', error);
    return false;
  }
}

async function getSelectedApiKeyFromTurso() {
  try {
    const firestore = getFirestore();
    if (!firestore) {
      console.error('Firestore not available');
      return null;
    }

    const snapshot = await firestore.collection('api_keys').where('isSelected', '==', true).limit(1).get();
    if (!snapshot.empty) {
      return snapshot.docs[0].data().key;
    }
    return null;
  } catch (error) {
    console.error('Failed to get selected API key from Firestore:', error);
    return null;
  }
}
