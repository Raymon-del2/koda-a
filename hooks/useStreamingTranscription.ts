"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface StreamingTranscriptionState {
  isRecording: boolean;
  isVADActive: boolean;
  interimText: string;
  finalText: string;
  audioLevel: number;
  predictedPunctuation: string;
  bufferSize: number;
  isConnected: boolean;
  usingFallback: boolean;
}

interface UseStreamingTranscriptionReturn extends StreamingTranscriptionState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;
}

// Audio processing constants
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const VAD_THRESHOLD = 0.015;
const VAD_SILENCE_TIMEOUT = 800;
const STREAMING_INTERVAL = 500;
const OVERLAP_DURATION = 200;

// Interrogatives for quick question detection
const INTERROGATIVES = [
  'who', 'what', 'where', 'why', 'how', 'when', 'which', 
  'is', 'are', 'can', 'could', 'would', 'should', 'will',
  'do', 'does', 'did', 'have', 'has', 'am'
];

// Speech Recognition types for fallback
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useStreamingTranscription(
  onTranscript: (text: string, isFinal: boolean) => void,
  wsUrl: string = 'wss://api.koda-ai.com/stream'
): UseStreamingTranscriptionReturn {
  const [state, setState] = useState<StreamingTranscriptionState>({
    isRecording: false,
    isVADActive: false,
    interimText: '',
    finalText: '',
    audioLevel: 0,
    predictedPunctuation: '',
    bufferSize: 0,
    isConnected: false,
    usingFallback: false,
  });

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Buffer management
  const audioBufferRef = useRef<Float32Array[]>([]);
  const overlapBufferRef = useRef<Float32Array | null>(null);
  const vadBufferRef = useRef<number[]>([]);
  const silenceStartRef = useRef<number | null>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const hasWebSocketSupport = useRef(true);

  // Quick question detection with regex/heuristics
  const detectQuestion = useCallback((text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    
    const words = trimmed.split(/\s+/);
    const firstWord = words[0]?.toLowerCase();
    const lastWord = words[words.length - 1]?.toLowerCase();
    
    if (INTERROGATIVES.includes(firstWord)) {
      const risingIndicators = ['right', 'yes', 'no', 'ok', 'okay', 'please', 'thanks', 'huh'];
      const isRising = risingIndicators.includes(lastWord);
      
      if (isRising || words.length < 6) {
        return '?';
      }
    }
    
    if (words.length > 8 && !INTERROGATIVES.includes(firstWord)) {
      return '.';
    }
    
    return '';
  }, []);

  // Initialize Web Speech API fallback
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setState(prev => ({ ...prev, isRecording: true, usingFallback: true }));
    };
    
    recognition.onend = () => {
      setState(prev => ({ 
        ...prev, 
        isRecording: false, 
        interimText: '',
        predictedPunctuation: ''
      }));
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      
      const punctuation = detectQuestion(interim || finalTranscript);
      
      setState(prev => ({
        ...prev,
        interimText: interim,
        predictedPunctuation: punctuation,
      }));
      
      if (finalTranscript) {
        onTranscript(finalTranscript + punctuation, true);
        setState(prev => ({ ...prev, interimText: '', predictedPunctuation: '' }));
      } else if (interim) {
        onTranscript(interim + punctuation, false);
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.');
      }
    };
    
    return recognition;
  }, [detectQuestion, onTranscript]);

  // VAD: Calculate RMS energy
  const calculateEnergy = useCallback((buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }, []);

  // VAD: Check if speech is detected
  const isSpeechDetected = useCallback((energy: number): boolean => {
    vadBufferRef.current.push(energy);
    if (vadBufferRef.current.length > 50) {
      vadBufferRef.current.shift();
    }
    
    const avgEnergy = vadBufferRef.current.reduce((a, b) => a + b, 0) / vadBufferRef.current.length;
    const threshold = Math.max(VAD_THRESHOLD, avgEnergy * 1.5);
    
    return energy > threshold;
  }, []);

  // Start recording - use Web Speech API as primary for now
  const startRecording = useCallback(async () => {
    // Try WebSocket first (disabled until server is ready)
    const useWebSocket = false; // Set to true when WebSocket server is ready
    
    if (useWebSocket && hasWebSocketSupport.current) {
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          setState(prev => ({ ...prev, isConnected: true, usingFallback: false }));
        };
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            const text = data.text;
            const isFinal = data.isFinal;
            const punctuation = detectQuestion(text);
            
            setState(prev => ({
              ...prev,
              interimText: isFinal ? '' : text,
              finalText: isFinal ? prev.finalText + ' ' + text : prev.finalText,
              predictedPunctuation: punctuation,
            }));
            
            onTranscript(text + (isFinal ? punctuation : ''), isFinal);
          }
        };
        
        wsRef.current.onerror = () => {
          hasWebSocketSupport.current = false;
          wsRef.current?.close();
        };
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 2000);
          wsRef.current!.onopen = () => {
            clearTimeout(timeout);
            resolve(true);
          };
        });
        
        return; // WebSocket connected, exit early
      } catch {
        hasWebSocketSupport.current = false;
      }
    }
    
    // Fall back to Web Speech API
    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        await recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        alert('Could not start voice recording. Please check microphone permissions.');
      }
    } else {
      alert('Voice recording is not supported in your browser.');
    }
  }, [wsUrl, detectQuestion, onTranscript, initSpeechRecognition]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Stop WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Stop audio processing
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    
    // Clear buffers
    audioBufferRef.current = [];
    overlapBufferRef.current = null;
    vadBufferRef.current = [];
    silenceStartRef.current = null;
    
    setState(prev => ({
      ...prev,
      isRecording: false,
      isVADActive: false,
      audioLevel: 0,
      interimText: '',
      predictedPunctuation: '',
      isConnected: false,
    }));
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

export default useStreamingTranscription;
