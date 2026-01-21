/**
 * Real Estate Highlights Section
 * 
 * Feature highlight section for Real Estate tracking capabilities.
 * Layout-only component with placeholders.
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function RealEstateHighlights() {
  const features = [
    {
      icon: '📊',
      title: 'Instant Value Snapshot',
      description: 'See your property value at a glance with ownership-adjusted estimates',
    },
    {
      icon: '💰',
      title: 'Rent & Cash Flow Insights',
      description: 'Track rental income, expenses, and net cash flow with clear analytics',
    },
    {
      icon: '🔮',
      title: 'Sell vs Hold Simulator',
      description: 'Compare selling today vs holding for future years with scenario analysis',
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#F6F8FB] dark:bg-[#0F172A]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
            Track & Analyze Your Real Estate Assets
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
            Value, cash flow, and smart insights — all part of your full wealth view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="group bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <CardContent className="p-6 sm:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mb-4 sm:mb-6 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A8A] group-hover:bg-[#EFF6FF]/50 dark:group-hover:bg-[#1E3A8A]/50 flex items-center justify-center text-2xl sm:text-3xl transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
