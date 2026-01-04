# AI Experience Layer - Quick Reference

## 🎯 Core Principle
**AI is a trusted portfolio analyst, not a chatbot.**

---

## 👤 Three AI Roles

### 1. Analyst (Default, Always-On)
- **What**: Inline insights, risk flags, portfolio summaries
- **Where**: Dashboard, holdings, analytics screens
- **Visibility**: No AI badge, feels native
- **Example**: "Portfolio up 2.3% this week"

### 2. Assistant (User-Initiated)
- **What**: Explains performance, terms, trends
- **Where**: Expandable "Why?" / "Explain" buttons, assistant panel
- **Visibility**: User must click to see
- **Example**: User clicks "Why?" → Explanation expands

### 3. Automator (Future)
- **What**: Suggests actions (never auto-executes)
- **Where**: Suggestion cards with approval required
- **Visibility**: Clear action suggestions
- **Example**: "Consider rebalancing: [Approve] [Dismiss]"

---

## 📍 Placement Rules

### Dashboard
✅ **Allowed**:
- Inline insights (no AI badge)
- Risk flags
- Portfolio summaries

❌ **Not Allowed**:
- Chat UI
- Auto-opening assistant panel
- AI badges on insights

### Holdings & Analytics
✅ **Allowed**:
- Expandable explanations ("Why?" buttons)
- Contextual help ("Explain" buttons)
- Risk flags
- Collapsible assistant panel (user-initiated)

❌ **Not Allowed**:
- Auto-opening chat
- Unsolicited suggestions

### Assistant Panel
✅ **Allowed**:
- Full chat interface
- AI branding (only here)
- Complex Q&A

**Design**: Floating button → Slide-in panel (never auto-opens)

---

## 🎨 Visibility Hierarchy

### Level 1: Inline Insights
- **No AI badge**
- Feels like platform feature
- Example: "Portfolio up 2.3% this week"

### Level 2: Expandable Explanations
- **"Why?" or "Explain" button**
- Click to expand
- No AI branding
- Example: "Banking: 29% [Why?]"

### Level 3: Assistant Panel
- **Floating button** ("Ask Analyst")
- Slide-in panel (user-initiated)
- Clear AI identity
- Full chat interface

---

## ✅ Trust Rules

### 1. Reference User-Visible Data
✅ "Your portfolio shows ₹45,20,000 (based on your uploaded holdings)"
❌ "Based on our analysis of market trends..."

### 2. No Guessed Numbers
✅ "Approximately ₹15,72,500 (based on factsheets as of Nov 30, 2024). Note: ±2% accuracy."
❌ "Your equity exposure is ₹15,72,500" (implies certainty)

### 3. Explicit About Missing Data
✅ "XIRR requires transaction history. To see XIRR, please upload transaction history."
❌ "XIRR: Not available"

### 4. Calm, Professional Tone
✅ "Your portfolio shows strong performance. However, there's concentration risk at 29%."
❌ "🎉 Great news! But ⚠️ watch out!"

---

## 💬 Tone Guidelines

### Do's ✅
- Professional: "Your portfolio shows..."
- Specific: "Equity allocation: 75% (target: 60%)"
- Transparent: "Based on fund factsheets as of Nov 30, 2024"
- Helpful: "To see XIRR, please upload transaction history"
- Calm: "There's concentration risk" (not "🚨 ALERT!")

### Don'ts ❌
- Chatbot-like: "Hi! How can I help?"
- Vague: "Your portfolio looks good!"
- Assumptive: "You should rebalance" (without context)
- Alarmist: "🚨 URGENT: Rebalance now!"
- Emoji-heavy: "🎉 Great! ⚠️ But watch out!"

---

## 🧩 Component Examples

### Inline Insight
```tsx
<p className="text-sm text-[#6B7280] mt-2">
  ↑ 2.3% this week
</p>
```

### Expandable Explanation
```tsx
<div className="flex items-center gap-2">
  <span>Banking: 29%</span>
  <button className="text-xs text-[#2563EB] hover:underline">
    Why?
  </button>
</div>
{expanded && <ExplanationCard />}
```

### Risk Flag
```tsx
<div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-4">
  <AlertTriangleIcon />
  <p>Concentration Risk: Banking 29% (above 25% limit)</p>
</div>
```

### Assistant Panel
```tsx
<button onClick={() => setIsOpen(!isOpen)}>
  Ask Analyst
</button>
{isOpen && <SlideInPanel />}
```

---

## 📋 Implementation Phases

### Phase 1: Analyst (Default) - HIGH PRIORITY
- [ ] Inline insights on dashboard
- [ ] Risk flags component
- [ ] Portfolio summaries

### Phase 2: Assistant (User-Initiated) - MEDIUM PRIORITY
- [ ] "Why?" expandable explanations
- [ ] "Explain" contextual help
- [ ] Collapsible assistant panel
- [ ] Floating assistant button

### Phase 3: Automator (Future) - LOW PRIORITY
- [ ] Action suggestion cards
- [ ] Approval dialogs

---

## 🎯 Success Criteria

### Trust Indicators
- Users click "Why?" / "Explain" buttons
- Users open assistant panel for questions
- Users don't dismiss risk flags immediately
- Users reference AI insights in feedback

### Quality Indicators
- AI responses reference user-visible data
- Users understand AI explanations
- No confusion about AI vs platform content
- Users feel AI is helpful, not intrusive

---

## 📝 Key Principles

1. **Analyst, Not Chatbot**: Professional, knowledgeable, helpful
2. **Advise, Don't Control**: Suggestions only, user decides
3. **Explain, Don't Assume**: Clear reasoning, transparent sources
4. **Never Modify Silently**: All changes require user approval
5. **Reference Visible Data**: Only use data user can see
6. **Explicit About Uncertainty**: State confidence levels, limitations
7. **Calm, Professional Tone**: Senior analyst, not marketing bot
8. **Progressive Disclosure**: Inline → Expandable → Full Panel

---

## 🔗 Related Documents

- **Full Specification**: `AI_EXPERIENCE_LAYER_SPECIFICATION.md`
- **Visual Design Guide**: `AI_EXPERIENCE_LAYER_VISUAL_GUIDE.md`
- **Quick Reference**: This document

---

**Design Version**: AI Experience Layer v1.0  
**Status**: Specification Complete  
**Next Steps**: Implement Phase 1 (Analyst Role)








