"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Edit3,
  Settings,
  Menu,
  X,
  Search,
  User,
  LogIn,
  LogOut,
  Trash2,
  AlertTriangle,
  Sparkles,
  Link,
  Globe,
  Palette,
  ChevronRight,
  Library,
  HelpCircle,
  MessageCircle,
  Bug,
  Lightbulb,
  Send,
  Bell,
  Plus,
  Megaphone,
  Calendar,
} from "lucide-react";
import { loadWhatsNewUpdates, addWhatsNewUpdate, deleteWhatsNewUpdate, type WhatsNewUpdate } from "../lib/firestore";

interface Chat {
  id: string;
  title: string;
  timestamp: Date;
  messages?: { role: string; content: string }[];
}

interface FirebaseUserData {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  displayName: string | null;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNewChat: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  activeEngine?: "groq" | "hf";
  onSwitchEngine?: () => void;
  user?: FirebaseUserData | null;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onDeleteChat?: (chatId: string) => void;
  onClearAllChats?: () => void;
  onOpenInstructions?: () => void;
  onOpenBooks?: () => void;
}

// Admin email - only this user can post updates
const ADMIN_EMAIL = "wambuiraymond03@gmail.com";

export default function Sidebar({
  isOpen,
  setIsOpen,
  onNewChat,
  chats,
  currentChatId,
  onSelectChat,
  activeEngine,
  onSwitchEngine,
  user,
  isAuthenticated,
  onSignIn,
  onSignOut,
  onDeleteChat,
  onClearAllChats,
  onOpenInstructions,
  onOpenBooks,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [location, setLocation] = useState<{country: string; city: string; loading: boolean}>({country: '', city: '', loading: true});
  
  // WhatsNew Updates State
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updates, setUpdates] = useState<WhatsNewUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [addUpdateModalOpen, setAddUpdateModalOpen] = useState(false);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateDescription, setNewUpdateDescription] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Load WhatsNew updates
  const loadUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const loadedUpdates = await loadWhatsNewUpdates();
      setUpdates(loadedUpdates);
    } catch (error) {
      console.error('Failed to load updates:', error);
    } finally {
      setLoadingUpdates(false);
    }
  };

  // Load updates when popup opens
  useEffect(() => {
    if (updatesOpen && updates.length === 0) {
      loadUpdates();
    }
  }, [updatesOpen]);

  // Add new update (admin only)
  const handleAddUpdate = async () => {
    if (!newUpdateTitle.trim() || !newUpdateDescription.trim() || !user?.id) return;
    
    setIsSubmittingUpdate(true);
    try {
      const newUpdate = await addWhatsNewUpdate(
        newUpdateTitle.trim(),
        newUpdateDescription.trim(),
        user.id
      );
      
      if (newUpdate) {
        setUpdates(prev => [newUpdate, ...prev]);
        setNewUpdateTitle('');
        setNewUpdateDescription('');
        setAddUpdateModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to add update:', error);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Delete update (admin only)
  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm('Delete this update?')) return;
    
    try {
      const success = await deleteWhatsNewUpdate(updateId);
      if (success) {
        setUpdates(prev => prev.filter(u => u.id !== updateId));
      }
    } catch (error) {
      console.error('Failed to delete update:', error);
    }
  };

  // Detect user location
  const detectLocation = async () => {
    setLocation(prev => ({ ...prev, loading: true }));
    
    if (!navigator.geolocation) {
      setLocation({ country: 'Unknown', city: 'Location not available', loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim for reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await response.json();
          
          const country = data.address?.country || 'Unknown';
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown location';
          
          setLocation({ country, city, loading: false });
        } catch (error) {
          console.error('Error fetching location:', error);
          setLocation({ country: 'Unknown', city: 'Location error', loading: false });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Fallback to IP-based location
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            setLocation({
              country: data.country_name || 'Unknown',
              city: data.city || 'Unknown location',
              loading: false
            });
          })
          .catch(() => {
            setLocation({ country: 'Unknown', city: 'Location not available', loading: false });
          });
      }
    );
  };

  // Auto-detect location when settings menu opens
  useEffect(() => {
    if (settingsMenuOpen && !location.country) {
      detectLocation();
    }
  }, [settingsMenuOpen]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  // Filter chats based on search query
  const filteredChats = searchQuery.trim()
    ? chats.filter((chat) => {
        const query = searchQuery.toLowerCase();
        // Search in chat title
        if (chat.title.toLowerCase().includes(query)) return true;
        // Search in messages content
        if (chat.messages?.some((msg) => msg.content.toLowerCase().includes(query))) return true;
        return false;
      })
    : chats;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -300,
          width: isCollapsed ? 56 : 280,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 z-40 h-screen bg-[#1e1e1e]/95 backdrop-blur-xl border-r border-white/5 flex flex-col"
      >
        {/* Top Section */}
        <div className="p-3">
          {isCollapsed ? (
            // Collapsed: Just hamburger
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu size={20} className="text-gray-400" />
            </button>
          ) : (
            // Expanded: Hamburger + Search
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Menu size={20} className="text-gray-400" />
              </button>
              
              {/* Expandable Search Bar */}
              <motion.div
                initial={false}
                animate={{ width: isSearchOpen ? 180 : 40 }}
                className="flex items-center bg-white/5 rounded-full overflow-hidden"
              >
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
                >
                  <Search size={20} className="text-gray-400" />
                </button>
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.input
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      type="text"
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full pr-2"
                      autoFocus
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full ml-auto md:hidden"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* New Chat */}
        <div className="px-3 py-2">
          {isCollapsed ? (
            <button
              onClick={onNewChat}
              className="p-2 hover:bg-teal-500/10 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] rounded-full transition-all duration-300"
              title="New chat"
            >
              <Edit3 size={20} className="text-gray-400 hover:text-teal-400 transition-colors" />
            </button>
          ) : (
            <button
              onClick={onNewChat}
              className="flex items-center gap-3 w-full p-2 hover:bg-teal-500/10 hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] rounded-lg transition-all duration-300 text-gray-300 group"
            >
              <Edit3 size={20} className="group-hover:text-teal-400 transition-colors" />
              <span className="text-sm group-hover:text-teal-400 transition-colors">New chat</span>
              <div className="ml-auto p-1 hover:bg-white/10 rounded">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Chat List - Only show when expanded */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {/* Clear All button - show if there are chats */}
            {filteredChats.length > 0 && onClearAllChats && !searchQuery && (
              <div className="px-2 pb-2 mb-2 border-b border-gray-800">
                <button
                  onClick={() => setClearAllModalOpen(true)}
                  className="flex items-center gap-2 w-full p-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Clear all chats</span>
                </button>
              </div>
            )}
            
            {/* Search results indicator */}
            {searchQuery && (
              <div className="px-3 py-2 text-xs text-gray-500">
                {filteredChats.length} result{filteredChats.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
            )}
            
            {filteredChats.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 italic">
                {searchQuery ? 'No chats found' : 'No conversations'}
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between w-full p-2 rounded-lg text-sm transition-all ${
                    currentChatId === chat.id
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-300"
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectChat(chat.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left truncate"
                  >
                    <span className="truncate">{chat.title}</span>
                  </button>
                  {/* Delete button - always visible on mobile, hover on desktop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToDelete(chat.id);
                      setDeleteModalOpen(true);
                    }}
                    className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/20 rounded-full transition-all text-red-400"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Spacer for collapsed view */}
        {isCollapsed && <div className="flex-1" />}

        {/* Sign in / User Profile card */}
        {!isCollapsed && (
          <>
            {!isAuthenticated ? (
              <div className="mx-3 mb-3 p-3 bg-[#252525] rounded-xl">
                <div className="flex items-start gap-2">
                  <User size={16} className="text-blue-400 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Please{" "}
                    <button 
                      onClick={onSignIn}
                      className="text-blue-400 font-medium hover:underline"
                    >
                      sign in
                    </button>{" "}
                    to save your chat and get settings
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-3 mb-3 p-3 bg-[#252525] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-purple-600 overflow-hidden bg-purple-600/20 flex items-center justify-center shrink-0 relative">
                    <img 
                      src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}+${user?.lastName}&backgroundColor=9333ea`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}+${user?.lastName}&backgroundColor=9333ea`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={onSignOut}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-red-400"
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Collapsed: User avatar or Sign in icon */}
        {isCollapsed && (
          <div className="p-3">
            {isAuthenticated ? (
              <div className="relative group">
                <div className="w-8 h-8 rounded-full border-2 border-purple-600 overflow-hidden bg-purple-600/20 flex items-center justify-center cursor-pointer">
                  <img 
                    src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}+${user?.lastName}&backgroundColor=9333ea`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user?.firstName}+${user?.lastName}&backgroundColor=9333ea`;
                    }}
                  />
                </div>
                {/* Hover dropdown */}
                <div className="absolute left-full ml-2 bottom-0 w-48 bg-[#1f1f1f] border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                  <div className="p-3 border-b border-gray-700">
                    <p className="text-xs text-gray-400">Account</p>
                    <p className="truncate text-sm text-white">{user?.email}</p>
                  </div>
                  <button 
                    onClick={onSignOut}
                    className="w-full text-left p-3 text-sm text-red-400 hover:bg-gray-800 transition rounded-b-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onSignIn}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                title="Sign in"
              >
                <LogIn size={20} />
              </button>
            )}
          </div>
        )}

        {/* Bottom: Settings - disabled until signed in */}
        <div className="p-3 border-t border-[#2a2a2a]">
          {isCollapsed ? (
            <button 
              disabled={!isAuthenticated}
              className={`p-2 rounded-full transition-colors ${
                isAuthenticated 
                  ? "hover:bg-white/10 text-gray-400" 
                  : "text-gray-600 cursor-not-allowed"
              }`}
            >
              <Settings size={20} />
            </button>
          ) : (
            // Expanded: Settings with popup menu
            <div className="relative">
              <button 
                onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                disabled={!isAuthenticated}
                className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                  isAuthenticated 
                    ? "hover:bg-white/10 text-gray-400" 
                    : "text-gray-600 cursor-not-allowed"
                }`}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
              
              {/* Settings Popup Menu */}
              <AnimatePresence>
                {settingsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 w-64 bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-800 overflow-hidden z-50"
                  >
                    {/* Menu Items */}
                    <div className="border-t border-gray-800 py-1">
                      {/* Updates Button */}
                      <button
                        onClick={() => {
                          setUpdatesOpen(true);
                          setSettingsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 transition-colors text-left"
                      >
                        <Bell size={16} />
                        <span>What's New</span>
                        {updates.length > 0 && (
                          <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {updates.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onOpenBooks?.();
                          setSettingsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 transition-colors text-left"
                      >
                        <Library size={16} />
                        <span>Bxarchi books for you</span>
                      </button>
                      
                      {/* Feedback Button */}
                      <button
                        onClick={() => {
                          setFeedbackModalOpen(true);
                          setSettingsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 transition-colors text-left"
                      >
                        <MessageCircle size={16} />
                        <span>Send Feedback</span>
                      </button>
                    </div>
                    
                    {/* Location Info */}
                    <div className="border-t border-gray-800 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${location.loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300">Location detected</p>
                          {location.loading ? (
                            <p className="text-xs text-gray-500 mt-0.5">Detecting...</p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {location.country}{location.city && location.city !== 'Unknown location' ? `, ${location.city}` : ''}
                              {' · '}
                              <span 
                                onClick={detectLocation}
                                className="text-blue-400 hover:underline cursor-pointer"
                              >
                                Update
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Attribution - By Codedwaves */}
        {!isCollapsed && (
          <div className="px-3 pb-3 text-center">
            <p className="text-xs text-gray-500">
              By{" "}
              <a 
                href="https://rayfolio.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400"
              >
                Codedwaves
              </a>
            </p>
          </div>
        )}
      </motion.aside>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Delete Chat?
                </h3>
              </div>
              <p className="text-gray-400 mb-6">
                This will delete the conversation forever. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (chatToDelete && onDeleteChat) {
                      onDeleteChat(chatToDelete);
                    }
                    setDeleteModalOpen(false);
                    setChatToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 rounded-xl transition-colors text-white font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear All Chats Confirmation Modal */}
      <AnimatePresence>
        {clearAllModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setClearAllModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Delete All Chats?
                </h3>
              </div>
              <p className="text-gray-400 mb-6">
                This will delete ALL {chats.length} conversations forever. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setClearAllModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onClearAllChats) {
                      onClearAllChats();
                    }
                    setClearAllModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 rounded-xl transition-colors text-white font-medium"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setFeedbackModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {!feedbackSubmitted ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <MessageCircle size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Send Feedback
                      </h3>
                      <p className="text-sm text-gray-400">
                        Help us improve Koda-A
                      </p>
                    </div>
                  </div>

                  {/* Feedback Type Selection */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setFeedbackType('bug')}
                      className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                        feedbackType === 'bug'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      <Bug size={16} />
                      Bug Report
                    </button>
                    <button
                      onClick={() => setFeedbackType('feature')}
                      className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                        feedbackType === 'feature'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      <Lightbulb size={16} />
                      Feature
                    </button>
                    <button
                      onClick={() => setFeedbackType('general')}
                      className={`flex-1 p-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                        feedbackType === 'general'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                      }`}
                    >
                      <MessageCircle size={16} />
                      General
                    </button>
                  </div>

                  {/* Feedback Text Area */}
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      feedbackType === 'bug'
                        ? "Describe the error you encountered..."
                        : feedbackType === 'feature'
                        ? "What feature would you like to see?"
                        : "Share your thoughts..."
                    }
                    rows={4}
                    className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 mb-4"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setFeedbackModalOpen(false)}
                      className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl transition-colors text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!feedbackText.trim()) return;
                        setIsSubmittingFeedback(true);
                        
                        try {
                          const response = await fetch('/api/feedback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: feedbackType,
                              message: feedbackText,
                              timestamp: Date.now(),
                              userAgent: navigator.userAgent,
                              url: window.location.href,
                            }),
                          });
                          
                          if (response.ok) {
                            setFeedbackSubmitted(true);
                            setTimeout(() => {
                              setFeedbackModalOpen(false);
                              setFeedbackSubmitted(false);
                              setFeedbackText('');
                              setFeedbackType('general');
                            }, 2000);
                          }
                        } catch (error) {
                          console.error('Failed to submit feedback:', error);
                          // Store locally if API fails
                          const localFeedback = {
                            id: Date.now().toString(),
                            type: feedbackType,
                            message: feedbackText,
                            timestamp: Date.now(),
                            pending: true,
                          };
                          const existing = JSON.parse(localStorage.getItem('pending_feedback') || '[]');
                          localStorage.setItem('pending_feedback', JSON.stringify([...existing, localFeedback]));
                          setFeedbackSubmitted(true);
                          setTimeout(() => {
                            setFeedbackModalOpen(false);
                            setFeedbackSubmitted(false);
                            setFeedbackText('');
                            setFeedbackType('general');
                          }, 2000);
                        } finally {
                          setIsSubmittingFeedback(false);
                        }
                      }}
                      disabled={!feedbackText.trim() || isSubmittingFeedback}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-xl transition-colors text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingFeedback ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={16} />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Thank You!
                  </h3>
                  <p className="text-gray-400">
                    Your feedback helps us improve Koda-A.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What's New Right Popup */}
      <AnimatePresence>
        {updatesOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUpdatesOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            
            {/* Right Popup */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 z-50 h-screen w-full max-w-md bg-[#1e1e1e] border-l border-gray-800 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Megaphone size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">What's New</h2>
                    <p className="text-xs text-gray-400">Updates will appear here</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Add button - only visible to admin */}
                  {isAdmin && (
                    <button
                      onClick={() => setAddUpdateModalOpen(true)}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-full transition-colors"
                      title="Add new update"
                    >
                      <Plus size={20} className="text-purple-400" />
                    </button>
                  )}
                  <button
                    onClick={() => setUpdatesOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Updates List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingUpdates ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : updates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell size={24} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400">
                      No updates yet
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Check back later for news!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <motion.div
                        key={update.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#252525] rounded-xl p-4 border border-gray-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white truncate">
                              {update.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {update.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>{update.date}</span>
                            </div>
                          </div>
                          {/* Delete button - only visible to admin */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteUpdate(update.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors text-red-400 shrink-0"
                              title="Delete update"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Update Modal (Admin Only) */}
      <AnimatePresence>
        {addUpdateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
            onClick={() => setAddUpdateModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Megaphone size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Add Update
                  </h3>
                  <p className="text-sm text-gray-400">
                    Share what's new with users
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={newUpdateTitle}
                onChange={(e) => setNewUpdateTitle(e.target.value)}
                placeholder="Update title..."
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 mb-3"
              />

              <textarea
                value={newUpdateDescription}
                onChange={(e) => setNewUpdateDescription(e.target.value)}
                placeholder="Describe the update..."
                rows={3}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500/50 mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setAddUpdateModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUpdate}
                  disabled={!newUpdateTitle.trim() || !newUpdateDescription.trim() || isSubmittingUpdate}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl transition-colors text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingUpdate ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Update
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
