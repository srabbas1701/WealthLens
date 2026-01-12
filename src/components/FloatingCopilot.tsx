'use client';

import { useState, useRef, useEffect } from 'react';
import { SparklesIcon, XIcon, SendIcon, CheckCircleIcon, AlertTriangleIcon } from './icons';
import type { 
  CopilotQueryRequest, 
  CopilotQueryResponse, 
  Source, 
  Intent,
  Status,
  STATUS_COLORS,
  STATUS_LABELS
} from '@/types/copilot';

/**
 * Floating Portfolio Analyst Button
 * 
 * Non-intrusive, always accessible.
 * Opens a chat panel for portfolio questions.
 * 
 * IMPORTANT: Frontend does NOT:
 * - Build prompts
 * - Interpret market data
 * - Decide status
 * - Modify AI language
 * 
 * Frontend MUST:
 * - Pass intent cleanly
 * - Render response verbatim
 * - Respect status flags
 * - Keep UI calm
 */

interface FloatingCopilotProps {
  source?: Source;
  userId?: string;
  /** Initial message to send when opening the copilot (e.g., from a CTA) */
  initialMessage?: string;
  /** Callback to clear the initial message after it's been sent */
  onInitialMessageSent?: () => void;
  /** Number of issues to display as a badge (e.g., validation issues) */
  issueCount?: number;
  /** External trigger to open/close the copilot (e.g., from header button) */
  externalIsOpen?: boolean;
  /** Callback when copilot state changes */
  onStateChange?: (isOpen: boolean) => void;
  /** Position of the floating button - 'top-right' (default, conventional) or 'bottom-right' */
  position?: 'top-right' | 'bottom-right';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: Status;
  followUps?: string[];
}

// Generate session ID for conversation continuity
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Map question to intent (helps orchestrator route safely)
function detectIntent(question: string): Intent {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('today') || lowerQ.includes('change') || lowerQ.includes('move')) {
    return 'daily_movement';
  }
  if (lowerQ.includes('risk')) {
    return 'risk_explanation';
  }
  if (lowerQ.includes('goal') || lowerQ.includes('track') || lowerQ.includes('progress')) {
    return 'goal_progress';
  }
  if (lowerQ.includes('sector') || lowerQ.includes('allocation') || lowerQ.includes('exposure')) {
    return 'sector_exposure';
  }
  if (lowerQ.includes('portfolio') || lowerQ.includes('doing') || lowerQ.includes('how am i')) {
    return 'portfolio_explanation';
  }
  
  return 'general_question';
}

// Status badge component
function StatusBadge({ status }: { status: Status }) {
  const colors = {
    no_action_required: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    monitor: 'bg-gray-50 text-gray-600 border-gray-200',
    attention_required: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  
  const labels = {
    no_action_required: 'No action needed',
    monitor: 'Worth monitoring',
    attention_required: 'Review suggested',
  };
  
  const icons = {
    no_action_required: <CheckCircleIcon className="w-3 h-3" />,
    monitor: <AlertTriangleIcon className="w-3 h-3" />,
    attention_required: <AlertTriangleIcon className="w-3 h-3" />,
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {icons[status]}
      {labels[status]}
    </div>
  );
}

export default function FloatingCopilot({ 
  source = 'floating_copilot', 
  userId,
  initialMessage,
  onInitialMessageSent,
  issueCount = 0,
  externalIsOpen,
  onStateChange,
  position = 'top-right',
}: FloatingCopilotProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  const setIsOpen = (value: boolean) => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(value);
    }
    onStateChange?.(value);
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for custom event to open copilot from header button
  useEffect(() => {
    const handleOpenCopilot = () => {
      if (externalIsOpen === undefined) {
        // Only handle event if not externally controlled
        setIsOpen(true);
      } else {
        // If externally controlled, trigger the state change callback
        onStateChange?.(true);
      }
    };

    window.addEventListener('openCopilot', handleOpenCopilot);
    return () => {
      window.removeEventListener('openCopilot', handleOpenCopilot);
    };
  }, [externalIsOpen, onStateChange]);

  // Handle initial message - open copilot and send the message
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      // Open the copilot if not already open
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  }, [initialMessage, isOpen]);

  // Send the initial message once copilot is open
  useEffect(() => {
    if (isOpen && initialMessage && !initialMessageSentRef.current && !isLoading) {
      initialMessageSentRef.current = true;
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleSubmit(initialMessage);
        onInitialMessageSent?.();
      }, 100);
      return () => clearTimeout(timer);
    }
    // Reset the ref when copilot closes
    if (!isOpen) {
      initialMessageSentRef.current = false;
    }
  }, [isOpen, initialMessage, isLoading]);

  const handleSubmit = async (questionOverride?: string) => {
    const question = questionOverride || input.trim();
    if (!question || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);

    try {
      // Build request payload per API spec
      const requestPayload: CopilotQueryRequest = {
        user_id: userId || 'anonymous',
        session_id: sessionId,
        source: source,
        intent: detectIntent(question),
        question: question,
      };

      const response = await fetch('/api/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data: CopilotQueryResponse = await response.json();
      
      // Render response VERBATIM - no interpretation
      const assistantContent = data.explanation 
        ? `${data.summary}\n\n${data.explanation}`
        : data.summary;
      
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: assistantContent,
          status: data.status,
          followUps: data.follow_up_suggestions,
        },
      ]);
      
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          status: 'monitor',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    handleSubmit(question);
  };

  const suggestedQuestions = [
    { text: 'How is my portfolio doing?', intent: 'portfolio_explanation' },
    { text: 'Explain my risk score', intent: 'risk_explanation' },
    { text: 'Am I on track for my goals?', intent: 'goal_progress' },
  ];

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className={`fixed ${position === 'top-right' ? 'top-24 right-6' : 'bottom-24 right-6'} w-[400px] max-h-[560px] bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#334155] flex flex-col overflow-hidden z-50`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Portfolio Analyst</p>
                <p className="text-xs text-emerald-100">Ask about your portfolio</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[360px] bg-gray-50">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Hello! I can help you understand your portfolio, explain risks, and answer questions about your investments.
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Try asking:</p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleFollowUp(q.text)}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-700 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                      >
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm'
                      }`}
                    >
                      {msg.content.split('\n').map((line, j) => (
                        <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                      ))}
                    </div>
                  </div>
                  
                  {/* Status badge for assistant messages */}
                  {msg.role === 'assistant' && msg.status && (
                    <div className="flex justify-start pl-2">
                      <StatusBadge status={msg.status} />
                    </div>
                  )}
                  
                  {/* Follow-up suggestions */}
                  {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && i === messages.length - 1 && (
                    <div className="flex flex-wrap gap-2 pl-2 pt-2">
                      {msg.followUps.map((followUp, j) => (
                        <button
                          key={j}
                          onClick={() => handleFollowUp(followUp)}
                          className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your investments..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              For educational purposes only. Not financial advice.
            </p>
          </form>
        </div>
      )}

      {/* Floating Button - Hidden when controlled externally, or show as smaller icon-only button in top-right */}
      {externalIsOpen === undefined && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed ${position === 'top-right' ? 'top-20 right-6' : 'bottom-6 right-6'} z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all relative ${
            isOpen
              ? 'bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl hover:scale-105'
          }`}
          aria-label="Open Portfolio Analyst"
        >
          {isOpen ? (
            <XIcon className="w-5 h-5" />
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              <span className="font-medium text-sm hidden sm:inline">Get Help</span>
            </>
          )}
          {/* Issue Badge */}
          {issueCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
              {issueCount}
            </span>
          )}
        </button>
      )}
    </>
  );
}
