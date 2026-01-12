/**
 * Demo Dashboard Page
 * 
 * Pre-login sandbox mode for exploring the product.
 * Uses realistic but fictional portfolio data.
 * 
 * DESIGN PRINCIPLES:
 * - Read-only access only
 * - Real dashboard UI with sample data
 * - Clear demo indicators
 * - Easy exit to sign up
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  TrendingUpIcon,
  InfoIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from '@/components/icons';
import DemoBanner from '@/components/DemoBanner';
import LockedAction from '@/components/LockedAction';
import { DEMO_PORTFOLIO, DEMO_DAILY_SUMMARY, DEMO_WEEKLY_SUMMARY } from '@/data/demo-portfolio';
import { AppHeader, useCurrency } from '@/components/AppHeader';
import type { DailySummaryResponse, WeeklySummaryResponse } from '@/types/copilot';

export default function DemoDashboardPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [expandedInsightId, setExpandedInsightId] = useState<number | null>(null);

  const portfolio = DEMO_PORTFOLIO;
  const aiSummary = DEMO_DAILY_SUMMARY as DailySummaryResponse;
  const weeklySummary = DEMO_WEEKLY_SUMMARY as WeeklySummaryResponse;

  // Validate data consistency
  const isDataConsistent = portfolio.hasData && portfolio.allocation.length > 0;

  const handleExitDemo = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <DemoBanner onExit={handleExitDemo} />
      <AppHeader />

      <main className="max-w-[1280px] mx-auto px-6 py-8 pt-32">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-1">Demo Portfolio</p>
          </div>
          <div className="text-sm text-[#6B7280]">
            Last 12 months
          </div>
        </div>

        {/* Net Worth Hero */}
        <section className="mb-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-10">
            <p className="text-sm text-[#6B7280] font-medium mb-4">Total Portfolio Value</p>
            {!isDataConsistent ? (
              <div className="py-8">
                <p className="text-lg text-[#6B7280] text-center">Data being consolidated</p>
              </div>
            ) : (
              <>
                <h2 className="text-6xl font-semibold text-[#0A2540] number-emphasis mb-4">
                  {formatCurrency(portfolio.metrics.netWorth)}
                </h2>
                <div className="flex items-center gap-2.5">
                  <TrendingUpIcon className="w-5 h-5 text-[#16A34A]" />
                  <span className="text-lg text-[#16A34A] font-semibold number-emphasis">
                    +₹{(portfolio.metrics.netWorth * portfolio.metrics.netWorthChange / 100).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </span>
                  <span className="text-lg text-[#16A34A] font-semibold">
                    (+{portfolio.metrics.netWorthChange}%)
                  </span>
                  <span className="text-sm text-[#6B7280] ml-1">Last 12 months</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Asset Overview Tiles */}
        {isDataConsistent && (
        <section className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Show top 4 by value, ensuring PPF is included if it exists */}
          {(() => {
            const top4 = portfolio.allocation.slice(0, 4);
            const ppfAsset = portfolio.allocation.find(a => a.name === 'PPF' || a.name === 'Public Provident Fund');
            const hasPPFInTop4 = top4.some(a => a.name === 'PPF' || a.name === 'Public Provident Fund');
            
            // If PPF exists but not in top 4, replace the 4th item with PPF
            let tilesToShow = top4;
            if (ppfAsset && !hasPPFInTop4 && top4.length >= 4) {
              tilesToShow = [...top4.slice(0, 3), ppfAsset];
            }
            
            return tilesToShow.map((asset) => {
            const getHref = (name: string) => {
              if (name === 'Equity' || name === 'Stocks') return '/demo/portfolio/equity';
              if (name === 'Mutual Funds') return '/demo/portfolio/mutualfunds';
              if (name === 'Fixed Deposit' || name === 'Fixed Deposits') return '/demo/portfolio/fixeddeposits';
              if (name === 'PPF' || name === 'Public Provident Fund') return '/demo/portfolio/ppf';
              if (name === 'NPS' || name === 'National Pension System') return '/demo/portfolio/nps';
              if (name === 'Gold') return '/demo/portfolio/gold';
              return '/demo';
            };
              
              return (
                <Link
                  key={asset.name}
                  href={getHref(asset.name)}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:border-[#2563EB] hover:shadow-sm transition-all block"
                >
                  <p className="text-sm font-medium text-[#6B7280] mb-6">{asset.name}</p>
                  <p className="text-3xl font-semibold text-[#0F172A] number-emphasis mb-2">
                    {formatCurrency(asset.value)}
                  </p>
                  <p className="text-base font-medium text-[#6B7280]">
                    {asset.percentage.toFixed(0)}%
                  </p>
                </Link>
              );
            });
          })()}
        </section>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <section className="mb-8 bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-3 mb-4">
              <SparklesIcon className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-lg font-semibold text-[#0F172A]">Portfolio Summary</h2>
            </div>
            <div className="space-y-3">
              {aiSummary.summary.map((point, i) => (
                <p key={i} className="text-sm text-[#475569] leading-relaxed">
                  {point}
                </p>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <InfoIcon className="w-4 h-4" />
                <span>Insights are generated based on portfolio data. More complete data leads to more accurate insights.</span>
              </div>
            </div>
          </section>
        )}

        {/* Portfolio Allocation */}
        {portfolio.allocation.length > 0 && (
          <section className="mb-8 bg-white rounded-xl border border-[#E5E7EB] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-6">Portfolio Allocation</h2>
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {portfolio.allocation.map((item, i) => {
                      const angle = (item.percentage / 100) * 360;
                      
                      // Handle single asset (100% or very close to 100%)
                      if (angle >= 359.9 || portfolio.allocation.length === 1) {
                        // Draw a full circle for single asset
                        return (
                          <circle
                            key={i}
                            cx={50}
                            cy={50}
                            r={40}
                            fill={item.color}
                          />
                        );
                      }
                      
                      const startAngle = portfolio.allocation.slice(0, i).reduce((sum, a) => sum + (a.percentage / 100) * 360, 0);
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = ((startAngle + angle) * Math.PI) / 180;
                      const largeArc = angle > 180 ? 1 : 0;
                      const x1 = 50 + 40 * Math.cos(startRad);
                      const y1 = 50 + 40 * Math.sin(startRad);
                      const x2 = 50 + 40 * Math.cos(endRad);
                      const y2 = 50 + 40 * Math.sin(endRad);
                      return (
                        <path
                          key={i}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={item.color}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="space-y-5">
                  {portfolio.allocation.map((item) => (
                    <div key={item.name} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-base font-medium text-[#0F172A]">{item.name}</span>
                      </div>
                      <span className="text-lg font-semibold text-[#0F172A] number-emphasis">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Insights & Alerts */}
        <section className="mb-16 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#0F172A]">Insights & Alerts</h2>
          </div>
          
          <div className="divide-y divide-[#E5E7EB]">
            {portfolio.insights.map((insight) => {
              const isExpanded = expandedInsightId === insight.id;
              return (
                <div key={insight.id}>
                  <button
                    onClick={() => setExpandedInsightId(isExpanded ? null : insight.id)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-[#F6F8FB] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {insight.type === 'opportunity' ? (
                        <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
                      ) : (
                        <InfoIcon className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{insight.title}</p>
                        <p className="text-xs text-[#6B7280] mt-1">{insight.description}</p>
                      </div>
                    </div>
                    <ChevronDownIcon 
                      className={`w-5 h-5 text-[#6B7280] flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-0' : 'rotate-[-90deg]'
                      }`} 
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-6 py-4 bg-[#F6F8FB] border-t border-[#E5E7EB]">
                      <div className="text-sm text-[#475569] leading-relaxed">
                        <p>{insight.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Locked Actions Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Available After Sign-Up</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <LockedAction
              action="Upload Portfolio"
              description="Import your holdings from CSV or Excel files"
            />
            <LockedAction
              action="Add Investments Manually"
              description="Enter individual holdings one by one"
            />
            <LockedAction
              action="Account Settings"
              description="Manage your profile, security, and preferences"
            />
            <LockedAction
              action="Advanced Analytics"
              description="Deep dive into sector, market cap, and geography breakdowns"
            />
          </div>
        </section>

        {/* CTA to Sign Up */}
        <section className="mb-16 bg-white rounded-xl border border-[#2563EB] p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#0F172A] mb-3">
            Ready to track your real portfolio?
          </h2>
          <p className="text-base text-[#6B7280] mb-6 max-w-2xl mx-auto">
            Sign up to upload your portfolio, get personalized insights, and track your investments with clarity and control.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1E40AF] transition-colors"
            >
              Sign Up Free
              <ArrowRightIcon className="w-4 h-4" />
            </a>
            <button
              onClick={handleExitDemo}
              className="px-6 py-3 text-[#6B7280] font-medium rounded-lg hover:bg-[#F6F8FB] transition-colors"
            >
              Exit Demo
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

