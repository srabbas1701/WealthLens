/**
 * Real Estate Highlights Section
 * 
 * Feature highlight section for Real Estate tracking capabilities.
 * Layout-only component with placeholders.
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { HomeIcon, MapPinIcon, ShuffleIcon } from '@/components/icons';

const features = [
  {
    icon: <HomeIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
    title: 'Property Snapshot',
    description: 'Track property values alongside your financial assets.',
  },
  {
    icon: <MapPinIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
    title: 'Rental Tracking',
    description: 'Monitor rental income and property-level returns.',
  },
  {
    icon: <ShuffleIcon className="w-7 h-7 text-[#2563EB] dark:text-[#3B82F6]" />,
    title: 'Portfolio Impact',
    description: 'Understand how real estate affects your overall asset allocation.',
  },
];

export default function RealEstateHighlights() {
  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-slate-100 dark:bg-slate-950">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-3 sm:mb-4">
            Track Property Alongside Your Investments
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#6B7280] dark:text-[#94A3B8] max-w-3xl mx-auto px-4 sm:px-0">
            Real estate is often the largest part of personal wealth, yet most portfolio tools ignore it.
            LensOnWealth brings property into the same portfolio view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="group bg-white dark:bg-[#1E293B] rounded-xl sm:rounded-2xl border-2 border-[#E5E7EB] dark:border-[#334155] hover:border-[#16A34A] dark:hover:border-[#22C55E] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <CardContent className="p-5 sm:p-6">
                <div className="w-9 h-9 sm:w-10 sm:h-10 mb-3 flex items-center justify-center">
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
