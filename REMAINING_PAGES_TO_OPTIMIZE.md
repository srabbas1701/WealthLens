# Remaining Pages to Optimize

## Pattern to Apply:

For each page:
1. Add import: `import { getCachedPortfolioData, setCachedPortfolioData, isCacheStale } from '@/lib/portfolio-cache';`
2. Update fetchData signature: `async (userId: string, silentRefresh = false)`
3. Add cache storage in fetchData: `setCachedPortfolioData(userId, portfolioData);` after fetching
4. Update useEffect to check cache first (full cache processing logic)

## Pages to Optimize:

- [ ] /portfolio/ppf
- [ ] /portfolio/nps
- [ ] /portfolio/epf
- [ ] /portfolio/gold
- [ ] /portfolio/cash
- [ ] /portfolio/bonds
- [ ] /portfolio/equity

## Priority:
All have the same priority - apply same pattern to eliminate blank screens.
