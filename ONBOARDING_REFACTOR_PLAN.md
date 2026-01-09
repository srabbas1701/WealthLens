# Onboarding Flow Refactor - Implementation Plan

## Overview
Refactoring the onboarding flow to be more granular, user-controlled, and production-grade.

## New Flow Structure

### Screen 0: Welcome (Unchanged)
- Welcome message
- Reassurance points
- Start/Skip buttons

### Screen 1: Category Selection (Unchanged)
- Multi-select investment categories
- Grouped by type (Growth, Safe, Real Assets, etc.)

### Screen 2: Investment Setup Queue (NEW - REQUIRED)
- Shows all selected categories as cards
- Status: "Not added" | "Added" | "Skipped"
- User must explicitly click "Add" button per asset
- NO auto-navigation

### Screen 3: Add Method (Asset-Specific)
- Shows for ONE asset at a time (user clicked "Add" from queue)
- For Stocks & ETFs: Allow multiple broker statements
- Microcopy: "You can upload statements from more than one broker. We'll automatically separate stocks and ETFs."
- Options: Upload / Manual / Skip

### Screen 4: Multi-File Upload (NEW)
- Multiple file selection
- File list with remove option
- "Process files" button (doesn't auto-process)

### Screen 5: Parse, Classify & Review (NEW - MANDATORY)
- Internal classification: Stocks | ETFs | Excluded
- Tabs: [ Stocks ] [ ETFs ] [ Excluded ]
- Allow:
  - Uncheck rows
  - Move rows between Stocks and ETFs
  - Remove irrelevant rows
- NO auto-save

### Screen 6: Post-Upload Flow (NEW)
- Ask: "What would you like to do next?"
- Options:
  - Add another investment
  - Skip remaining and go to dashboard

### Screen 7: Summary (Updated)
- Show completion status
- Go to Dashboard / Add more

## Technical Changes Needed

1. **Types** (✅ Done)
   - Add `AssetStatus` type
   - Add `categoryStatus` to `OnboardingState`

2. **Queue Screen Component**
   - Status cards for each selected category
   - Add/Skip buttons per card
   - Status indicators

3. **Multi-File Upload Component**
   - File input with multiple attribute
   - File list display
   - Remove file functionality
   - Process button

4. **Review/Classification Component**
   - Tabs for Stocks/ETFs/Excluded
   - Row selection/checkboxes
   - Move rows between categories
   - Remove rows
   - Save button

5. **API Updates**
   - Multi-file processing endpoint
   - Classification endpoint
   - Validation for file types (CAS vs Broker)

6. **Validation Rules**
   - CAS → Mutual Funds only
   - Broker statements → Stocks + ETFs
   - Show friendly error messages

7. **Dashboard Maintenance** (Verify existing)
   - Add holdings ✅
   - Upload statements ✅ (needs append mode verification)
   - Edit holdings ✅
   - Delete holdings ✅
   - View documents (needs implementation)

## Implementation Priority

1. ✅ Types updated
2. ⏳ Queue screen (Screen 2)
3. ⏳ Asset-specific add method (Screen 3)
4. ⏳ Multi-file upload (Screen 4)
5. ⏳ Review/classification (Screen 5)
6. ⏳ Post-upload flow (Screen 6)
7. ⏳ Validation rules
8. ⏳ Dashboard maintenance verification

## Notes

- Keep onboarding state separate from portfolio data
- Assets created only after user confirmation
- Everything must be skippable
- Never force navigation - always ask

