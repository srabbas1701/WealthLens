'use client';

import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

const API_URL = '/api/feature-request';

export function FeatureRequestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    feature: '',
  });

  const handleOpen = () => {
    setIsOpen(true);
    setSubmitted(false);
    setError(null);
    setFormData({ name: '', email: '', phone: '', feature: '' });
  };

  const handleClose = () => {
    if (!loading) {
      setIsOpen(false);
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
          phone: formData.phone.trim() || undefined,
          feature: formData.feature.trim(),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'bg-gray-50 dark:bg-[#1e2733] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#7a8a9a] focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/10 outline-none transition-colors w-full';

  const labelStyles =
    'text-xs uppercase tracking-wider text-gray-500 dark:text-[#a8b8c8] font-medium block mb-2';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-block px-8 py-4 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] rounded-lg text-lg font-semibold hover:bg-white/90 dark:hover:bg-[#1E293B]/90 shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
      >
        <Send className="w-5 h-5" />
        Submit Feature Request
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-request-title"
        >
          <div
            className="relative w-full max-w-[560px] rounded-2xl bg-white dark:bg-[#161c26] border border-gray-200 dark:border-white/10 border-t-0 p-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Teal top border line */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #3ecf8e, transparent)',
              }}
            />
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2
              id="feature-request-title"
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            >
              Have a Feature Request?
            </h2>
            <p className="text-gray-500 dark:text-[#7a8a9a] text-sm mb-6">
              Share your ideas and help us prioritize what matters most to Indian
              investors.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <p className="text-lg text-[#3ecf8e] font-medium">
                  Request Received!
                </p>
                <p className="text-gray-500 dark:text-[#7a8a9a] mt-2">
                  Thanks for sharing your idea. Our team will review it and reach
                  out if we need more details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className={labelStyles}>
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Rahul Sharma"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputStyles}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelStyles}>
                      Email Address
                    </label>
                    <input
                      id="email"
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

                <div>
                  <label htmlFor="phone" className={labelStyles}>
                    Phone Number{' '}
                    <span className="text-gray-400 dark:text-[#7a8a9a] font-normal normal-case">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputStyles}
                  />
                </div>

                <div>
                  <label htmlFor="feature" className={labelStyles}>
                    Feature Details
                  </label>
                  <textarea
                    id="feature"
                    name="feature"
                    required
                    placeholder="Describe the feature you'd like to see. What problem does it solve for you as an Indian investor? The more detail, the better!"
                    value={formData.feature}
                    onChange={handleChange}
                    rows={5}
                    className={`${inputStyles} resize-none`}
                  />
                  <p className="text-xs text-gray-400 dark:text-[#7a8a9a] mt-1.5">
                    Be as specific as possible — mention asset classes, use
                    cases, or platforms involved.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#3ecf8e] to-[#2db87a] text-[#0d1117] font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:shadow-[0_8px_24px_rgba(62,207,142,0.35)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <Send className="w-5 h-5" />
                  {loading ? 'Sending...' : 'Submit Feature Request'}
                </button>

                <p className="text-xs text-gray-400 dark:text-[#7a8a9a] flex items-center gap-2">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Your details are sent directly to our team at
                  featurerequest@lensonwealth.com
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
