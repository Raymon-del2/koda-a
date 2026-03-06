"use client";

import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc,
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { app } from "./firebase";

const db = getFirestore(app);

export interface FirestoreMessage {
  type: string;
  text: string;
  timestamp: number;
  agentType?: string;
  sources?: {
    id: number;
    title: string;
    url: string;
    type: 'qdrant' | 'google' | 'video' | 'website' | 'article' | 'news' | 'movie' | 'person';
    snippet?: string;
    favicon?: string;
    source?: string;
    image?: string | null;
    date?: string;
    rating?: number;
  }[];
  youtubeVideos?: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    viewCount: string;
    publishedAt: string;
  }[];
}

export interface FirestoreChat {
  id: string;
  title: string;
  messages: FirestoreMessage[];
  updatedAt: Timestamp | null;
}

// Convert Firestore chat to app format
export const convertFirestoreChat = (chat: FirestoreChat) => {
  return {
    id: chat.id,
    title: chat.title,
    timestamp: chat.updatedAt?.toDate() || new Date(),
    messages: chat.messages.map((m: FirestoreMessage) => ({
      id: Math.random().toString(36).substring(7),
      role: (m.type === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
      agentType: m.agentType,
      sources: m.sources,
      youtubeVideos: m.youtubeVideos,
    })),
  };
};

// Load all chats from Firestore for a user
export const loadChatsFromFirestore = async (userId: string) => {
  try {
    const chatsRef = collection(db, "users", userId, "chats");
    const q = query(chatsRef, orderBy("updatedAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    
    const chats: FirestoreChat[] = [];
    snapshot.forEach((doc) => {
      chats.push({
        id: doc.id,
        ...doc.data(),
      } as FirestoreChat);
    });
    
    console.log(`✓ Loaded ${chats.length} chats from Firestore`);
    return chats.map(convertFirestoreChat);
  } catch (error) {
    console.error("Error loading chats from Firestore:", error);
    return [];
  }
};

// Save a chat to Firestore
export const saveChatToFirestore = async (
  userId: string, 
  chat: { id: string; title: string; messages: { role: string; content: string; agentType?: string; sources?: any[]; youtubeVideos?: any[] }[] }
) => {
  try {
    const chatRef = doc(db, "users", userId, "chats", chat.id);
    
    // Clean messages by removing undefined values (Firestore doesn't allow undefined)
    const cleanMessages = chat.messages.map(m => {
      const message: any = {
        type: m.role,
        text: m.content,
        timestamp: Date.now(),
      };
      // Only add optional fields if they exist and are not undefined
      if (m.agentType !== undefined && m.agentType !== null) {
        message.agentType = m.agentType;
      }
      if (m.sources !== undefined && m.sources !== null) {
        message.sources = m.sources;
      }
      if (m.youtubeVideos !== undefined && m.youtubeVideos !== null) {
        message.youtubeVideos = m.youtubeVideos;
      }
      return message;
    });
    
    await setDoc(chatRef, {
      title: chat.title,
      messages: cleanMessages,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    console.log(`✓ Chat saved to Firestore: ${chat.id}`);
    return true;
  } catch (error) {
    console.error("Error saving chat to Firestore:", error);
    return false;
  }
};

// Delete a chat from Firestore
export const deleteChatFromFirestore = async (userId: string, chatId: string) => {
  try {
    const chatRef = doc(db, "users", userId, "chats", chatId);
    await deleteDoc(chatRef);
    console.log(`✓ Chat deleted from Firestore: ${chatId}`);
    return true;
  } catch (error) {
    console.error("Error deleting chat from Firestore:", error);
    return false;
  }
};

// Get a single chat from Firestore
export const getChatFromFirestore = async (userId: string, chatId: string) => {
  try {
    const chatRef = doc(db, "users", userId, "chats", chatId);
    const snapshot = await getDoc(chatRef);
    
    if (snapshot.exists()) {
      const chat = { id: snapshot.id, ...snapshot.data() } as FirestoreChat;
      return convertFirestoreChat(chat);
    }
    return null;
  } catch (error) {
    console.error("Error getting chat from Firestore:", error);
    return null;
  }
};

// Delete all chats from Firestore for a user
export const deleteAllChatsFromFirestore = async (userId: string) => {
  try {
    const chatsRef = collection(db, "users", userId, "chats");
    const snapshot = await getDocs(chatsRef);
    
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnapshot) => {
      const chatRef = doc(db, "users", userId, "chats", docSnapshot.id);
      deletePromises.push(deleteDoc(chatRef));
    });
    
    await Promise.all(deletePromises);
    console.log(`✓ Deleted all ${deletePromises.length} chats from Firestore`);
    return true;
  } catch (error) {
    console.error("Error deleting all chats from Firestore:", error);
    return false;
  }
};

export { db };

// Guided Learning interfaces
export interface GuidedLearningMaterial {
  id: string;
  topic: string;
  level: string;
  content: string;
  pdfUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// Save guided learning material to Firestore
export const saveGuidedLearningMaterial = async (
  userId: string,
  material: Omit<GuidedLearningMaterial, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const materialRef = doc(collection(db, "users", userId, "learningMaterials"));
    const materialData = {
      ...material,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await setDoc(materialRef, materialData);
    console.log(`✓ Learning material saved: ${materialRef.id}`);
    return { id: materialRef.id, ...materialData };
  } catch (error) {
    console.error("Error saving learning material:", error);
    return null;
  }
};

// Load all guided learning materials for a user
export const loadGuidedLearningMaterials = async (userId: string) => {
  try {
    const materialsRef = collection(db, "users", userId, "learningMaterials");
    const q = query(materialsRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    
    const materials: GuidedLearningMaterial[] = [];
    snapshot.forEach((doc) => {
      materials.push({
        id: doc.id,
        ...doc.data(),
      } as GuidedLearningMaterial);
    });
    
    console.log(`✓ Loaded ${materials.length} learning materials`);
    return materials;
  } catch (error) {
    console.error("Error loading learning materials:", error);
    return [];
  }
};

// Delete a guided learning material
export const deleteGuidedLearningMaterial = async (userId: string, materialId: string) => {
  try {
    const materialRef = doc(db, "users", userId, "learningMaterials", materialId);
    await deleteDoc(materialRef);
    console.log(`✓ Learning material deleted: ${materialId}`);
    return true;
  } catch (error) {
    console.error("Error deleting learning material:", error);
    return false;
  }
};

// Instructions interfaces
export interface Instruction {
  id: string;
  text: string;
  createdAt: number;
}

export interface UserInstructions {
  instructions: Instruction[];
  enabled: boolean;
  updatedAt: number;
}

// Load instructions for a user
export const loadInstructions = async (userId: string): Promise<{ instructions: Instruction[]; enabled: boolean }> => {
  try {
    const instructionsRef = doc(db, "instructions", userId);
    const snapshot = await getDoc(instructionsRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserInstructions;
      return {
        instructions: data.instructions || [],
        enabled: data.enabled !== undefined ? data.enabled : true,
      };
    }
    return { instructions: [], enabled: true };
  } catch (error) {
    console.error("Error loading instructions:", error);
    return { instructions: [], enabled: true };
  }
};

// Save instructions for a user
export const saveInstructions = async (userId: string, instructions: Instruction[], enabled: boolean = true): Promise<boolean> => {
  try {
    const instructionsRef = doc(db, "instructions", userId);
    await setDoc(instructionsRef, {
      userId,
      instructions,
      enabled,
      updatedAt: Date.now(),
    }, { merge: true });
    console.log(`✓ Saved ${instructions.length} instructions (enabled: ${enabled})`);
    return true;
  } catch (error) {
    console.error("Error saving instructions:", error);
    return false;
  }
};

// Add a single instruction
export const addInstruction = async (userId: string, text: string): Promise<Instruction | null> => {
  try {
    const { instructions, enabled } = await loadInstructions(userId);
    const newInstruction: Instruction = {
      id: Math.random().toString(36).substring(7),
      text,
      createdAt: Date.now(),
    };
    instructions.push(newInstruction);
    const success = await saveInstructions(userId, instructions, enabled);
    return success ? newInstruction : null;
  } catch (error) {
    console.error("Error adding instruction:", error);
    return null;
  }
};

// Delete a single instruction
export const deleteInstruction = async (userId: string, instructionId: string): Promise<boolean> => {
  try {
    const { instructions, enabled } = await loadInstructions(userId);
    const filtered = instructions.filter((i: Instruction) => i.id !== instructionId);
    return await saveInstructions(userId, filtered, enabled);
  } catch (error) {
    console.error("Error deleting instruction:", error);
    return false;
  }
};

// Delete all instructions
export const deleteAllInstructions = async (userId: string): Promise<boolean> => {
  try {
    const { enabled } = await loadInstructions(userId);
    return await saveInstructions(userId, [], enabled);
  } catch (error) {
    console.error("Error deleting all instructions:", error);
    return false;
  }
};

// WhatsNew Update interfaces
export interface WhatsNewUpdate {
  id: string;
  title: string;
  description: string;
  date: string;
  timestamp: Timestamp | number;
  authorId?: string;
  status: 'coming_soon' | 'out' | 'blog';
  link?: string;
  tags: string[];
  type: 'blog' | 'feature' | 'improvement' | 'announcement';
}

// Load all WhatsNew updates from Firestore
export const loadWhatsNewUpdates = async (): Promise<WhatsNewUpdate[]> => {
  try {
    const updatesRef = collection(db, "whats_new");
    const q = query(updatesRef, orderBy("timestamp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    
    const updates: WhatsNewUpdate[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      updates.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        timestamp: data.timestamp || Date.now(),
        authorId: data.authorId,
        status: data.status || 'out',
        link: data.link || '',
        tags: data.tags || [],
        type: data.type || 'announcement',
      });
    });
    
    console.log(`✓ Loaded ${updates.length} WhatsNew updates`);
    return updates;
  } catch (error) {
    console.error("Error loading WhatsNew updates:", error);
    return [];
  }
};

// Add a new WhatsNew update (admin only)
export const addWhatsNewUpdate = async (
  title: string,
  description: string,
  authorId: string,
  status: 'coming_soon' | 'out' | 'blog' = 'out',
  link?: string,
  tags: string[] = [],
  type: 'blog' | 'feature' | 'improvement' | 'announcement' = 'announcement'
): Promise<WhatsNewUpdate | null> => {
  try {
    const updatesRef = collection(db, "whats_new");
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }).replace(/,/g, '');
    
    const newUpdate = {
      title,
      description,
      date: dateStr,
      timestamp: serverTimestamp(),
      authorId,
      status,
      link: link || '',
      tags,
      type,
    };
    
    const docRef = doc(updatesRef);
    await setDoc(docRef, newUpdate);
    
    console.log(`✓ WhatsNew update added: ${title}`);
    return {
      id: docRef.id,
      ...newUpdate,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error adding WhatsNew update:", error);
    return null;
  }
};

// Delete a WhatsNew update (admin only)
export const deleteWhatsNewUpdate = async (updateId: string): Promise<boolean> => {
  try {
    const updateRef = doc(db, "whats_new", updateId);
    await deleteDoc(updateRef);
    console.log(`✓ WhatsNew update deleted: ${updateId}`);
    return true;
  } catch (error) {
    console.error("Error deleting WhatsNew update:", error);
    return false;
  }
};

// Edit a WhatsNew update (admin only)
export const editWhatsNewUpdate = async (
  updateId: string,
  title: string,
  description: string,
  status?: 'coming_soon' | 'out' | 'blog',
  link?: string,
  tags?: string[],
  type?: 'blog' | 'feature' | 'improvement' | 'announcement'
): Promise<boolean> => {
  try {
    const updateRef = doc(db, "whats_new", updateId);
    const updateData: any = {
      title,
      description,
      timestamp: serverTimestamp(),
    };
    if (status) updateData.status = status;
    if (link !== undefined) updateData.link = link;
    if (tags) updateData.tags = tags;
    if (type) updateData.type = type;
    
    await setDoc(updateRef, updateData, { merge: true });
    console.log(`✓ WhatsNew update edited: ${title}`);
    return true;
  } catch (error) {
    console.error("Error editing WhatsNew update:", error);
    return false;
  }
};
