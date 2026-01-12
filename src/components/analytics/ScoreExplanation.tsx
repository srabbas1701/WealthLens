/**
 * Score Explanation Component
 * 
 * Displays explanation of why a score is what it is,
 * based on API data. Educational, neutral language.
 */

'use client';

import { CheckCircleIcon, InfoIcon } from '@/components/icons';

interface ScoreExplanationProps {
  summary: string;
  positiveFactors?: string[];
  areasForAttention?: string[];
  contributingFactors?: string[];
  considerations?: string[];
}

export function ScoreExplanation({
  summary,
  positiveFactors = [],
  areasForAttention = [],
  contributingFactors = [],
  considerations = [],
}: ScoreExplanationProps) {
  const hasPositive = positiveFactors.length > 0 || contributingFactors.length > 0;
  const hasAttention = areasForAttention.length > 0 || considerations.length > 0;
  
  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Why this score?
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            {summary}
          </p>
        </div>
      </div>
      
      {/* Positive Factors / Contributing Factors */}
      {(hasPositive) && (
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Contributing Factors
          </h5>
          <ul className="space-y-1.5">
            {(positiveFactors.length > 0 ? positiveFactors : contributingFactors).map((factor, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-blue-800 dark:text-blue-200">
                  {factor}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Areas for Attention / Considerations */}
      {(hasAttention) && (
        <div>
          <h5 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Areas for Review
          </h5>
          <ul className="space-y-1.5">
            {(areasForAttention.length > 0 ? areasForAttention : considerations).map((area, index) => (
              <li key={index} className="flex items-start gap-2">
                <InfoIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-blue-800 dark:text-blue-200">
                  {area}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}