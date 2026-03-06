"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Sparkles, Diamond, Plus, Mic, ChevronDown, Zap, SlidersHorizontal, BookOpen, Globe, X, Send, Square, LogIn, Play, Database, Download, MoreVertical, Trash2, Library, Search, Book as BookIcon } from "lucide-react";
import { fetchBxarchiBooks, type Book } from "../lib/bxarchi";
import { YouTubeVideo, formatViewCount, formatPublishedDate } from "../lib/youtube";
import Sidebar from "@/components/Sidebar";
import StreamingMessage from "../components/StreamingMessage";
import SourcesSidebar from "../components/SourcesSidebar";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { loadChatsFromFirestore, saveChatToFirestore, deleteChatFromFirestore, deleteAllChatsFromFirestore, saveGuidedLearningMaterial, loadGuidedLearningMaterials, loadInstructions, saveInstructions, Instruction } from "../lib/firestore";
import { useStreamingTranscription } from "../hooks/useStreamingTranscription";

// Type declarations for Web Speech API
// Note: SpeechRecognition types are defined in the useStreamingTranscription hook

interface Source {
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
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  youtubeVideos?: YouTubeVideo[];
  agentType?: string;
  modelType?: 'pro' | 'medium' | 'free'; // Track which model generated this message
  newsArticles?: any[];
  movieResults?: any[];
  personResults?: any[];
  entertainmentEntities?: any[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

// Rotating Messages Component
function RotatingMessages() {
  const messages = [
    "Create an image of a cat playing chess",
    "Find videos about Python programming",
    "Help me write a React component",
    "Explain quantum computing simply",
    "Write a poem about AI",
    "Debug my JavaScript code",
    "Plan a workout routine",
    "Summarize this article for me",
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="h-6 overflow-hidden text-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-gray-400 text-sm"
        >
          {messages[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// Input Pill Component with Deep Search Toggle
function InputPill({
  inputValue,
  setInputValue,
  handleSendMessage,
  isLoading,
  selectedSpeed,
  setSelectedSpeed,
  onStopGeneration,
  searchMode,
  setSearchMode,
  showModeSelector,
  setShowModeSelector,
  modeSelectorRef,
  inputWidth,
  setInputWidth,
  inputHeight,
  setInputHeight,
}: {
  inputValue: string;
  setInputValue: (value: string | ((prev: string) => string)) => void;
  handleSendMessage: (content: string, selectedTool?: 'create-image' | 'deep-search' | 'guided-learning' | null) => void;
  isLoading: boolean;
  selectedSpeed: string;
  setSelectedSpeed: (value: string) => void;
  onStopGeneration?: () => void;
  searchMode: 'standard' | 'deep-search';
  setSearchMode: (mode: 'standard' | 'deep-search') => void;
  showModeSelector: boolean;
  setShowModeSelector: (show: boolean) => void;
  modeSelectorRef: React.RefObject<HTMLDivElement | null>;
  inputWidth: number;
  setInputWidth: (width: number) => void;
  inputHeight: number;
  setInputHeight: (height: number) => void;
}) {
  // Tool selection state
  const [selectedTool, setSelectedTool] = useState<'create-image' | 'deep-search' | 'guided-learning' | null>(null);
  const [showDeepSearchSubmenu, setShowDeepSearchSubmenu] = useState(false);
  const [showAddImagePopup, setShowAddImagePopup] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [deepSearchMode, setDeepSearchMode] = useState<'standard' | 'deep-research'>('standard');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [newInstruction, setNewInstruction] = useState("");
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState("");
  const addImageRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const deepSearchRef = useRef<HTMLDivElement>(null);

  // Advanced streaming transcription (Gemini-style)
  const {
    isRecording,
    isVADActive,
    interimText,
    finalText,
    audioLevel,
    predictedPunctuation,
    toggleRecording,
  } = useStreamingTranscription(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        setInputValue(prev => (prev + ' ' + text).trim());
      }
    },
    'wss://api.koda-ai.com/stream'
  );

  const interimTranscript = interimText;
  const showListeningPill = isRecording;

  // Instructions handlers
  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      const newInst: Instruction = {
        id: Math.random().toString(36).substring(7),
        text: newInstruction.trim(),
        createdAt: Date.now(),
      };
      setInstructions([...instructions, newInst]);
      setNewInstruction("");
    }
  };

  const handleDeleteInstruction = (id: string) => {
    setInstructions(instructions.filter((i) => i.id !== id));
  };

  const handleDeleteAllInstructions = () => {
    setInstructions([]);
  };

  // Dynamic placeholder based on selected tool
  const getPlaceholder = () => {
    if (selectedTool === 'create-image') return "Coming soon...";
    if (selectedTool === 'deep-search') return "Lets dive in...";
    if (selectedTool === 'guided-learning') return "What do you want to learn";
    return "Ask anything...";
  };

  const placeholder = getPlaceholder();

  // Handle tool selection
  const handleToolSelect = (tool: 'create-image' | 'deep-search' | 'guided-learning') => {
    if (tool === 'deep-search') {
      setShowDeepSearchSubmenu(true);
    }
    setSelectedTool(tool);
    setShowModeSelector(false);
    // Close other popups on mobile
    setShowDeepSearchSubmenu(false);
  };

  // Handle removing selected tool
  const handleRemoveTool = () => {
    setSelectedTool(null);
    setDeepSearchMode('standard');
  };

  // Handle deep search mode selection
  const handleDeepSearchModeSelect = (mode: 'standard' | 'deep-research') => {
    setDeepSearchMode(mode);
    setSearchMode(mode === 'deep-research' ? 'deep-search' : 'standard');
    setShowDeepSearchSubmenu(false);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addImageRef.current && !addImageRef.current.contains(event.target as Node)) {
        setShowAddImagePopup(false);
      }
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelPopup(false);
      }
      if (deepSearchRef.current && !deepSearchRef.current.contains(event.target as Node)) {
        setShowDeepSearchSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mx-auto" style={{ width: inputWidth, maxWidth: '100%' }}>
      {/* Main Input Pill - Gemini Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1e1e1e] rounded-[28px] p-4 border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
      >
        {/* Top: Clean Input Area with Streaming Transcription */}
        <div className="mb-3 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue, selectedTool);
              }
            }}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none text-white text-base placeholder:text-gray-500"
            style={{ height: inputHeight }}
          />
          
          {/* Real-time streaming transcription overlay */}
          <AnimatePresence>
            {isRecording && interimTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute top-full left-0 right-0 mt-1"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{isVADActive ? 'Listening' : 'Processing'}:</span>
                  <span className="text-blue-400 font-medium">
                    {interimTranscript}
                    {predictedPunctuation && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-blue-300"
                      >
                        {predictedPunctuation}
                      </motion.span>
                    )}
                  </span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-0.5 h-4 bg-blue-400 rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Row: Tools */}
        <div className="flex items-center justify-between">
          {/* Left side: Tools or Selected Tool Pill */}
          <div className="flex items-center gap-2">
            {/* Tools Button - Hidden when tool selected, clicking opens dropdown to change */}
            {!selectedTool && (
              <div className="relative" ref={modeSelectorRef}>
                <button
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-full transition-colors text-sm text-gray-300"
                >
                  <SlidersHorizontal size={16} />
                  <span>Tools</span>
                  <ChevronDown size={14} className={`transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
                </button>

                {/* Tools Dropdown */}
                <AnimatePresence>
                  {showModeSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 sm:left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                    >
                      <p className="text-sm text-white font-medium px-3 py-2">Tools</p>
                      
                      {/* Create Image - Coming Soon */}
                      <button
                        disabled
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-left opacity-50 cursor-not-allowed"
                      >
                        <img src="/grape.webp" alt="Create" className="w-5 h-5 rounded object-cover grayscale" />
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-400">Create image</span>
                          <span className="text-xs text-gray-600">Coming soon</span>
                        </div>
                      </button>
                      
                      {/* Deep Search */}
                      <button
                        onClick={() => handleToolSelect('deep-search')}
                        className="flex items-center gap-3 w-full p-3 hover:bg-[#2a2a2a] rounded-xl transition-colors text-left"
                      >
                        <Globe size={18} className="text-gray-400" />
                        <div>
                          <span className="text-sm text-white">Deep search</span>
                          <p className="text-xs text-gray-500">Google + YouTube + Qdrant</p>
                        </div>
                      </button>
                      
                      {/* Guided Learning */}
                      <button
                        onClick={() => handleToolSelect('guided-learning')}
                        className="flex items-center gap-3 w-full p-3 hover:bg-[#2a2a2a] rounded-xl transition-colors text-left"
                      >
                        <BookOpen size={18} className="text-gray-400" />
                        <span className="text-sm text-white">Guided learning</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Selected Tool Pill - Click to open dropdown to change tool */}
            {selectedTool && (
              <>
                <div 
                  onClick={() => setShowModeSelector(true)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full max-w-[140px] sm:max-w-none cursor-pointer hover:bg-blue-500/30 transition-colors"
                >
                  {selectedTool === 'create-image' && (
                    <img src="/grape.webp" alt="Create" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                  )}
                  {selectedTool === 'deep-search' && <Globe size={14} className="text-blue-400 flex-shrink-0" />}
                  {selectedTool === 'guided-learning' && <BookOpen size={14} className="text-blue-400 flex-shrink-0" />}
                  <span className="text-xs sm:text-sm text-blue-400 truncate">
                    {selectedTool === 'create-image' && <span className="hidden sm:inline">Create image</span>}
                    {selectedTool === 'create-image' && <span className="sm:hidden">Create</span>}
                    {selectedTool === 'deep-search' && `Deep research`}
                    {selectedTool === 'guided-learning' && 'Guided learning'}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTool();
                    }}
                    className="p-0.5 hover:bg-blue-500/20 rounded-full transition-colors ml-1 flex-shrink-0"
                  >
                    <X size={14} className="text-blue-400" />
                  </button>
                </div>

                {/* Tools Dropdown when clicking the pill */}
                <AnimatePresence>
                  {showModeSelector && (
                    <motion.div
                      ref={modeSelectorRef}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 w-64 max-w-[calc(100vw-2rem)] bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                    >
                      <p className="text-sm text-white font-medium px-3 py-2">Change Tool</p>
                      
                      {/* Create Image - Coming Soon */}
                      <button
                        disabled
                        className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-left opacity-50 cursor-not-allowed"
                      >
                        <img src="/grape.webp" alt="Create" className="w-5 h-5 rounded object-cover grayscale" />
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-400">Create image</span>
                          <span className="text-xs text-gray-600">Coming soon</span>
                        </div>
                      </button>
                      
                      {/* Deep Search */}
                      <button
                        onClick={() => handleToolSelect('deep-search')}
                        className={`flex items-center gap-3 w-full p-3 hover:bg-[#2a2a2a] rounded-xl transition-colors text-left ${selectedTool === 'deep-search' ? 'bg-blue-500/20' : ''}`}
                      >
                        <Globe size={18} className="text-gray-400" />
                        <div>
                          <span className="text-sm text-white">Deep search</span>
                          <p className="text-xs text-gray-500">Google + YouTube + Qdrant</p>
                        </div>
                      </button>
                      
                      {/* Guided Learning */}
                      <button
                        onClick={() => handleToolSelect('guided-learning')}
                        className={`flex items-center gap-3 w-full p-3 hover:bg-[#2a2a2a] rounded-xl transition-colors text-left ${selectedTool === 'guided-learning' ? 'bg-blue-500/20' : ''}`}
                      >
                        <BookOpen size={18} className="text-gray-400" />
                        <span className="text-sm text-white">Guided learning</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Deep Search Submenu */}
                {selectedTool === 'deep-search' && (
                  <div className="relative" ref={deepSearchRef}>
                    <button
                      onClick={() => setShowDeepSearchSubmenu(!showDeepSearchSubmenu)}
                      className="text-xs text-gray-400 hover:text-white underline ml-1 whitespace-nowrap"
                    >
                      Change
                    </button>
                    <AnimatePresence>
                      {showDeepSearchSubmenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 w-40 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-xl z-50 p-2"
                        >
                          <button
                            onClick={() => handleDeepSearchModeSelect('standard')}
                            className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${deepSearchMode === 'standard' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-[#2a2a2a]'}`}
                          >
                            Standard
                          </button>
                          <button
                            onClick={() => handleDeepSearchModeSelect('deep-research')}
                            className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${deepSearchMode === 'deep-research' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-[#2a2a2a]'}`}
                          >
                            Deep research
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right side: Model Selector and Send */}
          <div className="flex items-center gap-2">
            {/* Model Selector Popup */}
            <div className="relative" ref={modelSelectorRef}>
              <button
                onClick={() => setShowModelPopup(!showModelPopup)}
                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-full transition-colors text-sm text-gray-300"
              >
                <span className="capitalize">
                  {selectedSpeed === 'pro' ? 'Fast' : selectedSpeed === 'free-slow' ? 'Slow' : 'Medium'}
                </span>
                <ChevronDown size={14} />
              </button>

              <AnimatePresence>
                {showModelPopup && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-0 mb-2 w-48 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl shadow-xl z-50 p-2"
                  >
                    <button
                      onClick={() => { setSelectedSpeed('free-slow'); setShowModelPopup(false); }}
                      className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${selectedSpeed === 'free-slow' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-[#2a2a2a]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>nyati-core01</span>
                        <span className="text-xs text-gray-500">Slow</span>
                      </div>
                    </button>
                    <button
                      onClick={() => { setSelectedSpeed('medium'); setShowModelPopup(false); }}
                      className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${selectedSpeed === 'medium' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-[#2a2a2a]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>Medium agent</span>
                      </div>
                    </button>
                    <button
                      onClick={() => { setSelectedSpeed('pro'); setShowModelPopup(false); }}
                      className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${selectedSpeed === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'text-white hover:bg-[#2a2a2a]'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span>Koda-A</span>
                        <span className="text-xs text-gray-500">Fast</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mic Button with Listening Pill */}
            <div className="relative flex items-center gap-2">
              <button 
                onClick={toggleRecording}
                className={`p-2 rounded-full transition-colors ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 animate-pulse' 
                    : 'hover:bg-white/10 text-gray-400'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic size={20} />
              </button>

              {/* Gemini-style Listening Pill */}
              <AnimatePresence>
                {showListeningPill && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    className="flex items-center gap-2 bg-[#2a2a2a] rounded-full px-3 py-1.5 border border-[#3a3a3a]"
                  >
                    {/* Audio Waveform Bars */}
                    <div className="flex items-center gap-0.5 h-4">
                      {[1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-blue-400 rounded-full"
                          animate={{
                            height: [4, 16 * audioLevel + 4, 4],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{
                            duration: 0.3,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          style={{ height: 4 }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-300 font-medium">Listening</span>
                    {/* Animated dots */}
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1 h-1 bg-gray-400 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Send Button */}
            <button
              onClick={() => {
                if (isLoading && onStopGeneration) {
                  onStopGeneration();
                } else {
                  handleSendMessage(inputValue, selectedTool);
                }
              }}
              disabled={(!inputValue.trim() && !isLoading) || selectedTool === 'create-image'}
              className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${
                (inputValue.trim() || isLoading) && selectedTool !== 'create-image'
                  ? "bg-blue-500 hover:bg-blue-400 text-white"
                  : "bg-white/10 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? <Square size={18} fill="currentColor" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function GeminiChatPage() {
  const { user, isLoading: authLoading, isAuthenticated, signInWithGoogle, logout } = useFirebaseAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeEngine, setActiveEngine] = useState<"groq" | "hf">("groq");
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedSpeed, setSelectedSpeed] = useState("free-slow");
  const [greeting, setGreeting] = useState("Where do you want to begin?");
  const [activeSources, setActiveSources] = useState<Source[] | null>(null);
  const [sourcesSidebarOpen, setSourcesSidebarOpen] = useState(false);
  const [highlightedSourceId, setHighlightedSourceId] = useState<number | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [searchMode, setSearchMode] = useState<'standard' | 'deep-search'>('standard');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [inputWidth, setInputWidth] = useState(650); // Default width 650px
  const [inputHeight, setInputHeight] = useState(80); // Default height 80px
  const [showGuidedLearningModal, setShowGuidedLearningModal] = useState(false);
  const [guidedLearningContent, setGuidedLearningContent] = useState("");
  const [guidedLearningTopic, setGuidedLearningTopic] = useState("");
  const [guidedLearningLevel, setGuidedLearningLevel] = useState("intermediate");
  const [guidedLearningVideos, setGuidedLearningVideos] = useState<any[]>([]);
  const [guidedLearningSources, setGuidedLearningSources] = useState<any[]>([]);
  const [isGeneratingLearning, setIsGeneratingLearning] = useState(false);
  const [learningMaterials, setLearningMaterials] = useState<any[]>([]);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [newInstruction, setNewInstruction] = useState("");
  const [showInstructionInput, setShowInstructionInput] = useState(false);
  const [instructionsEnabled, setInstructionsEnabled] = useState(true);
  const [userLocation, setUserLocation] = useState<{country: string; city: string; loading: boolean}>({country: '', city: '', loading: true});
  const [showBooksModal, setShowBooksModal] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [displayedLoadingText, setDisplayedLoadingText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  const greetings = [
    "Where do you want to begin?",
    "Let's start!",
    "Ready...Lets begin",
  ];

  const loadingMessages = [
    "Thinking...",
    "Finding the best answer...",
    "Searching sources...",
    "Processing your request...",
    "Analyzing data...",
    "Generating response...",
  ];

  // Pick random greeting on mount
  useEffect(() => {
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(randomGreeting);
  }, []);

  // Typewriter effect for loading messages
  useEffect(() => {
    if (!isLoading) {
      setDisplayedLoadingText("");
      return;
    }

    const currentMessage = loadingMessages[loadingMessageIndex];
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex <= currentMessage.length) {
        setDisplayedLoadingText(currentMessage.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        // Wait then move to next message
        setTimeout(() => {
          setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 1500);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [isLoading, loadingMessageIndex]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Only scroll if user is near bottom (within 150px)
  const scrollToBottomIfNearBottom = () => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Track scroll position
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom < 150;
    }
  };

  const currentChat = chats.find((c) => c.id === currentChatId);

  // Track last message count to only scroll on new messages
  const lastMessageCountRef = useRef(0);

  // Load chats and instructions from Firestore when user signs in
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated && user) {
        console.log('Loading data from Firestore for user:', user.id);
        
        // Load chats
        const firestoreChats = await loadChatsFromFirestore(user.id);
        if (firestoreChats.length > 0) {
          setChats(firestoreChats);
        }
        
        // Load instructions
        const { instructions: userInstructions, enabled } = await loadInstructions(user.id);
        setInstructions(userInstructions);
        setInstructionsEnabled(enabled);
      }
    };
    loadUserData();
  }, [isAuthenticated, user?.id]);

  // Save instructions to Firestore whenever they change
  useEffect(() => {
    const saveInstructionsToFirestore = async () => {
      if (isAuthenticated && user) {
        await saveInstructions(user.id, instructions, instructionsEnabled);
      }
    };

    // Debounce the save
    const timeout = setTimeout(saveInstructionsToFirestore, 1000);
    return () => clearTimeout(timeout);
  }, [instructions, instructionsEnabled, isAuthenticated, user]);

  // Instructions handlers
  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      const newInst: Instruction = {
        id: Math.random().toString(36).substring(7),
        text: newInstruction.trim(),
        createdAt: Date.now(),
      };
      setInstructions([...instructions, newInst]);
      setNewInstruction("");
    }
  };

  const handleDeleteInstruction = (id: string) => {
    setInstructions(instructions.filter((i) => i.id !== id));
  };

  const handleDeleteAllInstructions = () => {
    setInstructions([]);
  };

  // Books handler
  const handleOpenBooks = async () => {
    setShowBooksModal(true);
    setBooksLoading(true);
    
    try {
      const fetchedBooks = await fetchBxarchiBooks();
      setBooks(fetchedBooks);
      console.log(`Loaded ${fetchedBooks.length} books from Bxarchi`);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    const saveChats = async () => {
      if (isAuthenticated && user && chats.length > 0) {
        // Save each chat that has messages
        for (const chat of chats) {
          if (chat.messages.length > 0) {
            await saveChatToFirestore(user.id, chat);
          }
        }
      }
    };
    
    // Debounce the save to avoid too many writes
    const timeout = setTimeout(saveChats, 2000);
    return () => clearTimeout(timeout);
  }, [chats, isAuthenticated, user]);

  useEffect(() => {
    // Don't auto-scroll at all during streaming to prevent glitching
    if (isLoading) return;
    
    const currentChat = chats.find((c) => c.id === currentChatId);
    const currentMessageCount = currentChat?.messages.length || 0;
    // Only scroll if a new message was added
    if (currentMessageCount > lastMessageCountRef.current) {
      scrollToBottomIfNearBottom();
    }
    lastMessageCountRef.current = currentMessageCount;
  }, [chats, currentChatId, isLoading]);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: [],
      timestamp: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    setSidebarOpen(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log('Deleting chat:', chatId);
    
    // Remove from local state first for immediate UI update
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    
    // If deleting current chat, clear selection
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    
    // Delete from Firestore if authenticated
    if (isAuthenticated && user) {
      try {
        console.log('Deleting from Firestore for user:', user.id);
        await deleteChatFromFirestore(user.id, chatId);
        console.log('Successfully deleted from Firestore');
      } catch (error) {
        console.error('Failed to delete from Firestore:', error);
      }
    }
  };

  const handleCitationClick = (id: number) => {
    setHighlightedSourceId(id);
    setSourcesSidebarOpen(true);
    const element = document.getElementById(`source-${id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleClearAllChats = async () => {
    console.log('Clearing all chats...');
    
    // Clear local state immediately
    setChats([]);
    setCurrentChatId(null);
    
    // Delete all from Firestore if authenticated
    if (isAuthenticated && user) {
      try {
        console.log('Deleting all chats from Firestore for user:', user.id);
        await deleteAllChatsFromFirestore(user.id);
        console.log('Successfully deleted all chats from Firestore');
      } catch (error) {
        console.error('Failed to delete all chats from Firestore:', error);
      }
    }
  };

  const handleSendMessage = async (content: string, searchMode: 'standard' | 'deep-search' = 'standard', files: any[] = [], selectedTool: 'create-image' | 'deep-search' | 'guided-learning' | null = null) => {
    if (!content.trim()) return;

    // Check message count for unauthenticated users
    const currentChat = chats.find((c) => c.id === currentChatId);
    const messageCount = currentChat?.messages.filter(m => m.role === "user").length || 0;
    
    if (!isAuthenticated && messageCount >= 3) {
      setShowLoginPrompt(true);
      return;
    }

    let chatId = currentChatId;
    if (!chatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
        messages: [],
        timestamp: new Date(),
      };
      setChats((prev) => [newChat, ...prev]);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    );

    setInputValue("");
    setIsLoading(true);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    const streamingId = `ai-streaming-${Date.now()}`;
    
    // Determine model type based on selectedSpeed
    const modelType = selectedSpeed === 'pro' ? 'pro' : selectedSpeed === 'medium' ? 'medium' : 'free';
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...(currentChat?.messages || []), userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedSpeed === 'pro' ? 'groq' : selectedSpeed === 'medium' ? 'medium' : 'hf',
          userId: user?.id,
          searchMode,
          selectedTool,
          modelType,
          userProfile: user ? {
            firstName: user.displayName?.split(' ')[0] || null,
            name: user.displayName || null,
            email: user.email || null,
          } : null,
        }),
        signal,
      });

      if (!response.ok) throw new Error('API error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentText = "";
      let metadataParsed = false;
      let messageSources: Source[] | undefined;
      let messageVideos: YouTubeVideo[] | undefined;
      let messageNewsArticles: any[] | undefined;
      let messageMovieResults: any[] | undefined;
      let messagePersonResults: any[] | undefined;
      let messageEntertainmentEntities: any[] | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          let textChunk = chunk;
          
          // Try to parse metadata from first chunk
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(line);
                // Filter out all JSON metadata messages (plan, metadata, etc.)
                if (parsed.type === 'plan' || parsed.type === 'metadata') {
                  if (parsed.type === 'metadata') {
                    messageSources = parsed.sources;
                    messageVideos = parsed.youtubeVideos;
                    messageNewsArticles = parsed.newsArticles || [];
                    messageMovieResults = parsed.movieResults || [];
                    messagePersonResults = parsed.personResults || [];
                    messageEntertainmentEntities = parsed.entertainmentEntities || [];
                    metadataParsed = true;
                  }
                  // Remove metadata from text chunk
                  textChunk = textChunk.replace(line, '').trimStart();
                }
              } catch {
                // Not valid JSON, treat as text
              }
            }
          }
          
          currentText += textChunk;
          
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: [
                      ...chat.messages.filter(m => m.id !== streamingId),
                      {
                        id: streamingId,
                        role: "assistant",
                        content: currentText,
                        agentType: selectedSpeed,
                        modelType: modelType,
                        sources: messageSources,
                        youtubeVideos: messageVideos,
                        newsArticles: messageNewsArticles,
                        movieResults: messageMovieResults,
                        personResults: messagePersonResults,
                        entertainmentEntities: messageEntertainmentEntities,
                      },
                    ],
                  }
                : chat
            )
          );
        }
      }

      // Finalize message with metadata
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages.filter(m => m.id !== streamingId),
                  {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: currentText,
                    agentType: selectedSpeed,
                    modelType: modelType,
                    sources: messageSources,
                    youtubeVideos: messageVideos,
                    newsArticles: messageNewsArticles,
                    movieResults: messageMovieResults,
                    personResults: messagePersonResults,
                    entertainmentEntities: messageEntertainmentEntities,
                  },
                ],
              }
            : chat
        )
      );

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        // Add error message
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages,
                    {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: "Sorry, I encountered an error. Please try again.",
                    },
                  ],
                }
              : chat
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "Response was canceled",
                    isSystem: true,
                  },
                ],
              }
            : chat
        )
      );
      
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Generate PDF from markdown content with videos and sources
  const generatePDF = (content: string, topic: string, videos: any[] = [], sources: any[] = []) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build video section HTML
    const videosHtml = videos.length > 0 ? `
      <div class="videos-section">
        <h2>Video Resources</h2>
        ${videos.map(v => `
          <div class="video-item">
            <a href="${v.url}" target="_blank">${v.title}</a>
            <p>Channel: ${v.channelTitle}</p>
          </div>
        `).join('')}
      </div>
    ` : '';

    // Build sources section HTML
    const sourcesHtml = sources.length > 0 ? `
      <div class="sources-section">
        <h2>Web Sources</h2>
        ${sources.map(s => `
          <div class="source-item">
            <a href="${s.url}" target="_blank">${s.title}</a>
            <p>Source: ${s.source}</p>
          </div>
        `).join('')}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${topic} - Learning Guide</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          h3 { color: #666; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
          blockquote { border-left: 4px solid #007bff; margin: 0; padding-left: 20px; color: #666; }
          .header { text-align: center; margin-bottom: 40px; }
          .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #999; }
          .videos-section, .sources-section { margin-top: 30px; }
          .video-item, .source-item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; }
          .video-item a, .source-item a { color: #007bff; text-decoration: none; }
          .video-item p, .source-item p { margin: 5px 0 0 0; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${topic}</h1>
          <p>Guided Learning Material</p>
        </div>
        <div>${content.replace(/\n/g, '<br>').replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/#\s(.+)/g, '<h2>$1</h2>').replace(/##\s(.+)/g, '<h3>$1</h3>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>
        ${videosHtml}
        ${sourcesHtml}
        <div class="footer">
          <p>Generated by Koda-A | Nyati Core</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Guided Learning Generation
  const generateGuidedLearning = async (topic: string, level: string) => {
    if (!isAuthenticated || !user) {
      setShowLoginPrompt(true);
      return;
    }

    setIsGeneratingLearning(true);
    setGuidedLearningTopic(topic);
    setGuidedLearningLevel(level);
    setGuidedLearningVideos([]);
    setGuidedLearningSources([]);
    setShowGuidedLearningModal(true);

    let videos: any[] = [];
    let sources: any[] = [];

    try {
      const response = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          level,
          userId: user.id,
          model: selectedSpeed,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate learning material');

      // Get metadata from headers
      const videosHeader = response.headers.get('X-Videos');
      const sourcesHeader = response.headers.get('X-Sources');
      if (videosHeader) {
        try { 
          videos = JSON.parse(decodeURIComponent(videosHeader)); 
          setGuidedLearningVideos(videos);
        } catch {}
      }
      if (sourcesHeader) {
        try { 
          sources = JSON.parse(decodeURIComponent(sourcesHeader)); 
          setGuidedLearningSources(sources);
        } catch {}
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let metadataParsed = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // Try to parse metadata from first chunk
          if (!metadataParsed) {
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(line);
                  if (parsed.type === 'metadata') {
                    videos = parsed.videos || [];
                    sources = parsed.sources || [];
                    setGuidedLearningVideos(videos);
                    setGuidedLearningSources(sources);
                    metadataParsed = true;
                    // Remove metadata from content
                    fullContent += chunk.replace(line + '\n', '');
                    continue;
                  }
                } catch {}
              }
            }
            if (!metadataParsed) {
              fullContent += chunk;
            }
          } else {
            fullContent += chunk;
          }
          
          setGuidedLearningContent(fullContent);
        }
      }

      // Save to Firestore
      const savedMaterial = await saveGuidedLearningMaterial(user.id, {
        topic,
        level,
        content: fullContent,
      });

      if (savedMaterial) {
        setLearningMaterials(prev => [savedMaterial, ...prev]);
      }

      // Also store in Qdrant for semantic search
      try {
        const { addLearningMaterial } = await import('../lib/qdrant');
        const { generateEmbeddingWithRetry } = await import('../lib/embeddings');
        const embedding = await generateEmbeddingWithRetry(topic + ' ' + fullContent.slice(0, 500));
        await addLearningMaterial(
          savedMaterial?.id || Date.now().toString(),
          user.id,
          topic,
          fullContent,
          embedding,
          { level, videos, sources }
        );
      } catch (qdrantError) {
        console.error('Failed to store in Qdrant:', qdrantError);
      }

    } catch (error) {
      console.error('Guided learning error:', error);
      setGuidedLearningContent('Error generating learning material. Please try again.');
    } finally {
      setIsGeneratingLearning(false);
    }
  };

  const handleSwitchEngine = () => {
    setActiveEngine((prev) => (prev === "groq" ? "hf" : "groq"));
  };


  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden">
      {/* Minimal Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onNewChat={handleNewChat}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearAllChats={handleClearAllChats}
        onOpenInstructions={() => setShowInstructionsModal(true)}
        onOpenBooks={handleOpenBooks}
        activeEngine={activeEngine}
        onSwitchEngine={handleSwitchEngine}
        user={user}
        isAuthenticated={isAuthenticated}
        onSignIn={signInWithGoogle}
        onSignOut={logout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header - Sticky */}
        <header className="sticky top-0 flex items-center px-4 py-3 z-20 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Menu size={20} className="text-gray-400" />
          </button>
          
          <span className="flex-1 text-center font-medium text-gray-300 md:text-left md:flex-none md:ml-3">
            Koda-A
          </span>
          
          {/* Model indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">
              {selectedSpeed === 'pro' ? 'Pro' : selectedSpeed === 'medium' ? 'Medium' : 'Free'}
            </span>
          </div>
        </header>

        {/* Chat Messages / Content Area */}
        <div 
          className="flex-1 overflow-y-auto px-4 relative"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className="max-w-3xl mx-auto min-h-full flex flex-col">
            {currentChat && currentChat.messages.length > 0 ? (
              <>
                {/* Messages */}
                <div className="space-y-6 py-8 flex-1">
                  <AnimatePresence mode="popLayout">
                    {currentChat.messages.map((message) => (
                      <div key={message.id}>
                        <StreamingMessage
                          role={message.role}
                          content={message.content}
                          isStreaming={isLoading && message.role === 'assistant' && message.id === currentChat.messages[currentChat.messages.length - 1]?.id}
                          isComplete={!isLoading || message.role === 'user'}
                          sources={message.sources}
                          onSourceClick={handleCitationClick}
                          onShowSources={() => {
                            if (message.sources) {
                              setActiveSources(message.sources);
                              setSourcesSidebarOpen(true);
                            }
                          }}
                          modelType={message.modelType || selectedSpeed}
                          onStopGeneration={handleStopGeneration}
                          onSuggestionClick={(suggestion) => {
                            setInputValue(suggestion);
                            handleSendMessage(suggestion, searchMode, [], null);
                          }}
                          newsArticles={message.newsArticles}
                          movieResults={message.movieResults}
                          personResults={message.personResults}
                          entertainmentEntities={message.entertainmentEntities}
                        />
                        
                        {/* YouTube Video Cards */}
                        {message.youtubeVideos && message.youtubeVideos.length > 0 && (
                          <div className="mt-4 ml-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {message.youtubeVideos.map((video) => (
                              <a
                                key={video.id}
                                href={`https://youtube.com/watch?v=${video.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex gap-3 p-3 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl transition-all"
                              >
                                <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                    <Play size={20} className="text-white opacity-80" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                                    {video.title}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">{video.channelTitle}</p>
                                  <p className="text-xs text-gray-500">
                                    {formatViewCount(video.viewCount)} views • {formatPublishedDate(video.publishedAt)}
                                  </p>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-4 py-4"
                    >
                      {/* AI Avatar with spinning loader ring */}
                      <div className="relative w-8 h-8 shrink-0">
                        {/* Spinning ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-purple-400 animate-spin" />
                        {/* AI Image */}
                        <img 
                          src="/nyati.webp" 
                          alt="AI" 
                          className="absolute inset-0.5 w-7 h-7 rounded-full object-cover"
                        />
                      </div>
                      
                      {/* Typewriter message */}
                      <div className="flex-1 pt-1">
                        <span className="text-sm text-gray-400 font-medium">
                          {displayedLoadingText}
                          <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                        </span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Fixed Input at bottom when messages exist */}
                <div className="sticky bottom-0 py-4 bg-[#0d0d0d]">
                  <InputPill 
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    handleSendMessage={(content, tool) => handleSendMessage(content, searchMode, [], tool)}
                    isLoading={isLoading}
                    selectedSpeed={selectedSpeed}
                    setSelectedSpeed={setSelectedSpeed}
                    onStopGeneration={handleStopGeneration}
                    searchMode={searchMode}
                    setSearchMode={setSearchMode}
                    showModeSelector={showModeSelector}
                    setShowModeSelector={setShowModeSelector}
                    modeSelectorRef={modeSelectorRef}
                    inputWidth={inputWidth}
                    setInputWidth={setInputWidth}
                    inputHeight={inputHeight}
                    setInputHeight={setInputHeight}
                  />
                </div>
              </>
            ) : (
              /* Welcome Screen - with input above the fold */
              <div className="flex flex-col justify-center items-center flex-1 py-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center w-full"
                >
                  {/* AI Model Logo */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {selectedSpeed === 'medium' ? (
                      <div className="flex items-center gap-1">
                        <img 
                          src="/nyati.webp" 
                          alt="Nyati" 
                          className="w-[50px] h-[50px] rounded object-cover"
                        />
                        <span className="text-gray-500 text-lg mx-1">&</span>
                        <img 
                          src="/logo.webp" 
                          alt="Logo" 
                          className="w-[50px] h-[50px] rounded object-cover"
                        />
                      </div>
                    ) : (
                      <img 
                        src={selectedSpeed === 'pro' ? '/logo.webp' : '/nyati.webp'} 
                        alt="AI Model" 
                        className="w-[50px] h-[50px] rounded object-cover"
                      />
                    )}
                    <span className="text-sm text-gray-400">
                      {selectedSpeed === 'pro' ? 'Koda-A' : selectedSpeed === 'medium' ? 'Medium Agent' : 'nyati-core01'}
                    </span>
                  </div>

                  {/* Greeting */}
                  <div className="flex flex-col items-center justify-center mb-2">
                    {isAuthenticated && user ? (
                      <h1 className="text-3xl md:text-5xl font-normal text-white mb-4">
                        Hey {(user as any).displayName?.split(' ')[0] || (user as any).firstName || user.email?.split('@')[0] || 'there'}
                      </h1>
                    ) : (
                      <h1 className="text-3xl md:text-5xl font-normal text-white mb-4">
                        {greeting}
                      </h1>
                    )}
                    {/* Rotating messages */}
                    <RotatingMessages />
                  </div>

                  {/* Input Pill - positioned higher on welcome screen */}
                  <div className="mb-8">
                    <InputPill 
                      inputValue={inputValue}
                      setInputValue={setInputValue}
                      handleSendMessage={(content) => handleSendMessage(content, searchMode, [])}
                      isLoading={isLoading}
                      selectedSpeed={selectedSpeed}
                      setSelectedSpeed={setSelectedSpeed}
                      onStopGeneration={handleStopGeneration}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      showModeSelector={showModeSelector}
                      setShowModeSelector={setShowModeSelector}
                      modeSelectorRef={modeSelectorRef}
                      inputWidth={inputWidth}
                      setInputWidth={setInputWidth}
                      inputHeight={inputHeight}
                      setInputHeight={setInputHeight}
                    />
                  </div>

                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Login Prompt Modal */}
        <AnimatePresence>
          {showLoginPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLoginPrompt(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 max-w-md w-full text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogIn size={24} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Sign in to continue chatting
                </h3>
                <p className="text-gray-400 mb-6">
                  Please sign in with Google to continue chatting with Koda-AI and save your conversations.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl transition-colors text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      signInWithGoogle();
                      setShowLoginPrompt(false);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-xl transition-colors text-white font-medium"
                  >
                    Sign in with Google
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guided Learning Modal */}
        <AnimatePresence>
          {showGuidedLearningModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setShowGuidedLearningModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <BookOpen size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {guidedLearningTopic || 'Learning Guide'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Level: {guidedLearningLevel} • {isGeneratingLearning ? 'Generating...' : 'Complete'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isGeneratingLearning && guidedLearningContent && (
                      <button
                        onClick={() => generatePDF(guidedLearningContent, guidedLearningTopic, guidedLearningVideos, guidedLearningSources)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors text-white text-sm font-medium"
                      >
                        <Download size={16} />
                        Download PDF
                      </button>
                    )}
                    <button
                      onClick={() => setShowGuidedLearningModal(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isGeneratingLearning && !guidedLearningContent ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                      <p className="text-gray-400">Generating your learning guide...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take a minute</p>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                        {guidedLearningContent || 'Loading...'}
                      </div>
                      
                      {/* Videos Section */}
                      {guidedLearningVideos.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Play size={18} className="text-red-400" />
                            Video Resources
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guidedLearningVideos.map((video, idx) => (
                              <a
                                key={idx}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex gap-3 p-3 bg-[#252525] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl transition-all"
                              >
                                <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                                    <Play size={16} className="text-white opacity-80" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
                                    {video.title}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">{video.channelTitle}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Sources Section */}
                      {guidedLearningSources.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Globe size={18} className="text-blue-400" />
                            Web Sources
                          </h3>
                          <div className="space-y-3">
                            {guidedLearningSources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-[#252525] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl transition-all"
                              >
                                <p className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                                  {source.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{source.source}</p>
                                {source.snippet && (
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{source.snippet}</p>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2a2a2a] bg-[#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Generated by Koda-A • Saved to your library
                    </p>
                    {!isGeneratingLearning && guidedLearningContent && (
                      <button
                        onClick={() => generatePDF(guidedLearningContent, guidedLearningTopic)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Download size={14} />
                        Save as PDF
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions Modal */}
        <AnimatePresence>
          {showInstructionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInstructionsModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-blue-400" size={24} />
                    <h2 className="text-xl font-semibold text-white">Instructions for Koda</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={instructionsEnabled}
                          onChange={(e) => setInstructionsEnabled(e.target.checked)}
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${instructionsEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${instructionsEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                    <button
                      onClick={() => setShowInstructionsModal(false)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <p className="text-gray-400 text-sm mb-6">
                    Share info about your life and preferences to get more helpful responses. Add new info here or ask Koda to remember something during a chat.
                  </p>

                  {/* Add New Instruction */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => setShowInstructionInput(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-medium transition-colors"
                    >
                      + Add
                    </button>
                    {instructions.length > 0 && (
                      <button
                        onClick={handleDeleteAllInstructions}
                        className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-full text-sm ml-auto transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete all
                      </button>
                    )}
                  </div>

                  {/* New Instruction Input */}
                  {showInstructionInput && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-[#252525] rounded-xl border border-[#2a2a2a]"
                    >
                      <textarea
                        value={newInstruction}
                        onChange={(e) => setNewInstruction(e.target.value)}
                        placeholder="Enter an instruction..."
                        className="w-full bg-transparent text-white resize-none outline-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            setNewInstruction("");
                            setShowInstructionInput(false);
                          }}
                          className="px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            handleAddInstruction();
                            setShowInstructionInput(false);
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Instructions List */}
                  <div className="space-y-3">
                    {instructions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No instructions yet. Add one to get started!</p>
                      </div>
                    ) : (
                      instructions.map((instruction, index) => (
                        <motion.div
                          key={instruction.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group flex items-center justify-between p-4 bg-[#252525] rounded-xl border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
                        >
                          <p className="text-white flex-1">{instruction.text}</p>
                          <button
                            onClick={() => handleDeleteInstruction(instruction.id)}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-full transition-all text-red-400"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Books Modal */}
        <AnimatePresence>
          {showBooksModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowBooksModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden max-h-[90vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    <Library className="text-purple-400" size={24} />
                    <h2 className="text-xl font-semibold text-white">Bxarchi Books</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                        placeholder="Search books..."
                        className="pl-9 pr-4 py-2 bg-[#252525] rounded-full text-sm text-white placeholder-gray-500 outline-none border border-[#2a2a2a] focus:border-[#3a3a3a] w-64"
                      />
                    </div>
                    <button
                      onClick={() => setShowBooksModal(false)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  {booksLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                      <span className="ml-3 text-gray-400">Loading books...</span>
                    </div>
                  ) : books.length === 0 ? (
                    <div className="text-center py-20">
                      <BookIcon size={48} className="mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">No books found</p>
                      <p className="text-gray-600 text-sm mt-2">Books will appear here once added to Bxarchi</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {books
                        .filter(book => book.published === true)
                        .filter(book => 
                          book.title?.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                          book.authorName?.toLowerCase().includes(bookSearchQuery.toLowerCase())
                        )
                        .map((book) => (
                          <motion.div
                            key={book.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group bg-[#252525] rounded-xl overflow-hidden border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all cursor-pointer"
                            onClick={() => setSelectedBook(book)}
                          >
                            {/* Book Cover */}
                            <div className="aspect-[3/4] bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center relative overflow-hidden">
                              {book.coverImage ? (
                                <img 
                                  src={book.coverImage} 
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-4">
                                  <BookIcon size={48} className="mx-auto mb-2 text-gray-500" />
                                  <p className="text-xs text-gray-600 line-clamp-2">{book.title}</p>
                                </div>
                              )}
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-sm font-medium">Read Book</span>
                              </div>
                            </div>
                            {/* Book Info */}
                            <div className="p-3">
                              <h3 className="text-white font-medium text-sm line-clamp-1">{book.title}</h3>
                              {book.authorName && (
                                <p className="text-gray-500 text-xs mt-1">{book.authorName}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                {book.genre && (
                                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                    {book.genre}
                                  </span>
                                )}
                                {book.likes !== undefined && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Sparkles size={10} /> {book.likes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2a2a2a] bg-[#1a1a1a]">
                  <p className="text-xs text-gray-500 text-center">
                    Powered by Bxarchi • {books.length} books available
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book Detail Modal */}
        <AnimatePresence>
          {selectedBook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setSelectedBook(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-[#2a2a2a] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b border-[#2a2a2a] flex items-start gap-4">
                  {selectedBook.coverImage ? (
                    <img 
                      src={selectedBook.coverImage} 
                      alt={selectedBook.title}
                      className="w-24 h-36 object-cover rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-36 bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg flex items-center justify-center">
                      <BookIcon size={32} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">{selectedBook.title}</h2>
                    {selectedBook.authorName && (
                      <p className="text-gray-400 mt-1">by {selectedBook.authorName}</p>
                    )}
                    {selectedBook.genre && (
                      <span className="inline-block mt-2 px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
                        {selectedBook.genre}
                      </span>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      {selectedBook.likes !== undefined && (
                        <span className="flex items-center gap-1">
                          <Sparkles size={14} /> {selectedBook.likes} likes
                        </span>
                      )}
                      {selectedBook.views !== undefined && (
                        <span>{selectedBook.views} views</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Content Preview */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                  {selectedBook.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{selectedBook.description}</p>
                    </div>
                  )}
                  
                  {selectedBook.content && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Preview</h3>
                      <div className="bg-[#252525] rounded-lg p-4 border border-[#2a2a2a]">
                        <p className="text-gray-300 text-sm leading-relaxed line-clamp-[8]">
                          {selectedBook.content.substring(0, Math.floor(selectedBook.content.length * 0.25))}
                          {selectedBook.content.length > 100 && "..."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#2a2a2a] bg-[#1a1a1a]">
                  <a
                    href={`https://bxarchi.vercel.app/book/${selectedBook.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all"
                  >
                    <BookOpen size={20} />
                    Read Book on Bxarchi
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
      
      {/* Sources Sidebar */}
      <SourcesSidebar
        sources={activeSources || []}
        isOpen={sourcesSidebarOpen}
        onClose={() => {
          setSourcesSidebarOpen(false);
          setHighlightedSourceId(null);
        }}
        highlightedSourceId={highlightedSourceId}
      />
    </div>
  );
}
