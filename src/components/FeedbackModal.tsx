'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

const API_URL = '/api/feedback';

const CATEGORIES = [
  { id: 'bug', label: 'Bug / Error', emoji: '🐛', accent: 'red' },
  { id: 'payment', label: 'Payment', emoji: '💳', accent: 'amber' },
  { id: 'performance', label: 'Performance', emoji: '⚡', accent: 'blue' },
  { id: 'suggestion', label: 'Suggestion', emoji: '💡', accent: 'teal' },
  { id: 'data', label: 'Data Issue', emoji: '📊', accent: 'purple' },
  { id: 'other', label: 'Other', emoji: '💬', accent: 'neutral' },
] as const;

const SEVERITIES = [
  { id: 'low', label: 'Low', emoji: '😐', activeClass: '!border-[#3ecf8e] !text-[#3ecf8e] dark:!text-[#3ecf8e] bg-[#3ecf8e]/10 dark:bg-[#3ecf8e]/10' },
  { id: 'medium', label: 'Medium', emoji: '😟', activeClass: '!border-[#fbbf24] !text-[#fbbf24] dark:!text-[#fbbf24] bg-[#fbbf24]/10 dark:bg-[#fbbf24]/10' },
  { id: 'high', label: 'High', emoji: '😡', activeClass: '!border-[#fb923c] !text-[#fb923c] dark:!text-[#fb923c] bg-[#fb923c]/10 dark:bg-[#fb923c]/10' },
  { id: 'critical', label: 'Critical', emoji: '🚨', activeClass: '!border-[#f87171] !text-[#f87171] dark:!text-[#f87171] bg-[#f87171]/10 dark:bg-[#f87171]/10' },
] as const;

const CATEGORY_ACCENT_CLASSES: Record<string, string> = {
  red: '!border-[#f87171] bg-[#f87171]/10 dark:bg-[#f87171]/10',
  amber: '!border-[#fbbf24] bg-[#fbbf24]/10 dark:bg-[#fbbf24]/10',
  blue: '!border-[#4f8ef7] bg-[#4f8ef7]/10 dark:bg-[#4f8ef7]/10',
  teal: '!border-[#3ecf8e] bg-[#3ecf8e]/10 dark:bg-[#3ecf8e]/10',
  purple: '!border-[#a78bfa] bg-[#a78bfa]/10 dark:bg-[#a78bfa]/10',
  neutral: '!border-gray-400 dark:!border-gray-500 bg-gray-100/50 dark:bg-gray-500/10',
};

type CategoryId = (typeof CATEGORIES)[number]['id'];
type SeverityId = (typeof SEVERITIES)[number]['id'];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('bug');
  const [severity, setSeverity] = useState<SeverityId>('medium');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    description: '',
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const handleClose = () => {
    if (!loading) {
      onClose();
      setSubmitted(false);
      setError(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, loading]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB
    setScreenshot(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          category,
          severity,
          subject: formData.subject.trim(),
          description: formData.description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      if (data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.error || 'Failed to submit');
      }
    } catch {
      setError(
        'Something went wrong. Please try again or email us at help@lensonwealth.com'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'bg-gray-50 dark:bg-[#1e2733] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#7a8a9a]/60 focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/10 outline-none transition-colors w-full';

  const labelStyles =
    'text-[11px] font-semibold text-gray-500 dark:text-[#a8b8c8] tracking-[0.07em] uppercase flex items-center gap-1.5';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        className="relative w-full max-w-[580px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-white dark:bg-[#161c26] border border-gray-200 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 2px gradient top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, #3ecf8e 30%, #4f8ef7 70%, transparent)',
          }}
        />

        {/* Header */}
        <div className="px-8 pt-7 pb-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2
              id="feedback-modal-title"
              className="text-[22px] font-extrabold text-gray-900 dark:text-white leading-tight"
            >
              Share Your Feedback
            </h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-[30px] h-[30px] shrink-0 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-[#7a8a9a] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <span className="text-base leading-none">✕</span>
            </button>
          </div>
          <p className="text-[13px] text-gray-500 dark:text-[#7a8a9a] leading-relaxed">
            Bug, payment issue, suggestion or anything else — we're listening.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-12 px-8">
            <p className="text-lg text-[#3ecf8e] font-semibold">
              Feedback Received!
            </p>
            <p className="text-gray-500 dark:text-[#7a8a9a] mt-2 text-sm">
              Thanks for your feedback. Our team typically responds within 1–2
              business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-[18px] px-8 py-6">
            {/* Category selector */}
            <div className="flex flex-col gap-1.5">
              <label className={labelStyles}>What&apos;s this about?</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[10px] border-[1.5px] transition-all text-center ${
                      category === cat.id
                        ? CATEGORY_ACCENT_CLASSES[cat.accent]
                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1e2733] hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="text-[18px] leading-none">{cat.emoji}</span>
                    <span className={`text-[11px] font-medium ${category === cat.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#a8b8c8]'}`}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity selector */}
            <div className="flex flex-col gap-1.5">
              <label className={labelStyles}>How severe is this?</label>
              <div className="flex gap-2">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSeverity(sev.id)}
                    className={`flex-1 py-2 px-2.5 rounded-lg border-[1.5px] text-[12px] font-medium transition-all ${
                      severity === sev.id
                        ? sev.activeClass
                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1e2733] text-gray-500 dark:text-[#7a8a9a] hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    {sev.emoji} {sev.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 -mx-8" />

            {/* Your Details */}
            <p className="text-[11px] font-semibold text-gray-500 dark:text-[#7a8a9a] tracking-[0.08em] uppercase -mt-1">Your Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="feedback-name" className={labelStyles}>Full Name</label>
                <input
                  id="feedback-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="feedback-email" className={labelStyles}>Email</label>
                <input
                  id="feedback-email"
                  name="email"
                  type="email"
                  required
                  placeholder="rahul@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputStyles}
                />
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 -mx-8" />

            {/* Feedback Details */}
            <p className="text-[11px] font-semibold text-gray-500 dark:text-[#7a8a9a] tracking-[0.08em] uppercase -mt-1">Feedback Details</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="feedback-subject" className={labelStyles}>
                Subject <span className="text-[10px] text-gray-400 dark:text-[#7a8a9a] font-normal normal-case tracking-normal">(short summary)</span>
              </label>
              <input
                id="feedback-subject"
                name="subject"
                type="text"
                required
                placeholder="e.g. NAV not updating for HDFC Flexi Cap Fund"
                value={formData.subject}
                onChange={handleChange}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="feedback-description" className={labelStyles}>Description</label>
              <textarea
                id="feedback-description"
                name="description"
                required
                placeholder="Describe the issue or feedback in detail. For bugs, include what you did, what happened, and what you expected..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`${inputStyles} resize-none min-h-[100px]`}
              />
            </div>

            {/* Screenshot upload */}
            <div className="flex flex-col gap-1.5">
              <label className={labelStyles}>
                Screenshot <span className="text-[10px] text-gray-400 dark:text-[#7a8a9a] font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <label className="flex items-center gap-3 p-4 border-[1.5px] border-dashed border-gray-200 dark:border-white/10 rounded-xl cursor-pointer bg-gray-50 dark:bg-[#1e2733] hover:border-[#3ecf8e]/30 dark:hover:border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/[0.03] transition-colors">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-200/50 dark:bg-white/5 flex items-center justify-center text-base">
                  📎
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                    {screenshot ? screenshot.name : 'Attach a screenshot'}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-[#7a8a9a]">
                    PNG, JPG up to 5MB — helps us debug faster
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#3ecf8e] to-[#2db87a] text-[#0d1117] font-bold rounded-xl flex items-center justify-center gap-2 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(62,207,142,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
              <p className="text-[11px] text-gray-500 dark:text-[#7a8a9a] flex items-center justify-center gap-1.5">
                <svg className="w-3 h-3 shrink-0 text-[#3ecf8e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" strokeWidth={2} />
                  <path strokeWidth={2} strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Sent directly to help@lensonwealth.com
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
