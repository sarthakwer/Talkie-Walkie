'use client';

import { useState, useEffect, useRef } from 'react';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// TypeScript Types and Interfaces
interface Mood {
  emoji: string;
  label: string;
  intensity: number;
}

interface JournalEntry {
  id: string;
  date: string;
  time: string;
  mood: {
    label: string;
    color: string;
  };
  snippet: string;
  hasAudio: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

// LocalStorage utilities
const STORAGE_KEY = 'talkie-walkie-entries';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading entries:', error);
    return [];
  }
}

function saveEntries(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving entries:', error);
  }
}

function addEntry(newEntry: JournalEntry): void {
  const entries = loadEntries();
  entries.unshift(newEntry); // Add to beginning for newest first
  saveEntries(entries);
}

// MoodIndicator Component
function MoodIndicator({ mood }: { mood: Mood }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-lg shadow-black/40">
      <p className="mb-4 text-sm font-medium text-slate-400">Mood right now</p>
      <div className="flex items-center gap-4">
        <div className="text-6xl">{mood.emoji}</div>
        <div className="flex-1">
          <p className="mb-2 text-2xl font-semibold text-slate-100">{mood.label}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${mood.intensity}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Intensity: {mood.intensity}%</p>
        </div>
      </div>
    </div>
  );
}

// RecordingControls Component
function RecordingControls({
  state,
  onStartRecording,
  onStopRecording,
}: {
  state: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
}) {
  const getStatusText = () => {
    switch (state) {
      case 'recording':
        return 'Listening… speak freely.';
      case 'processing':
        return 'Processing your entry…';
      default:
        return 'Ready to capture your thoughts.';
    }
  };

  const getButtonText = () => {
    switch (state) {
      case 'recording':
        return 'Recording…';
      case 'processing':
        return 'Processing…';
      default:
        return 'Start Recording';
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-8 shadow-lg shadow-black/40">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onStartRecording}
          disabled={state !== 'idle'}
          className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/60 disabled:opacity-50 disabled:hover:scale-100"
        >
          {state === 'recording' ? (
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-pulse rounded-full bg-white"></div>
            </div>
          ) : (
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>

        <button
          onClick={onStopRecording}
          disabled={state !== 'recording'}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-all hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
        >
          <svg
            className="h-6 w-6 text-slate-100"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-lg font-medium text-slate-100">{getButtonText()}</p>
        <p className="mt-1 text-sm text-slate-400">{getStatusText()}</p>
      </div>
    </div>
  );
}

// LiveTranscript Component
function LiveTranscript({ transcript, isRecording }: { transcript: string; isRecording: boolean }) {
  // Remove interim marker for display
  const displayTranscript = transcript.split('|INTERIM|').join('');
  
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-lg shadow-black/40">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">Live Transcript</h3>
      <div className="h-56 overflow-y-auto rounded-lg bg-black/20 p-4 font-mono text-sm">
        {displayTranscript ? (
          <p className="leading-relaxed text-slate-300">
            {displayTranscript}
            {isRecording && <span className="ml-1 animate-pulse">▊</span>}
          </p>
        ) : (
          <p className="text-slate-500">Your words will appear here as you speak…</p>
        )}
      </div>
    </div>
  );
}

// EntryCard Component
function EntryCard({ entry, isSelected }: { entry: JournalEntry; isSelected: boolean }) {
  return (
    <div
      className={`cursor-pointer rounded-xl border bg-white/5 p-4 shadow-md shadow-black/20 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 ${
        isSelected ? 'border-indigo-500/50 bg-white/10' : 'border-white/5'
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-100">{entry.date}</p>
          <p className="text-xs text-slate-500">{entry.time}</p>
        </div>
        {entry.hasAudio && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20">
            <svg className="h-3 w-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 5.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7.5 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM9 15.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
            </svg>
          </div>
        )}
      </div>

      <div className="mb-3">
        <span
          className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${entry.mood.color}`}
        >
          {entry.mood.label}
        </span>
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">{entry.snippet}</p>
    </div>
  );
}

// EntriesList Component
function EntriesList({
  entries,
  selectedId,
  onSelectEntry,
}: {
  entries: JournalEntry[];
  selectedId: string | null;
  onSelectEntry: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-lg shadow-black/40">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-100">Your Past Entries</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">Revisit what you were feeling on any day.</p>

        <input
          type="text"
          placeholder="Search by mood or keyword…"
          className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '600px' }}>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} onClick={() => onSelectEntry(entry.id)}>
              <EntryCard entry={entry} isSelected={selectedId === entry.id} />
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm leading-relaxed text-slate-400">
              Your past self will start showing up here once you've recorded a few entries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Home Component
export default function Home() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentMood, setCurrentMood] = useState<Mood>({
    emoji: '😌',
    label: 'Calm',
    intensity: 65,
  });
  const [liveTranscript, setLiveTranscript] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  
  const recognitionRef = useRef<any>(null);

  // Load entries from localStorage on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setBrowserSupported(false);
        setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setLiveTranscript((prev) => {
          const base = prev.split('|INTERIM|')[0];
          if (finalTranscript) {
            return base + finalTranscript;
          }
          return base + '|INTERIM|' + interimTranscript;
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please check your browser permissions and reload the page.');
        } else if (event.error === 'no-speech') {
          // Don't show error for no-speech, just continue listening
          return;
        } else if (event.error === 'aborted') {
          // Recognition was aborted, likely user stopped it
          return;
        } else if (event.error === 'network') {
          setError('Network error. Speech recognition requires an internet connection.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setRecordingState('idle');
        setCurrentMood({
          emoji: '😌',
          label: 'Calm',
          intensity: 65,
        });
      };

      recognition.onend = () => {
        if (recordingState === 'recording') {
          // If we're still supposed to be recording, restart it
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [recordingState]);

  const handleStartRecording = async () => {
    if (recordingState !== 'idle' || !browserSupported) return;

    setError(null);

    // First, request microphone permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed to get permission
      stream.getTracks().forEach(track => track.stop());
      
      // Now start speech recognition
      setRecordingState('recording');
      setLiveTranscript('');
      setCurrentMood({
        emoji: '🎤',
        label: 'Expressing',
        intensity: 80,
      });

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Failed to start recording:', error);
          setError('Failed to start recording. Please try again.');
          setRecordingState('idle');
          setCurrentMood({
            emoji: '😌',
            label: 'Calm',
            intensity: 65,
          });
        }
      }
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Could not access microphone. Please check your browser settings.');
      }
    }
  };

  const handleStopRecording = () => {
    if (recordingState !== 'recording') return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setRecordingState('processing');

    // Clean up interim marker and get final transcript
    const finalTranscript = liveTranscript.split('|INTERIM|')[0].trim();
    setLiveTranscript(finalTranscript);

    // Process and save the entry
    setTimeout(() => {
      if (finalTranscript) {
        // Create new journal entry
        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        const newEntry: JournalEntry = {
          id: generateId(),
          date: dateFormatter.format(now),
          time: timeFormatter.format(now),
          mood: { 
            label: 'Reflective', 
            color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
          },
          snippet: finalTranscript.length > 120 
            ? finalTranscript.substring(0, 120) + '...' 
            : finalTranscript,
          hasAudio: true,
        };

        // Save to localStorage and update state
        addEntry(newEntry);
        setEntries(loadEntries());
      }

      setRecordingState('idle');
      setCurrentMood({
        emoji: '😌',
        label: 'Calm',
        intensity: 65,
      });
    }, 1000);
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id === selectedEntryId ? null : id);
  };

  // Get current date/time
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Talkie-Walkie</h1>
            <p className="mt-1 text-sm text-slate-400">
              Capture how you feel, in your own voice.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              There's no right way to feel. Just start talking.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-semibold text-white shadow-lg">
            U
          </div>
        </header>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT column: Previous Entries */}
          <div className="order-2 lg:order-1">
            <EntriesList
              entries={entries}
              selectedId={selectedEntryId}
              onSelectEntry={handleSelectEntry}
            />
          </div>

          {/* RIGHT column: Current Session */}
          <div className="order-1 space-y-6 lg:order-2">
            {/* Session header */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg shadow-black/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {dateFormatter.format(now)}
                  </p>
                  <p className="text-xs text-slate-500">{timeFormatter.format(now)}</p>
                </div>
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300">
                  Current Session
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-lg shadow-black/40">
                <p className="text-sm font-medium text-red-300 mb-2">⚠️ {error}</p>
                {error.includes('denied') || error.includes('access') ? (
                  <div className="text-xs text-red-200/80 mt-2 space-y-1">
                    <p>To fix this:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the 🔒 or camera icon in your browser's address bar</li>
                      <li>Allow microphone access for this site</li>
                      <li>Reload the page and try again</li>
                    </ol>
                  </div>
                ) : null}
              </div>
            )}

            {/* Browser not supported warning */}
            {!browserSupported && (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 shadow-lg shadow-black/40">
                <p className="text-sm text-yellow-300">
                  ⚠️ Your browser doesn't support speech recognition. Please use Chrome or Edge for the best experience.
                </p>
              </div>
            )}

            {/* Mood indicator */}
            <MoodIndicator mood={currentMood} />

            {/* Recording controls */}
            <RecordingControls
              state={recordingState}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />

            {/* Live transcript */}
            <LiveTranscript
              transcript={liveTranscript}
              isRecording={recordingState === 'recording'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
