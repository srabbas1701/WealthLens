'use client';

import { AppHeader } from '@/components/AppHeader';

/**
 * About Us Page
 * 
 * Showcases the vision, philosophy, and promise of Lenson Wealth
 * in an elegant, easy-to-read format.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0F172A]">
      <AppHeader />

      {/* Hero Section */}
      <section className="pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4 sm:mb-6 leading-tight tracking-tight">
              About Lenson Wealth
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#2563EB] to-[#16A34A] dark:from-[#3B82F6] dark:to-[#22C55E] mx-auto rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16 sm:pb-20 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="space-y-12 sm:space-y-16 md:space-y-20">
            
            {/* The Vision of Clarity */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-8 sm:p-10 md:p-12 shadow-lg">
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4 sm:mb-6">
                    The Vision of Clarity
                  </h2>
                  <p className="text-lg sm:text-xl md:text-2xl text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    In a world of financial noise, clarity is the rarest luxury. At Lenson Wealth, we believe that true prosperity is not just about the accumulation of assets, but the precision of the vision behind them.
                  </p>
                </div>
                <div className="pt-4 sm:pt-6 border-t border-[#E5E7EB] dark:border-[#334155]">
                  <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                    The name <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">"Lenson"</span> was born from a simple but powerful philosophy: to keep the <span className="font-semibold text-[#2563EB] dark:text-[#3B82F6]">"Lens On"</span> what matters most. We provide the structured oversight and sharp focus required to navigate complex global markets, ensuring your legacy remains as resilient as it is elegant.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Aesthetic: Sophisticated Structure */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-8 sm:p-10 md:p-12 shadow-lg">
              <div className="space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Our Aesthetic: Sophisticated Structure
                </h2>
                <div className="space-y-4 sm:space-y-6 text-base sm:text-lg text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                  <p>
                    We approach wealth management much like a master weaver approaches Chanderi or Tissue Silk. We seek to create financial structures that are <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">strong, disciplined, and enduring</span>, yet <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">refined and "breathable."</span>
                  </p>
                  <p>
                    We do away with the <span className="italic text-[#6B7280] dark:text-[#94A3B8]">"bulk"</span> of traditional banking—the hidden fees, the convoluted jargon, and the rigid thinking—replacing it with a streamlined, bespoke experience tailored to the modern high-net-worth individual.
                  </p>
                </div>
              </div>
            </div>

            {/* The Lenson Promise */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-8 sm:p-10 md:p-12 shadow-lg">
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-4 sm:mb-6">
                    The Lenson Promise
                  </h2>
                  <p className="text-base sm:text-lg text-[#475569] dark:text-[#CBD5E1] leading-relaxed mb-6 sm:mb-8">
                    Founded on the principles of integrity and foresight, Lenson Wealth serves as your strategic partner in:
                  </p>
                </div>
                
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex gap-4 sm:gap-6">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                        Precision Planning
                      </h3>
                      <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                        Seeing the patterns others miss.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 sm:gap-6">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                        Sustainable Growth
                      </h3>
                      <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                        Building portfolios with long-term resilience.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 sm:gap-6">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                        Legacy Curation
                      </h3>
                      <p className="text-base sm:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                        Ensuring your wealth transitions seamlessly across generations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 sm:pt-8 border-t border-[#E5E7EB] dark:border-[#334155]">
                  <p className="text-lg sm:text-xl md:text-2xl text-[#0F172A] dark:text-[#F8FAFC] font-semibold leading-relaxed italic">
                    We don't just manage wealth; we provide the lens through which you can see your future clearly.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer Spacing */}
      <div className="pb-12 sm:pb-16 md:pb-20"></div>
    </div>
  );
}
