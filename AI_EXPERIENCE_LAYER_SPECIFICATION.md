# AI Experience Layer - Design Specification

## Core Philosophy

### The Golden Rule
**AI is a trusted portfolio analyst, not a chatbot.**

```
❌ Chatbot-first: "Hi! How can I help you today?"
✅ Analyst-first: "Your portfolio shows 29% concentration in Banking sector."
```

### Three Pillars
1. **AI advises, it does not control**
2. **AI explains, it does not assume**
3. **AI never modifies financial data silently**

---

## AI Roles

### 1. Analyst (Default, Always-On)
**Role**: Passive observer providing contextual insights

**Characteristics**:
- Always present, never intrusive
- Observes portfolio data and provides insights
- No user interaction required
- Feels like having a senior analyst reviewing your portfolio

**Visibility**: 
- Inline insights (no AI badge)
- Risk flags
- Portfolio summaries
- Contextual observations

**Examples**:
```
"Your equity allocation increased 5% this month."
"3 FDs maturing in next 30 days."
"Portfolio XIRR: 12.5% (above category average of 10.2%)"
```

**Placement**:
- Dashboard: Inline insights only
- Holdings screens: Contextual observations
- Analytics screens: Risk flags and insights

---

### 2. Assistant (User-Initiated)
**Role**: Active helper answering questions and explaining concepts

**Characteristics**:
- User must explicitly request help
- Explains performance, terms, trends
- Context-aware (knows what screen user is on)
- Never takes unsolicited actions

**Visibility**:
- Expandable explanations via "Why?" or "Explain" buttons
- Collapsible AI assistant panel (never auto-open)
- Chat UI only in dedicated assistant panel

**Examples**:
```
User clicks "Why?" on sector exposure:
→ "Your Banking sector exposure is 29% because:
   1. Direct holdings: ₹4,50,000 (35% of equity)
   2. MF exposure: ₹3,80,000 (24% of MF equity)
   Combined: ₹8,30,000 (29% of total equity exposure)"

User asks: "What is XIRR?"
→ "XIRR (Extended Internal Rate of Return) is an annualized return 
   calculation that accounts for timing of investments and redemptions..."
```

**Placement**:
- Holdings screens: "Explain" buttons on complex metrics
- Analytics screens: "Why?" buttons on insights
- Dedicated assistant panel: Full chat interface

---

### 3. Automator (Future Phase)
**Role**: Suggests actions, never auto-executes

**Characteristics**:
- Suggestions only
- Never auto-execution
- User must approve every action
- Clear explanation of why action is suggested

**Visibility**:
- Action suggestions (clearly labeled)
- Approval required before execution
- Explanation of impact

**Examples**:
```
"Consider rebalancing: Your equity allocation is 75% vs target 60%.
Suggested action: Redeem ₹2,50,000 from equity funds.
Impact: Reduces equity to 60%, increases debt to 40%."
[Approve] [Dismiss] [Learn More]
```

**Placement**:
- Dashboard: Rebalancing suggestions
- Holdings screens: Tax-loss harvesting suggestions
- Analytics screens: Diversification suggestions

---

## AI Visibility Hierarchy

### Level 1: Inline Insights (No AI Badge)
**Purpose**: Seamless integration, feels like native platform feature

**Examples**:
- Dashboard: "Portfolio up 2.3% this week"
- Holdings: "This holding is 15% of your portfolio"
- Analytics: "Sector concentration: Banking 29%"

**Design**:
- No AI icon or badge
- Plain text or subtle styling
- Feels like platform-generated insight

---

### Level 2: Expandable Explanations ("Why?" / "Explain")
**Purpose**: On-demand explanations without disrupting flow

**Examples**:
- "Why is my equity exposure 28.5L?" → Expandable explanation
- "Explain XIRR" → Tooltip or expandable card
- "What does this mean?" → Contextual help

**Design**:
- Small "Why?" or "?" icon next to metric
- Click expands inline explanation
- Can be dismissed
- No AI branding (feels like help text)

---

### Level 3: Collapsible AI Assistant Panel
**Purpose**: Full chat interface for complex questions

**Examples**:
- User opens panel: "How should I rebalance my portfolio?"
- User asks: "What's the difference between direct and regular MF plans?"
- User requests: "Explain my sector exposure breakdown"

**Design**:
- Floating button or sidebar toggle
- Never auto-opens
- Collapsible panel (slide-in from right)
- Clear AI branding only here
- Professional, analyst-like tone

---

## Placement Rules

### Dashboard
**Allowed**:
- ✅ Inline insights (no AI badge)
- ✅ Risk flags
- ✅ Portfolio summaries
- ✅ Performance observations

**Not Allowed**:
- ❌ Chat UI
- ❌ AI assistant panel (unless user opens)
- ❌ Unsolicited suggestions
- ❌ AI badges on insights

**Example Layout**:
```
┌─────────────────────────────────────────┐
│ Net Worth: ₹45,20,000                   │
│ ↑ 2.3% this week                        │ ← Inline insight (no badge)
│                                          │
│ Asset Allocation                        │
│ [Chart showing allocation]              │
│                                          │
│ ⚠ Concentration Risk                    │ ← Risk flag (no badge)
│ Banking sector: 29% (above 25% limit)   │
└─────────────────────────────────────────┘
```

---

### Holdings & Analytics Screens
**Allowed**:
- ✅ Expandable explanations ("Why?" buttons)
- ✅ Contextual help ("Explain" buttons)
- ✅ Risk flags and insights
- ✅ Collapsible AI assistant panel (user-initiated)

**Not Allowed**:
- ❌ Auto-opening chat
- ❌ Unsolicited suggestions
- ❌ AI badges on inline content

**Example Layout**:
```
┌─────────────────────────────────────────┐
│ Sector Exposure                         │
│                                         │
│ Banking/Finance: ₹8,30,000 (29.1%)     │
│ [Why?] ← Expandable explanation        │
│                                         │
│ Technology: ₹7,70,000 (27.0%)          │
│ [Explain] ← Contextual help            │
└─────────────────────────────────────────┘
```

---

### Dedicated Assistant Panel
**Allowed**:
- ✅ Full chat interface
- ✅ AI branding (only here)
- ✅ Complex Q&A
- ✅ Portfolio analysis requests

**Design**:
- Floating button: "Ask Analyst" or "Get Help"
- Slide-in panel from right
- Professional chat interface
- Clear AI identity

**Example Layout**:
```
┌─────────────────────────────────────────┐
│ Portfolio Analyst                        │
│ ────────────────────────────────────────│
│                                         │
│ You: How should I rebalance?            │
│                                         │
│ Analyst: Based on your target allocation│
│ of 60% equity, 40% debt, I recommend:   │
│                                         │
│ 1. Reduce equity by ₹2,50,000          │
│ 2. Increase debt by ₹2,50,000          │
│                                         │
│ This would bring your current allocation│
│ (75% equity, 25% debt) closer to target.│
│                                         │
│ [View Rebalancing Calculator]           │
└─────────────────────────────────────────┘
```

---

## Trust Rules

### 1. Reference User-Visible Data
**Rule**: AI must only reference data that user can see on screen

**✅ Good**:
```
"Your portfolio shows ₹45,20,000 total value 
(based on your uploaded holdings)."
```

**❌ Bad**:
```
"Based on our analysis of market trends..."
(No reference to user's actual data)
```

---

### 2. No Guessed or Inferred Numbers
**Rule**: If AI doesn't have exact data, it must say so

**✅ Good**:
```
"Your equity exposure via mutual funds is approximately 
₹15,72,500 (based on fund factsheets as of Nov 30, 2024). 
Note: Actual exposure may vary by ±2% as fund allocations 
change daily."
```

**❌ Bad**:
```
"Your equity exposure is ₹15,72,500"
(Implies certainty when data is approximate)
```

---

### 3. Explicit About Missing Data
**Rule**: If data is unavailable, state it clearly

**✅ Good**:
```
"XIRR calculation requires transaction history. 
Your portfolio shows current holdings but no transaction 
data. To see XIRR, please upload transaction history."
```

**❌ Bad**:
```
"XIRR: Not available"
(Doesn't explain why or how to fix)
```

---

### 4. Calm, Professional, Human Tone
**Rule**: Sound like a senior analyst, not a chatbot

**✅ Good**:
```
"Your portfolio shows strong performance this quarter, 
with equity holdings up 12.5%. However, there's 
concentration risk in the Banking sector at 29%, 
which exceeds the recommended 25% limit for single-sector 
exposure."
```

**❌ Bad**:
```
"🎉 Great news! Your portfolio is up 12.5%! 
But ⚠️ watch out for concentration risk!"
(Too casual, emoji-heavy, chatbot-like)
```

---

## AI Interaction Patterns

### Pattern 1: Inline Insight
**When**: Always-on, contextual observation

**Example**:
```
Dashboard → Net Worth Card
"Portfolio up 2.3% this week"
(No AI badge, feels native)
```

**Design**:
- Subtle text color (#6B7280)
- No icon or badge
- Feels like platform-generated insight

---

### Pattern 2: Expandable Explanation
**When**: User wants to understand a metric

**Example**:
```
Analytics → Sector Exposure
"Banking/Finance: ₹8,30,000 (29.1%) [Why?]"
↓ Click
"Your Banking sector exposure is 29.1% because:
 • Direct equity holdings: ₹4,50,000 (35% of equity)
 • MF equity exposure: ₹3,80,000 (24% of MF equity)
 Combined: ₹8,30,000 (29.1% of total equity exposure)
 
 This exceeds the recommended 25% single-sector limit."
```

**Design**:
- Small "Why?" or "?" icon
- Click expands inline card
- Can be collapsed
- No AI branding

---

### Pattern 3: Risk Flag
**When**: Important issue needs attention

**Example**:
```
Dashboard → Insights Section
"⚠ Concentration Risk
Banking sector: 29% (above 25% recommended limit)
[View Details] [Dismiss]"
```

**Design**:
- Warning icon (⚠)
- Clear, actionable message
- Links to relevant screen
- Can be dismissed

---

### Pattern 4: Contextual Help
**When**: User needs explanation of a term or concept

**Example**:
```
Holdings → Mutual Funds Table
"XIRR: 12.5% [Explain]"
↓ Click
"XIRR (Extended Internal Rate of Return) is an 
annualized return calculation that accounts for:
• Timing of investments
• Timing of redemptions
• Irregular cash flows

Your XIRR of 12.5% means your portfolio has grown 
at an annualized rate of 12.5% since inception."
```

**Design**:
- "Explain" or "?" button
- Tooltip or expandable card
- Clear, educational content
- No AI branding

---

### Pattern 5: Assistant Panel
**When**: User has complex questions

**Example**:
```
User clicks "Ask Analyst" button
→ Panel slides in from right
→ User types: "How should I rebalance my portfolio?"
→ Analyst responds with personalized recommendation
```

**Design**:
- Floating button or sidebar toggle
- Never auto-opens
- Professional chat interface
- Clear AI identity ("Portfolio Analyst")
- Can be minimized or closed

---

## Tone & Language Guidelines

### Do's ✅
- **Professional**: "Your portfolio shows..."
- **Specific**: "Equity allocation: 75% (target: 60%)"
- **Transparent**: "Based on fund factsheets as of Nov 30, 2024"
- **Helpful**: "To see XIRR, please upload transaction history"
- **Calm**: "There's concentration risk" (not "⚠️ ALERT!")

### Don'ts ❌
- **Chatbot-like**: "Hi! How can I help?"
- **Vague**: "Your portfolio looks good!"
- **Assumptive**: "You should rebalance" (without context)
- **Alarmist**: "🚨 URGENT: Rebalance now!"
- **Emoji-heavy**: "🎉 Great! ⚠️ But watch out!"

---

## Data Transparency Requirements

### Every AI Statement Must Include:
1. **Data Source**: Where the number comes from
2. **Confidence Level**: How certain (if approximate)
3. **Timestamp**: When data was last updated
4. **Limitations**: What the data doesn't show

**Example**:
```
"Your equity exposure via mutual funds is approximately 
₹15,72,500.

Data source: Fund factsheets (as of Nov 30, 2024)
Confidence: ±2% (fund allocations change daily)
Limitation: Based on monthly factsheets, not real-time data"
```

---

## Implementation Guidelines

### Phase 1: Analyst Role (Default)
**Priority**: High
**Features**:
- Inline insights on dashboard
- Risk flags
- Portfolio summaries
- Contextual observations

**UI Components**:
- Inline text (no AI badge)
- Risk flag cards
- Summary cards

---

### Phase 2: Assistant Role (User-Initiated)
**Priority**: Medium
**Features**:
- Expandable explanations ("Why?" buttons)
- Contextual help ("Explain" buttons)
- Collapsible assistant panel
- Chat interface

**UI Components**:
- "Why?" / "Explain" buttons
- Expandable cards
- Slide-in panel
- Chat interface

---

### Phase 3: Automator Role (Future)
**Priority**: Low
**Features**:
- Action suggestions
- Rebalancing recommendations
- Tax optimization suggestions

**UI Components**:
- Suggestion cards
- Approval dialogs
- Impact previews

---

## Example User Flows

### Flow 1: User Sees Inline Insight
```
1. User opens dashboard
2. Sees: "Portfolio up 2.3% this week"
3. No AI badge, feels native
4. User continues browsing
```

### Flow 2: User Wants Explanation
```
1. User on Sector Exposure screen
2. Sees: "Banking: 29.1% [Why?]"
3. Clicks "Why?"
4. Expands: "Your Banking exposure is 29.1% because..."
5. User understands, continues
```

### Flow 3: User Asks Complex Question
```
1. User on dashboard
2. Clicks "Ask Analyst" button
3. Panel slides in
4. User types: "How should I rebalance?"
5. Analyst responds with personalized recommendation
6. User reviews, closes panel
```

---

## Success Metrics

### Trust Indicators
- Users click "Why?" / "Explain" buttons
- Users open assistant panel for complex questions
- Users don't dismiss risk flags immediately
- Users reference AI insights in feedback

### Quality Indicators
- AI responses reference user-visible data
- Users understand AI explanations
- No confusion about AI vs platform-generated content
- Users feel AI is helpful, not intrusive

---

## Design Principles Summary

1. **Analyst, Not Chatbot**: Professional, knowledgeable, helpful
2. **Advise, Don't Control**: Suggestions only, user decides
3. **Explain, Don't Assume**: Clear reasoning, transparent sources
4. **Never Modify Silently**: All changes require user approval
5. **Reference Visible Data**: Only use data user can see
6. **Explicit About Uncertainty**: State confidence levels, limitations
7. **Calm, Professional Tone**: Senior analyst, not marketing bot
8. **Progressive Disclosure**: Inline → Expandable → Full Panel

---

**Design Version**: AI Experience Layer v1.0  
**Status**: Specification Complete  
**Phase**: 1 (Analyst Role - Default)  
**Next Steps**: Implement inline insights and risk flags








