'use client';

import { useState, useRef, useEffect } from 'react';
import { XIcon, SendIcon, CheckCircleIcon, AlertTriangleIcon, MaximizeIcon, MinimizeIcon, NeuralIcon } from './icons';
import type {
  CopilotQueryRequest,
  CopilotQueryResponse,
  Source,
  Intent,
  Status,
} from '@/types/copilot';

/**
 * Floating Naira — AI Portfolio Analyst
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
 * - Render response verbatim (with markdown)
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
  intent?: Intent;
  remainingQueries?: number;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function detectIntent(question: string): Intent {
  const lowerQ = question.toLowerCase();
  if (lowerQ.includes('today') || lowerQ.includes('change') || lowerQ.includes('move') || lowerQ.includes('market')) {
    return 'daily_movement';
  }
  if (lowerQ.includes('risk') || lowerQ.includes('safe') || lowerQ.includes('volatile') || lowerQ.includes('loss')) {
    return 'risk_explanation';
  }
  if (lowerQ.includes('goal') || lowerQ.includes('track') || lowerQ.includes('progress') || lowerQ.includes('target') || lowerQ.includes('retire')) {
    return 'goal_progress';
  }
  if (lowerQ.includes('sector') || lowerQ.includes('allocation') || lowerQ.includes('exposure') || lowerQ.includes('diversif')) {
    return 'sector_exposure';
  }
  if (lowerQ.includes('portfolio') || lowerQ.includes('doing') || lowerQ.includes('how am i') || lowerQ.includes('overall')) {
    return 'portfolio_explanation';
  }
  return 'general_question';
}

// =============================================================================
// MARKDOWN CONTENT RENDERER
// =============================================================================

/**
 * Parses inline markdown: **bold**, *italic*, ₹amounts
 * Returns an array of React nodes.
 */
function parseInline(text: string, isUser: boolean): React.ReactNode {
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|₹[\d,]+(?:\.\d+)?(?:\s*(?:L|Cr|K|lakh|crore))?)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const m = match[0];
    if (m.startsWith('**')) {
      nodes.push(
        <strong
          key={key++}
          className={isUser ? 'font-semibold' : 'font-semibold text-[#111827] dark:text-[#F1F5F9]'}
        >
          {m.slice(2, -2)}
        </strong>
      );
    } else if (m.startsWith('*')) {
      nodes.push(
        <em key={key++} className="italic">
          {m.slice(1, -1)}
        </em>
      );
    } else {
      // ₹ amount — highlight in emerald for assistant messages
      nodes.push(
        <span
          key={key++}
          className={isUser ? 'font-medium' : 'font-medium text-emerald-700 dark:text-emerald-400'}
        >
          {m}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length === 0 ? text : <>{nodes}</>;
}

/**
 * Renders markdown-formatted text from the AI response.
 * Handles: **bold**, *italic*, ₹amounts, - bullets, > callouts, ## headings, paragraphs.
 */
function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const baseText = isUser ? 'text-white' : 'text-[#374151] dark:text-[#CBD5E1]';
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let elemKey = 0;

  const flushBullets = () => {
    if (bulletItems.length === 0) return;
    elements.push(
      <ul key={elemKey++} className="space-y-1 my-1.5 ml-0.5">
        {bulletItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0 ${
                isUser ? 'bg-white/70' : 'bg-emerald-500 dark:bg-emerald-400'
              }`}
            />
            <span className={baseText}>{parseInline(item.trim(), isUser)}</span>
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      bulletItems.push(line.slice(2));
    } else if (line.startsWith('> ')) {
      flushBullets();
      elements.push(
        <div
          key={elemKey++}
          className={`pl-3 border-l-2 py-0.5 my-1 text-sm ${
            isUser
              ? 'border-white/40 text-white/85 italic'
              : 'border-emerald-400 dark:border-emerald-600 text-[#4B5563] dark:text-[#94A3B8] italic'
          }`}
        >
          {parseInline(line.slice(2), isUser)}
        </div>
      );
    } else if (line.startsWith('## ') || line.startsWith('### ')) {
      flushBullets();
      const level = line.startsWith('## ') ? 3 : 2;
      const text = line.slice(level + 1);
      elements.push(
        <p
          key={elemKey++}
          className={`font-semibold mt-2 mb-0.5 text-sm ${
            isUser ? 'text-white' : 'text-[#111827] dark:text-[#F1F5F9]'
          }`}
        >
          {parseInline(text, isUser)}
        </p>
      );
    } else if (line.trim() === '') {
      flushBullets();
      if (elements.length > 0) {
        elements.push(<div key={elemKey++} className="h-1.5" />);
      }
    } else {
      flushBullets();
      elements.push(
        <p key={elemKey++} className={`${baseText} leading-relaxed`}>
          {parseInline(line, isUser)}
        </p>
      );
    }
  }

  flushBullets();
  return <div className="space-y-0.5">{elements}</div>;
}

// =============================================================================
// SCOPE BADGE (shows what the AI response is covering)
// =============================================================================

const INTENT_SCOPE: Record<string, { label: string; cls: string }> = {
  daily_movement: {
    label: "Today's Market Impact",
    cls: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700',
  },
  portfolio_explanation: {
    label: 'Overall Portfolio',
    cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
  },
  risk_explanation: {
    label: 'Risk Profile',
    cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700',
  },
  goal_progress: {
    label: 'Goal Progress',
    cls: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-700',
  },
  sector_exposure: {
    label: 'Sector Analysis',
    cls: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700',
  },
  general_question: {
    label: 'Portfolio Insights',
    cls: 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155]',
  },
  onboarding_understanding: {
    label: 'Onboarding',
    cls: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-700',
  },
};

function ScopeBadge({ intent }: { intent: Intent }) {
  const scope = INTENT_SCOPE[intent] ?? INTENT_SCOPE['general_question'];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${scope.cls}`}
    >
      {scope.label}
    </span>
  );
}

// =============================================================================
// STATUS BADGE
// =============================================================================

function StatusBadge({ status }: { status: Status }) {
  const colors: Record<Status, string> = {
    no_action_required:
      'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
    monitor:
      'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155]',
    attention_required:
      'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700',
  };

  const labels: Record<Status, string> = {
    no_action_required: 'No action needed',
    monitor: 'Worth monitoring',
    attention_required: 'Review suggested',
  };

  const icons: Record<Status, React.ReactNode> = {
    no_action_required: <CheckCircleIcon className="w-3 h-3" />,
    monitor: <AlertTriangleIcon className="w-3 h-3" />,
    attention_required: <AlertTriangleIcon className="w-3 h-3" />,
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colors[status]}`}
    >
      {icons[status]}
      {labels[status]}
    </div>
  );
}

// =============================================================================
// SUGGESTED QUESTIONS
// =============================================================================

const CAPABILITY_PILLS = [
  { label: 'Risk analysis', question: 'Explain my risk score and what it means for my portfolio' },
  { label: 'Goal tracking', question: 'Am I on track for my investment goals?' },
  { label: 'Market context', question: 'How did markets affect my portfolio today?' },
  { label: 'Diversification', question: 'Am I well diversified across sectors and asset classes?' },
  { label: 'Asset allocation', question: 'What does my current asset allocation mean?' },
];

const SUGGESTED_QUESTIONS = [
  { text: 'How is my portfolio doing overall?', intent: 'portfolio_explanation' },
  { text: 'Explain my risk score', intent: 'risk_explanation' },
  { text: 'Am I on track for my goals?', intent: 'goal_progress' },
  { text: 'How did markets affect me today?', intent: 'daily_movement' },
  { text: 'Am I well diversified across sectors?', intent: 'sector_exposure' },
  { text: 'What does my asset allocation mean?', intent: 'portfolio_explanation' },
];

// =============================================================================
// QUOTA EXHAUSTED BANNER
// =============================================================================

function formatResetDate(dateStr?: string): string {
  if (!dateStr) return 'next month';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface QuotaBannerProps {
  planTier?: string;
  queryLimit?: number;
  resetDate?: string;
}

function QuotaBanner({ planTier, queryLimit, resetDate }: QuotaBannerProps) {
  const resetOn = formatResetDate(resetDate);

  let title = 'Monthly limit reached';
  let message = '';
  let upgradeHint: React.ReactNode = null;

  if (planTier === 'free' || !planTier) {
    title = `You've used all ${queryLimit ?? 5} free queries this month`;
    message = `Your quota resets on ${resetOn}.`;
    upgradeHint = (
      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
        Upgrade to{' '}
        <a href="/pricing" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Pro</a>
        {' '}for 20 queries/mo or{' '}
        <a href="/pricing" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline">Premium</a>
        {' '}for 50 queries/mo.
      </p>
    );
  } else if (planTier === 'pro') {
    title = `You've used all ${queryLimit ?? 20} Pro queries this month`;
    message = `Your quota resets on ${resetOn}.`;
    upgradeHint = (
      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
        Upgrade to{' '}
        <a href="/pricing" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline">Premium</a>
        {' '}for 50 queries/month.
      </p>
    );
  } else if (planTier === 'premium') {
    title = `You've used all ${queryLimit ?? 50} Premium queries this month`;
    message = `Your quota resets on ${resetOn}.`;
  } else if (planTier === 'trial') {
    title = `You've used all ${queryLimit ?? 15} trial queries this month`;
    message = `Your quota resets on ${resetOn}.`;
    upgradeHint = (
      <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
        Upgrade to{' '}
        <a href="/pricing" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">Pro</a>
        {' '}for 20 queries/mo or{' '}
        <a href="/pricing" className="font-semibold text-purple-600 dark:text-purple-400 hover:underline">Premium</a>
        {' '}for 50 queries/mo.
      </p>
    );
  }

  return (
    <div className="mx-4 mb-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{title}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{message}</p>
          {upgradeHint}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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
  const [isExpanded, setIsExpanded] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const setIsOpen = (value: boolean) => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(value);
    }
    onStateChange?.(value);
    if (!value) setIsExpanded(false);
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [remainingQueries, setRemainingQueries] = useState<number | undefined>(undefined);
  const [queryLimit, setQueryLimit] = useState<number | undefined>(undefined);
  const [resetDate, setResetDate] = useState<string | undefined>(undefined);
  const [planTier, setPlanTier] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMessageSentRef = useRef(false);

  const isQuotaExhausted = typeof remainingQueries === 'number' && remainingQueries <= 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch live entitlements every time the panel opens.
  // cache: 'no-store' bypasses browser cache so we always get the real DB count,
  // not a 5-minute-stale cached response.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/entitlements', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.ai_remaining === 'number') {
          setRemainingQueries(data.ai_remaining);
        }
        if (typeof data.ai_query_limit === 'number') {
          setQueryLimit(data.ai_query_limit);
        }
        if (typeof data.ai_reset_date === 'string') {
          setResetDate(data.ai_reset_date);
        }
        if (typeof data.plan_tier === 'string') {
          setPlanTier(data.plan_tier);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Listen for custom event to open copilot from header button
  useEffect(() => {
    const handleOpenCopilot = () => {
      if (externalIsOpen === undefined) {
        setIsOpen(true);
      } else {
        onStateChange?.(true);
      }
    };
    window.addEventListener('openCopilot', handleOpenCopilot);
    return () => window.removeEventListener('openCopilot', handleOpenCopilot);
  }, [externalIsOpen, onStateChange]);

  // Handle initial message
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current) {
      if (!isOpen) setIsOpen(true);
    }
  }, [initialMessage, isOpen]);

  useEffect(() => {
    if (isOpen && initialMessage && !initialMessageSentRef.current && !isLoading) {
      initialMessageSentRef.current = true;
      const timer = setTimeout(() => {
        handleSubmit(initialMessage);
        onInitialMessageSent?.();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      initialMessageSentRef.current = false;
    }
  }, [isOpen, initialMessage, isLoading]);

  const handleSubmit = async (questionOverride?: string) => {
    const question = questionOverride || input.trim();
    if (!question || isLoading || isQuotaExhausted) return;

    setInput('');
    const detectedIntent = detectIntent(question);
    setMessages((prev) => [...prev, { role: 'user', content: question, intent: detectedIntent }]);
    setIsLoading(true);

    try {
      // Build conversation history (last 6 messages = 3 exchanges) for multi-turn context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const requestPayload: CopilotQueryRequest & { history?: { role: string; content: string }[] } = {
        user_id: userId || 'anonymous',
        session_id: sessionId,
        source: source,
        intent: detectedIntent,
        question: question,
        history: history.length > 0 ? history : undefined,
      };

      const response = await fetch('/api/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const isTrialLimit = errorData?.error === 'Trial limit exceeded';
          const isPaidLimit = errorData?.error === 'Monthly limit reached';
          const tier: string | null = errorData?.plan_tier ?? null;
          const limit: number | null = errorData?.query_limit ?? null;
          const reset: string | null = errorData?.reset_date ?? null;
          const resetOn = formatResetDate(reset ?? undefined);

          // Update local state so banner shows immediately
          setRemainingQueries(0);
          if (reset) setResetDate(reset);
          if (tier) setPlanTier(tier);
          if (limit) setQueryLimit(limit);

          let limitMsg: string;
          if (isTrialLimit || tier === 'trial') {
            limitMsg = `You've used all ${limit ?? 15} trial queries for this month. Your quota resets on ${resetOn}. Upgrade to Pro (20/mo) or Premium (50/mo) for more access.`;
          } else if (tier === 'free') {
            limitMsg = `You've used all ${limit ?? 5} free queries for this month. Your quota resets on ${resetOn}. Upgrade to Pro (20/mo) or Premium (50/mo) to get more access to Naira.`;
          } else if (isPaidLimit && tier === 'premium') {
            limitMsg = `You've used all ${limit ?? 50} queries for this month on your Premium plan. Your quota resets on ${resetOn}.`;
          } else if (isPaidLimit && tier === 'pro') {
            limitMsg = `You've used all ${limit ?? 20} queries for this month on your Pro plan. Your quota resets on ${resetOn}. Upgrade to Premium for 50 queries/month.`;
          } else {
            limitMsg = `You've reached your monthly Naira query limit. Your quota resets on ${resetOn}.`;
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: limitMsg,
              status: 'attention_required',
              intent: detectedIntent,
            },
          ]);
          return;
        }

        if (response.status === 403) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Naira is not available for your account. Please sign in or contact support.',
              status: 'attention_required',
              intent: detectedIntent,
            },
          ]);
          return;
        }

        throw new Error(errorData?.error || 'API request failed');
      }

      const data: CopilotQueryResponse = await response.json();

      // Always decrement locally by 1 for immediate in-session accuracy.
      // This ensures "3 of 20 used" after 3 queries even if the DB write from
      // the previous query hasn't completed yet (timing/race condition).
      setRemainingQueries((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));

      // Use server values to update limit and reset date (these don't change per-query)
      if (typeof data.query_limit === 'number') {
        setQueryLimit(data.query_limit);
      }
      if (typeof data.reset_date === 'string') {
        setResetDate(data.reset_date);
      }

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
          intent: detectedIntent,
          remainingQueries: data.remaining_queries,
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
          intent: detectedIntent,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = (question: string) => {
    handleSubmit(question);
  };

  // ── Panel size classes ──────────────────────────────────────────────────────

  const panelClasses = isExpanded
    ? 'fixed top-[5vh] left-1/2 -translate-x-1/2 w-[min(800px,95vw)] h-[90vh] z-50'
    : `fixed ${position === 'top-right' ? 'top-24 right-6' : 'bottom-24 right-6'} w-[400px] max-h-[580px] z-50`;

  const messagesHeightClass = isExpanded ? 'flex-1' : 'min-h-[300px] max-h-[380px]';

  if (!isOpen) {
    if (externalIsOpen !== undefined) return null;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${position === 'top-right' ? 'top-20 right-6' : 'bottom-6 right-6'} z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 dark:bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-700 hover:shadow-xl hover:scale-105 transition-all relative`}
        aria-label="Open Naira — AI Portfolio Analyst"
      >
        <NeuralIcon className="w-5 h-5 text-[#FCD34D]" />
        <span className="font-semibold text-sm hidden sm:inline tracking-wide">
          Ask N<span className="text-[#FCD34D] font-bold">ai</span>ra
        </span>
        {issueCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
            {issueCount}
          </span>
        )}
      </button>
    );
  }

  // ── Counter display helpers ─────────────────────────────────────────────────
  const usedQueries =
    typeof remainingQueries === 'number' && typeof queryLimit === 'number'
      ? queryLimit - remainingQueries
      : undefined;
  const isNearLimit =
    typeof remainingQueries === 'number' && typeof queryLimit === 'number'
      ? remainingQueries <= Math.max(1, Math.floor(queryLimit * 0.2))
      : false;

  return (
    <>
      {/* Backdrop for expanded mode */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={`${panelClasses} bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-[#334155] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <NeuralIcon className="w-5 h-5 text-[#FCD34D]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white tracking-wide">
                N<span className="text-[#FCD34D]">ai</span>ra
              </p>
              <p className="text-xs text-emerald-100">
                {messages.length === 0
                  ? 'Your AI Portfolio Analyst'
                  : `${messages.filter((m) => m.role === 'assistant').length} response${messages.filter((m) => m.role === 'assistant').length !== 1 ? 's' : ''} this session`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
              title={isExpanded ? 'Compact view' : 'Expand for more space'}
              aria-label={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? (
                <MinimizeIcon className="w-4 h-4" />
              ) : (
                <MaximizeIcon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className={`${messagesHeightClass} overflow-y-auto p-4 space-y-4 bg-[#F9FAFB] dark:bg-[#0F172A]`}
        >
          {messages.length === 0 ? (
            <div className="space-y-4">
              {/* Welcome card */}
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <NeuralIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                      Hello! I&apos;m N<span className="text-emerald-600 dark:text-emerald-400 font-bold">ai</span>ra, your AI Portfolio Analyst.
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                      I can explain your portfolio&apos;s risk, performance, diversification, and
                      goal alignment using your actual investment data. Ask me anything about your
                      portfolio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Capability pills — clickable shortcuts */}
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_PILLS.map((cap) => (
                  <button
                    key={cap.label}
                    onClick={() => handleFollowUp(cap.question)}
                    disabled={isQuotaExhausted}
                    className="px-2.5 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cap.label}
                  </button>
                ))}
              </div>

              {/* Suggested questions */}
              <div>
                <p className="text-xs text-[#6B7280] dark:text-[#64748B] mb-2 font-medium uppercase tracking-wide">
                  Try asking:
                </p>
                <div className={`${isExpanded ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUp(q.text)}
                      disabled={isQuotaExhausted}
                      className="w-full text-left px-3 py-2.5 text-sm text-[#374151] dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="space-y-1.5">
                {/* Scope label — shown above each assistant message */}
                {msg.role === 'assistant' && msg.intent && (
                  <div className="flex justify-start pl-9">
                    <ScopeBadge intent={msg.intent} />
                  </div>
                )}

                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Assistant avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <NeuralIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`${isExpanded ? 'max-w-[80%]' : 'max-w-[88%]'} px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 dark:bg-emerald-700 text-white rounded-br-md'
                        : 'bg-white dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] rounded-bl-md shadow-sm'
                    }`}
                  >
                    <MarkdownContent content={msg.content} isUser={msg.role === 'user'} />
                  </div>
                </div>

                {/* Status badge */}
                {msg.role === 'assistant' && msg.status && (
                  <div className="flex justify-start pl-9">
                    <StatusBadge status={msg.status} />
                  </div>
                )}

                {/* Follow-up suggestions — only on last assistant message, and only when not quota exhausted */}
                {msg.role === 'assistant' &&
                  msg.followUps &&
                  msg.followUps.length > 0 &&
                  i === messages.length - 1 &&
                  !isQuotaExhausted && (
                    <div className="flex flex-wrap gap-2 pl-9 pt-1">
                      {msg.followUps.map((followUp, j) => (
                        <button
                          key={j}
                          onClick={() => handleFollowUp(followUp)}
                          className="px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <NeuralIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="bg-white dark:bg-[#1E293B] px-4 py-3 rounded-2xl rounded-bl-md border border-[#E5E7EB] dark:border-[#334155] shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-emerald-400 dark:bg-emerald-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quota exhausted banner — shown above input when limit is reached */}
        {isQuotaExhausted && (
          <QuotaBanner
            planTier={planTier}
            queryLimit={queryLimit}
            resetDate={resetDate}
          />
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-4 border-t border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isQuotaExhausted ? 'Monthly limit reached — quota resets soon' : 'Ask about your portfolio...'}
              disabled={isLoading || isQuotaExhausted}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] border border-[#E5E7EB] dark:border-[#334155] outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isQuotaExhausted}
              className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[#9CA3AF] dark:text-[#64748B]">
              For educational purposes only · Not financial advice
            </p>
            {planTier === 'premium' ? (
              <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                Unlimited
              </p>
            ) : typeof usedQueries === 'number' && typeof queryLimit === 'number' ? (
              <p
                className={`text-xs font-semibold ${
                  isQuotaExhausted
                    ? 'text-red-500 dark:text-red-400'
                    : isNearLimit
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-[#6B7280] dark:text-[#94A3B8]'
                }`}
              >
                {usedQueries} of {queryLimit} used
              </p>
            ) : null}
          </div>
        </form>
      </div>

      {/* Floating button shown when open (if not externally controlled) */}
      {externalIsOpen === undefined && (
        <button
          onClick={() => setIsOpen(false)}
          className={`fixed ${position === 'top-right' ? 'top-20 right-6' : 'bottom-6 right-6'} z-40 flex items-center justify-center w-10 h-10 rounded-full bg-[#374151] dark:bg-[#334155] text-white shadow-lg hover:bg-[#1F2937] dark:hover:bg-[#475569] transition-all`}
          aria-label="Close Naira"
        >
          <XIcon className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
