/**
 * Sell vs Hold Simulation Component
 * 
 * Decision support tool for comparing sell today vs hold scenarios.
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RealEstatePropertyDetailData } from '@/types/realEstatePropertyDetail.types';
import type { SellHoldSimulationInputs } from '@/types/realEstateSellHold.types';
import { simulateSellVsHold } from '@/analytics/realEstateSellHold.engine';

interface SellHoldSimulationProps {
  propertyData: RealEstatePropertyDetailData;
}

export default function SellHoldSimulation({
  propertyData,
}: SellHoldSimulationProps) {
  const [inputs, setInputs] = useState<SellHoldSimulationInputs>({
    holdingPeriodYears: 5,
    expectedPriceAppreciationPercent: 5,
    expectedRentGrowthPercent: 5,
    exitCostsPercent: 2,
    capitalGainsTaxRate: 20,
  });

  const result = useMemo(() => {
    return simulateSellVsHold(propertyData, inputs);
  }, [propertyData, inputs]);

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '—';
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return '—';
    return `${value.toFixed(2)}%`;
  };

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sell vs Hold Simulation</CardTitle>
          <CardDescription>
            Compare selling today vs holding for future years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cannot simulate: Property value data is missing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sell vs Hold Simulation</CardTitle>
        <CardDescription>
          Compare selling today vs holding for future years
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disclaimer */}
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Disclaimer:</strong> This simulation is based on assumptions and is not a
            prediction or financial advice. Actual results may vary significantly.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Simulation Assumptions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="holdingPeriod">Holding Period (years)</Label>
              <Input
                id="holdingPeriod"
                type="number"
                min="1"
                max="10"
                value={inputs.holdingPeriodYears}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    holdingPeriodYears: Math.max(1, Math.min(10, parseInt(e.target.value) || 5)),
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="priceAppreciation">Expected Annual Price Appreciation (%)</Label>
              <Input
                id="priceAppreciation"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inputs.expectedPriceAppreciationPercent}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    expectedPriceAppreciationPercent: parseFloat(e.target.value) || 5,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="rentGrowth">Expected Annual Rent Growth (%)</Label>
              <Input
                id="rentGrowth"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inputs.expectedRentGrowthPercent}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    expectedRentGrowthPercent: parseFloat(e.target.value) || 5,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="exitCosts">Exit Costs (% of property value)</Label>
              <Input
                id="exitCosts"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={inputs.exitCostsPercent}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    exitCostsPercent: parseFloat(e.target.value) || 2,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="taxRate">Capital Gains Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inputs.capitalGainsTaxRate}
                onChange={(e) =>
                  setInputs({
                    ...inputs,
                    capitalGainsTaxRate: parseFloat(e.target.value) || 20,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          {/* Sell Today */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sell Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Value</span>
                  <span className="font-medium">{formatCurrency(result.sellToday.currentValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding Loan</span>
                  <span className="font-medium">-{formatCurrency(result.sellToday.outstandingLoan)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exit Costs</span>
                  <span className="font-medium">-{formatCurrency(result.sellToday.exitCosts)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capital Gains Tax</span>
                  <span className="font-medium">-{formatCurrency(result.sellToday.capitalGainsTax)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Net Proceeds</span>
                    <span className="text-lg font-semibold number-emphasis">
                      {formatCurrency(result.sellToday.netProceeds)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hold Scenario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Hold for {result.holdScenario.years} Years
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Projected Exit Value</span>
                  <span className="font-medium">
                    {formatCurrency(result.holdScenario.projectedExitValue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cumulative Rental Income</span>
                  <span className="font-medium">
                    +{formatCurrency(result.holdScenario.cumulativeRentalIncome)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Rental Surplus</span>
                  <span className="font-medium">
                    {formatCurrency(result.holdScenario.netRentalSurplus)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exit Costs</span>
                  <span className="font-medium">
                    -{formatCurrency(result.holdScenario.exitCosts)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capital Gains Tax</span>
                  <span className="font-medium">
                    -{formatCurrency(result.holdScenario.capitalGainsTax)}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Net Proceeds</span>
                    <span className="text-lg font-semibold number-emphasis">
                      {formatCurrency(result.holdScenario.netProceeds)}
                    </span>
                  </div>
                </div>
                {result.holdScenario.irr !== null && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Projected IRR</span>
                      <span className="font-medium">{formatPercent(result.holdScenario.irr)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Difference</span>
                <span
                  className={`text-lg font-semibold number-emphasis ${
                    result.comparison.absoluteDifference >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {result.comparison.absoluteDifference >= 0 ? '+' : ''}
                  {formatCurrency(result.comparison.absoluteDifference)}
                </span>
              </div>
              {result.comparison.percentageDifference !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Percentage Difference</span>
                  <span className="font-medium">
                    {result.comparison.percentageDifference >= 0 ? '+' : ''}
                    {formatPercent(result.comparison.percentageDifference)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {result.comparison.betterOption === 'hold' && (
                    <>
                      Holding may result in{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(Math.abs(result.comparison.absoluteDifference))} more
                      </span>{' '}
                      over {result.holdScenario.years} years.
                    </>
                  )}
                  {result.comparison.betterOption === 'sell' && (
                    <>
                      Selling today may result in{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(Math.abs(result.comparison.absoluteDifference))} more
                      </span>{' '}
                      than holding for {result.holdScenario.years} years.
                    </>
                  )}
                  {result.comparison.betterOption === 'neutral' && (
                    <>
                      The difference between selling today and holding is minimal. Both options
                      may result in similar outcomes.
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
