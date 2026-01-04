/**
 * Database Operations Exports
 * 
 * Centralized exports for all database operations
 */

export {
  // Core Copilot context
  getCopilotContext,
  logCopilotSession,
  getRecentSessions,
  getPortfolioSummary,
  
  // AI Daily Summary operations
  // WHY THESE ARE READ-ONLY: Summaries are pre-computed by backend jobs.
  // Copilot READS but never WRITES summaries - this prevents refresh anxiety.
  getDailySummary,
  getLatestDailySummary,
  
  // AI Weekly Summary operations
  // Weekly summaries provide "zoom out" perspective for goal tracking.
  // Same read-only philosophy as daily summaries.
  getWeeklySummary,
  getLatestWeeklySummary,
  getRecentWeeklySummaries,
} from './copilot-context';

