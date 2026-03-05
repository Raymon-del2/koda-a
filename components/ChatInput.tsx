"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Mic, Globe, Database, Youtube, ChevronUp, FileText, X, Loader2 } from "lucide-react";

interface AttachedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

type SearchMode = 'standard' | 'deep-search';

interface ChatInputProps {
  onSend: (message: string, mode: SearchMode, files: AttachedFile[]) => void;
  isLoading?: boolean;
  suggestions?: string[];
}

const defaultSuggestions: Record<SearchMode, string[]> = {
  standard: [
    "Help me write code",
    "Summarize a document", 
    "Brainstorm ideas",
    "Explain a concept",
  ],
  'deep-search': [
    "What do you want to know about...",
    "Research the latest AI trends",
    "Find tutorials on React hooks",
    "Compare different database options",
  ],
};

export default function ChatInput({
  onSend,
  isLoading,
  suggestions,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>('standard');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onSend(inputValue.trim(), searchMode, attachedFiles);
    setInputValue("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // If clicking the placeholder suggestion, just focus
    if (suggestion === "What do you want to know about...") {
      textareaRef.current?.focus();
      return;
    }
    setInputValue((prev) => (prev ? `${prev} ${suggestion}` : suggestion));
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: AttachedFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'processing',
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
    
    // Simulate processing
    setTimeout(() => {
      setAttachedFiles(prev => prev.map(f => 
        newFiles.some(nf => nf.id === f.id) ? { ...f, status: 'ready' } : f
      ));
    }, 2000);
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Click outside to close mode selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setShowModeSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSuggestions = suggestions || defaultSuggestions[searchMode];
  const placeholder = searchMode === 'deep-search' 
    ? "What do you want to know about..."
    : "Ask anything...";

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/95 to-transparent z-50">
      <div className="max-w-3xl mx-auto">
        {/* Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {currentSuggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-2xl hover:bg-secondary hover:border-muted-foreground/50 transition-all duration-200 whitespace-nowrap"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>

      {/* File Attachments Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <AnimatePresence>
              {attachedFiles.map((fileObj) => (
                <motion.div
                  key={fileObj.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm group relative"
                >
                  <FileText size={16} className="text-teal-400" />
                  <span className="text-foreground truncate max-w-[150px]">{fileObj.file.name}</span>
                  {fileObj.status === 'processing' && (
                    <Loader2 size={14} className="text-muted-foreground animate-spin" />
                  )}
                  {fileObj.status === 'ready' && (
                    <span className="text-[10px] text-teal-400">Ready</span>
                  )}
                  <button
                    onClick={() => removeFile(fileObj.id)}
                    className="ml-1 p-1 text-muted-foreground hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Input Pill - Floating glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[32px] p-2 px-4 focus-ring transition-all duration-300"
        >
          <div className="flex items-end gap-2">
            {/* Mode Selector */}
            <div ref={modeSelectorRef} className="relative">
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={`p-3 rounded-full transition-all flex items-center gap-2 ${
                  searchMode === 'deep-search'
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'text-muted-foreground hover:text-teal-400 hover:bg-secondary'
                }`}
              >
                {searchMode === 'deep-search' ? <Database size={20} /> : <Globe size={20} />}
                <span className="text-xs font-medium hidden sm:inline">
                  {searchMode === 'deep-search' ? 'Deep' : 'Standard'}
                </span>
                <ChevronUp size={14} className={`transition-transform ${showModeSelector ? '' : 'rotate-180'}`} />
              </button>

              <AnimatePresence>
                {showModeSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setSearchMode('standard');
                        setShowModeSelector(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-secondary transition-colors ${
                        searchMode === 'standard' ? 'bg-secondary/50' : ''
                      }`}
                    >
                      <Globe size={18} className="text-teal-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Standard</p>
                        <p className="text-xs text-muted-foreground">Quick responses</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSearchMode('deep-search');
                        setShowModeSelector(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-secondary transition-colors ${
                        searchMode === 'deep-search' ? 'bg-secondary/50' : ''
                      }`}
                    >
                      <Database size={18} className="text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Deep Research</p>
                        <p className="text-xs text-muted-foreground">Google + YouTube + Qdrant</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-muted-foreground hover:text-teal-400 hover:bg-secondary rounded-full transition-all"
            >
              <Plus size={22} />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none py-3 text-foreground placeholder:text-muted-foreground resize-none max-h-40 overflow-y-auto text-base min-h-[24px]"
            />

            {/* Mic Button */}
            <button className="p-3 text-muted-foreground hover:text-teal-400 hover:bg-secondary rounded-full transition-all">
              <Mic size={22} />
            </button>

            {/* Send Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`p-3 rounded-full transition-all ${
                inputValue.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
