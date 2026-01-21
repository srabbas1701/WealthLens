/**
 * Portfolio Classification Aggregation
 * 
 * Uses the new asset classification system to aggregate holdings by:
 * - Top-level buckets (user-facing groups)
 * - Asset classes (detailed classification)
 * 
 * This replaces the old product-based aggregation with economic-behavior-based aggregation.
 */

import { 
  classifyAsset, 
  getTopLevelBucketLabel, 
  getAssetClassLabel,
  isIncludedInNetWorth,
  isIncludedInAllocation,
  type AssetClass,
  type TopLevelBucket,
} from './asset-classification';

export interface ClassifiedHolding {
  id: string;
  name: string;
  assetType: string;
  investedValue: number;
  currentValue: number;
  assetClass: AssetClass;
  topLevelBucket: TopLevelBucket;
  metadata?: any;
}

export interface BucketAggregation {
  bucket: TopLevelBucket;
  label: string;
  totalValue: number;
  totalInvested: number;
  holdings: ClassifiedHolding[];
  assetClasses: {
    assetClass: AssetClass;
    label: string;
    totalValue: number;
    holdings: ClassifiedHolding[];
  }[];
}

export interface PortfolioClassificationAggregation {
  buckets: BucketAggregation[];
  netWorth: number; // Excludes Insurance, includes Liabilities as negative
  totalAssets: number; // All assets except Insurance
  totalLiabilities: number;
  insuranceCoverage: number; // Separate tracking
  allocation: {
    assetClass: AssetClass;
    label: string;
    percentage: number;
    value: number;
  }[];
}

/**
 * Classify and aggregate holdings by the new classification system
 */
export function aggregateByClassification(
  holdings: Array<{
    id: string;
    name: string;
    assetType: string;
    investedValue: number;
    currentValue: number;
    metadata?: any;
  }>
): PortfolioClassificationAggregation {
  // Step 1: Classify all holdings
  const classifiedHoldings: ClassifiedHolding[] = holdings.map(h => {
    const classification = classifyAsset(h.assetType, {
      ulipNpsAllocation: h.metadata?.ulipNpsAllocation,
      isEquityMF: h.metadata?.isEquityMF,
      isDebtMF: h.metadata?.isDebtMF,
      isHybridMF: h.metadata?.isHybridMF,
      isGoldETF: h.metadata?.isGoldETF,
      isRealEstate: h.metadata?.isRealEstate,
    });

    return {
      ...h,
      assetClass: classification.assetClass,
      topLevelBucket: classification.topLevelBucket,
    };
  });

  // Step 2: Group by top-level bucket
  const bucketMap = new Map<TopLevelBucket, ClassifiedHolding[]>();
  classifiedHoldings.forEach(h => {
    if (!bucketMap.has(h.topLevelBucket)) {
      bucketMap.set(h.topLevelBucket, []);
    }
    bucketMap.get(h.topLevelBucket)!.push(h);
  });

  // Step 3: Build bucket aggregations
  const buckets: BucketAggregation[] = Array.from(bucketMap.entries())
    .map(([bucket, holdings]) => {
      // Group holdings within bucket by asset class
      const assetClassMap = new Map<AssetClass, ClassifiedHolding[]>();
      holdings.forEach(h => {
        if (!assetClassMap.has(h.assetClass)) {
          assetClassMap.set(h.assetClass, []);
        }
        assetClassMap.get(h.assetClass)!.push(h);
      });

      const assetClasses = Array.from(assetClassMap.entries()).map(
        ([assetClass, classHoldings]) => {
          const totalValue = classHoldings.reduce(
            (sum, h) => sum + h.currentValue,
            0
          );
          return {
            assetClass,
            label: getAssetClassLabel(assetClass),
            totalValue,
            holdings: classHoldings,
          };
        }
      );

      const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);

      return {
        bucket,
        label: getTopLevelBucketLabel(bucket),
        totalValue,
        totalInvested,
        holdings,
        assetClasses,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue); // Sort by value descending

  // Step 4: Calculate net worth (excludes Insurance, includes Liabilities as negative)
  const assetsForNetWorth = classifiedHoldings.filter(h =>
    isIncludedInNetWorth(h.assetClass)
  );
  const totalAssets = assetsForNetWorth
    .filter(h => h.assetClass !== 'Liability')
    .reduce((sum, h) => sum + h.currentValue, 0);
  const totalLiabilities = assetsForNetWorth
    .filter(h => h.assetClass === 'Liability')
    .reduce((sum, h) => sum + h.currentValue, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Step 5: Calculate insurance coverage (separate from net worth)
  const insuranceCoverage = classifiedHoldings
    .filter(h => h.assetClass === 'Insurance')
    .reduce((sum, h) => sum + h.currentValue, 0);

  // Step 6: Build allocation (excludes Insurance and Liabilities)
  const allocationHoldings = classifiedHoldings.filter(h =>
    isIncludedInAllocation(h.assetClass)
  );
  const allocationTotal = allocationHoldings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );

  const allocationMap = new Map<AssetClass, number>();
  allocationHoldings.forEach(h => {
    allocationMap.set(
      h.assetClass,
      (allocationMap.get(h.assetClass) || 0) + h.currentValue
    );
  });

  const allocation = Array.from(allocationMap.entries())
    .map(([assetClass, value]) => ({
      assetClass,
      label: getAssetClassLabel(assetClass),
      percentage: allocationTotal > 0 ? (value / allocationTotal) * 100 : 0,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Normalize allocation percentages to sum to 100%
  const totalPct = allocation.reduce((sum, a) => sum + a.percentage, 0);
  if (Math.abs(totalPct - 100) > 0.01 && allocationTotal > 0) {
    const adjustment = 100 - totalPct;
    if (allocation.length > 0) {
      allocation[0].percentage += adjustment;
    }
  }

  return {
    buckets,
    netWorth,
    totalAssets,
    totalLiabilities,
    insuranceCoverage,
    allocation,
  };
}

/**
 * Get holdings for a specific top-level bucket
 */
export function getBucketHoldings(
  aggregation: PortfolioClassificationAggregation,
  bucket: TopLevelBucket
): ClassifiedHolding[] {
  const bucketData = aggregation.buckets.find(b => b.bucket === bucket);
  return bucketData?.holdings || [];
}

/**
 * Get holdings for a specific asset class
 */
export function getAssetClassHoldings(
  aggregation: PortfolioClassificationAggregation,
  assetClass: AssetClass
): ClassifiedHolding[] {
  const allHoldings: ClassifiedHolding[] = [];
  aggregation.buckets.forEach(bucket => {
    bucket.assetClasses.forEach(ac => {
      if (ac.assetClass === assetClass) {
        allHoldings.push(...ac.holdings);
      }
    });
  });
  return allHoldings;
}

/**
 * Get Income & Allocation breakdown (Fixed Income + Hybrid)
 */
export function getIncomeAllocationBreakdown(
  aggregation: PortfolioClassificationAggregation
): {
  fixedIncome: { value: number; percentage: number };
  hybrid: { value: number; percentage: number };
  total: number;
} {
  const incomeBucket = aggregation.buckets.find(
    b => b.bucket === 'IncomeAllocation'
  );
  
  if (!incomeBucket) {
    return {
      fixedIncome: { value: 0, percentage: 0 },
      hybrid: { value: 0, percentage: 0 },
      total: 0,
    };
  }

  const fixedIncome = incomeBucket.assetClasses.find(
    ac => ac.assetClass === 'FixedIncome'
  );
  const hybrid = incomeBucket.assetClasses.find(ac => ac.assetClass === 'Hybrid');

  const total = incomeBucket.totalValue;
  const totalForNetWorth = aggregation.totalAssets;

  return {
    fixedIncome: {
      value: fixedIncome?.totalValue || 0,
      percentage:
        totalForNetWorth > 0
          ? ((fixedIncome?.totalValue || 0) / totalForNetWorth) * 100
          : 0,
    },
    hybrid: {
      value: hybrid?.totalValue || 0,
      percentage:
        totalForNetWorth > 0
          ? ((hybrid?.totalValue || 0) / totalForNetWorth) * 100
          : 0,
    },
    total,
  };
}
