# AI Experience Layer - Visual Design Guide

## Component Library

### 1. Inline Insight (No AI Badge)

**Usage**: Always-on, contextual observations

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Net Worth: ₹45,20,000                   │
│ ↑ 2.3% this week                        │ ← Inline insight
│                                         │
│ Last updated: Dec 24, 2024              │
└─────────────────────────────────────────┘
```

**CSS Classes**:
```css
.inline-insight {
  color: #6B7280;
  font-size: 0.875rem;
  font-weight: 400;
  margin-top: 0.25rem;
}
```

**Example Code**:
```tsx
<div className="mt-2">
  <span className="text-sm text-[#6B7280]">
    ↑ 2.3% this week
  </span>
</div>
```

---

### 2. Expandable Explanation ("Why?" Button)

**Usage**: On-demand explanations without disrupting flow

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Banking/Finance: ₹8,30,000 (29.1%)     │
│ [Why?] ← Small, subtle button           │
└─────────────────────────────────────────┘
         ↓ Click
┌─────────────────────────────────────────┐
│ Banking/Finance: ₹8,30,000 (29.1%)     │
│ [Why?]                                  │
│ ─────────────────────────────────────── │
│ Your Banking sector exposure is 29.1%   │
│ because:                                │
│                                         │
│ • Direct equity holdings: ₹4,50,000     │
│   (35% of your equity portfolio)        │
│                                         │
│ • MF equity exposure: ₹3,80,000         │
│   (24% of your MF equity exposure)      │
│                                         │
│ Combined: ₹8,30,000                     │
│ (29.1% of total equity exposure)        │
│                                         │
│ This exceeds the recommended 25%       │
│ single-sector limit.                    │
└─────────────────────────────────────────┘
```

**CSS Classes**:
```css
.explain-button {
  color: #2563EB;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
}

.explain-button:hover {
  text-decoration: underline;
}

.explanation-card {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
}
```

**Example Code**:
```tsx
<div>
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold">
      Banking/Finance: ₹8,30,000 (29.1%)
    </span>
    <button 
      onClick={() => setExpanded(!expanded)}
      className="text-xs text-[#2563EB] hover:underline"
    >
      Why?
    </button>
  </div>
  {expanded && (
    <div className="mt-2 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
      <p className="text-sm text-[#475569]">
        Your Banking sector exposure is 29.1% because:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[#475569]">
        <li>• Direct equity holdings: ₹4,50,000 (35% of equity)</li>
        <li>• MF equity exposure: ₹3,80,000 (24% of MF equity)</li>
      </ul>
      <p className="mt-2 text-sm text-[#475569]">
        Combined: ₹8,30,000 (29.1% of total equity exposure)
      </p>
    </div>
  )}
</div>
```

---

### 3. Risk Flag

**Usage**: Important issues that need attention

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ ⚠ Concentration Risk                   │
│                                         │
│ Banking sector: 29%                     │
│ (Above 25% recommended limit)           │
│                                         │
│ [View Details] [Dismiss]               │
└─────────────────────────────────────────┘
```

**CSS Classes**:
```css
.risk-flag {
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 0.75rem;
  padding: 1rem;
}

.risk-flag-icon {
  color: #F59E0B;
  width: 1.25rem;
  height: 1.25rem;
}
```

**Example Code**:
```tsx
<div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-4">
  <div className="flex items-start gap-3">
    <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-semibold text-[#92400E] mb-1">
        Concentration Risk
      </p>
      <p className="text-sm text-[#92400E] mb-3">
        Banking sector: 29% (Above 25% recommended limit)
      </p>
      <div className="flex gap-2">
        <Link 
          href="/analytics/sector-exposure"
          className="text-xs font-medium text-[#92400E] hover:underline"
        >
          View Details
        </Link>
        <button 
          onClick={() => dismissRiskFlag()}
          className="text-xs font-medium text-[#92400E] hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
</div>
```

---

### 4. Contextual Help ("Explain" Button)

**Usage**: Explain terms, metrics, or concepts

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ XIRR: 12.5% [Explain]                  │
└─────────────────────────────────────────┘
         ↓ Click
┌─────────────────────────────────────────┐
│ XIRR: 12.5% [Explain]                  │
│ ─────────────────────────────────────── │
│ XIRR (Extended Internal Rate of Return)│
│                                         │
│ An annualized return calculation that   │
│ accounts for:                           │
│ • Timing of investments                 │
│ • Timing of redemptions                 │
│ • Irregular cash flows                 │
│                                         │
│ Your XIRR of 12.5% means your portfolio │
│ has grown at an annualized rate of      │
│ 12.5% since inception.                 │
└─────────────────────────────────────────┘
```

**Example Code**:
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm font-semibold">
    XIRR: 12.5%
  </span>
  <button 
    onClick={() => setShowExplanation(!showExplanation)}
    className="text-xs text-[#2563EB] hover:underline"
  >
    Explain
  </button>
</div>
{showExplanation && (
  <div className="mt-2 p-4 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg">
    <p className="text-sm font-semibold text-[#1E40AF] mb-2">
      XIRR (Extended Internal Rate of Return)
    </p>
    <p className="text-sm text-[#1E40AF] mb-2">
      An annualized return calculation that accounts for:
    </p>
    <ul className="list-disc list-inside text-sm text-[#1E40AF] space-y-1 mb-2">
      <li>Timing of investments</li>
      <li>Timing of redemptions</li>
      <li>Irregular cash flows</li>
    </ul>
    <p className="text-sm text-[#1E40AF]">
      Your XIRR of 12.5% means your portfolio has grown at 
      an annualized rate of 12.5% since inception.
    </p>
  </div>
)}
```

---

### 5. Assistant Panel (Collapsible)

**Usage**: Full chat interface for complex questions

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Portfolio Analyst          [−] [×]     │
│ ────────────────────────────────────────│
│                                         │
│ You: How should I rebalance?            │
│                                         │
│ Analyst: Based on your target allocation│
│ of 60% equity, 40% debt, I recommend:   │
│                                         │
│ 1. Reduce equity by ₹2,50,000          │
│    Current: 75% → Target: 60%          │
│                                         │
│ 2. Increase debt by ₹2,50,000           │
│    Current: 25% → Target: 40%          │
│                                         │
│ This would bring your allocation closer │
│ to your stated goal.                    │
│                                         │
│ [View Rebalancing Calculator]         │
│                                         │
│ ────────────────────────────────────────│
│ [Type your question...]        [Send]   │
└─────────────────────────────────────────┘
```

**CSS Classes**:
```css
.assistant-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: white;
  border-left: 1px solid #E5E7EB;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.assistant-header {
  padding: 1rem;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assistant-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.assistant-input {
  padding: 1rem;
  border-top: 1px solid #E5E7EB;
}
```

**Example Code**:
```tsx
{isAssistantOpen && (
  <div className="fixed right-0 top-0 w-96 h-screen bg-white border-l border-[#E5E7EB] shadow-lg z-50 flex flex-col">
    {/* Header */}
    <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
      <h3 className="text-base font-semibold text-[#0F172A]">
        Portfolio Analyst
      </h3>
      <div className="flex gap-2">
        <button onClick={() => setIsMinimized(!isMinimized)}>
          <MinimizeIcon className="w-4 h-4" />
        </button>
        <button onClick={() => setIsAssistantOpen(false)}>
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Messages */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, idx) => (
        <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
          <div className={`inline-block p-3 rounded-lg ${
            msg.role === 'user' 
              ? 'bg-[#2563EB] text-white' 
              : 'bg-[#F9FAFB] text-[#0F172A]'
          }`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Input */}
    <div className="p-4 border-t border-[#E5E7EB]">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]"
        >
          Send
        </button>
      </div>
    </div>
  </div>
)}
```

---

### 6. Floating Assistant Button

**Usage**: Toggle assistant panel

**Visual Design**:
```
                    [Ask Analyst]
                         ↑
                   Floating button
                   (bottom right)
```

**CSS Classes**:
```css
.floating-assistant-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #2563EB;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}

.floating-assistant-button:hover {
  background: #1E40AF;
  transform: scale(1.05);
}
```

**Example Code**:
```tsx
<button
  onClick={() => setIsAssistantOpen(!isAssistantOpen)}
  className="fixed bottom-8 right-8 w-14 h-14 bg-[#2563EB] text-white rounded-full shadow-lg hover:bg-[#1E40AF] flex items-center justify-center transition-all z-50"
  aria-label="Ask Portfolio Analyst"
>
  <MessageIcon className="w-6 h-6" />
</button>
```

---

## Screen-Specific Implementations

### Dashboard

**Allowed Components**:
- Inline insights (no AI badge)
- Risk flags
- Portfolio summaries

**Example**:
```tsx
<section className="mb-8">
  <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
    <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
      Net Worth
    </h2>
    <p className="text-4xl font-semibold text-[#0F172A] number-emphasis">
      {formatCurrency(netWorth)}
    </p>
    {/* Inline insight - no AI badge */}
    <p className="text-sm text-[#6B7280] mt-2">
      ↑ 2.3% this week
    </p>
  </div>

  {/* Risk flag */}
  {hasConcentrationRisk && (
    <div className="mt-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="w-5 h-5 text-[#F59E0B]" />
        <div>
          <p className="text-sm font-semibold text-[#92400E]">
            Concentration Risk
          </p>
          <p className="text-sm text-[#92400E] mt-1">
            Banking sector: 29% (above 25% limit)
          </p>
        </div>
      </div>
    </div>
  )}
</section>
```

---

### Holdings & Analytics Screens

**Allowed Components**:
- Expandable explanations ("Why?" buttons)
- Contextual help ("Explain" buttons)
- Risk flags
- Collapsible assistant panel (user-initiated)

**Example**:
```tsx
<table>
  <tbody>
    <tr>
      <td>
        <div className="flex items-center gap-2">
          <span>Banking/Finance: ₹8,30,000 (29.1%)</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#2563EB] hover:underline"
          >
            Why?
          </button>
        </div>
        {expanded && (
          <ExplanationCard>
            Your Banking sector exposure is 29.1% because...
          </ExplanationCard>
        )}
      </td>
    </tr>
  </tbody>
</table>
```

---

## Tone Examples

### ✅ Good (Professional, Analyst-like)
```
"Your portfolio shows strong performance this quarter, 
with equity holdings up 12.5%. However, there's 
concentration risk in the Banking sector at 29%, 
which exceeds the recommended 25% limit for single-sector 
exposure."
```

### ❌ Bad (Chatbot-like)
```
"🎉 Great news! Your portfolio is up 12.5%! 
But ⚠️ watch out for concentration risk!"
```

---

### ✅ Good (Specific, Data-Referenced)
```
"Your equity exposure via mutual funds is approximately 
₹15,72,500 (based on fund factsheets as of Nov 30, 2024). 
Note: Actual exposure may vary by ±2% as fund allocations 
change daily."
```

### ❌ Bad (Vague, No Source)
```
"Your equity exposure is ₹15,72,500"
```

---

### ✅ Good (Helpful, Actionable)
```
"XIRR calculation requires transaction history. 
Your portfolio shows current holdings but no transaction 
data. To see XIRR, please upload transaction history 
via the Portfolio Upload feature."
```

### ❌ Bad (Unhelpful)
```
"XIRR: Not available"
```

---

## Implementation Checklist

### Phase 1: Analyst Role (Default)
- [ ] Inline insights on dashboard
- [ ] Risk flags component
- [ ] Portfolio summaries
- [ ] Contextual observations

### Phase 2: Assistant Role (User-Initiated)
- [ ] "Why?" expandable explanations
- [ ] "Explain" contextual help
- [ ] Collapsible assistant panel
- [ ] Chat interface
- [ ] Floating assistant button

### Phase 3: Automator Role (Future)
- [ ] Action suggestion cards
- [ ] Approval dialogs
- [ ] Impact previews

---

**Design Version**: AI Experience Layer Visual Guide v1.0  
**Status**: Complete  
**Next Steps**: Implement Phase 1 components








