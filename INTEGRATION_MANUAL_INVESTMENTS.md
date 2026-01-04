# Integration Guide: Manual Investments

This guide shows how to integrate the Manual Investment Modal into your existing pages.

---

## 1. Dashboard Integration

### Add Manual Investment Button

In `src/app/dashboard/page.tsx`, add the modal import and state:

```typescript
// At the top of the component
import ManualInvestmentModal from '@/components/ManualInvestmentModal';

// Inside the component function
const [isManualInvestmentOpen, setIsManualInvestmentOpen] = useState(false);
```

### Add Button to UI

Add this button in your dashboard action bar (near "Update Portfolio"):

```tsx
<button
  onClick={() => setIsManualInvestmentOpen(true)}
  className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
>
  + Add Manually
</button>
```

### Add Modal Component

At the end of the JSX return statement, add:

```tsx
<ManualInvestmentModal
  isOpen={isManualInvestmentOpen}
  onClose={() => setIsManualInvestmentOpen(false)}
  userId={user?.id}
  source="dashboard"
  onSuccess={() => {
    // Refresh portfolio data
    setIsManualInvestmentOpen(false);
    // Optionally trigger data refresh
    window.location.reload(); // or implement proper refetch
  }}
/>
```

### Complete Example

```tsx
'use client';

import { useState } from 'react';
import ManualInvestmentModal from '@/components/ManualInvestmentModal';
import { useAuth } from '@/lib/auth';
import { PlusIcon } from '@/components/icons';

export default function DashboardPage() {
  const [isManualInvestmentOpen, setIsManualInvestmentOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsManualInvestmentOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add Investment
        </button>
      </div>

      {/* Your existing dashboard content */}
      {/* ... */}

      {/* Manual Investment Modal */}
      <ManualInvestmentModal
        isOpen={isManualInvestmentOpen}
        onClose={() => setIsManualInvestmentOpen(false)}
        userId={user?.id}
        source="dashboard"
        onSuccess={() => {
          setIsManualInvestmentOpen(false);
          // Optionally refresh data
        }}
      />
    </div>
  );
}
```

---

## 2. Onboarding Integration

### Add Manual Investment Option

In `src/app/onboarding/page.tsx`, add the modal state:

```typescript
const [isManualInvestmentOpen, setIsManualInvestmentOpen] = useState(false);
```

### Add "Add Manually" Button in Investment Section

When the user chooses to add investments during onboarding:

```tsx
<div className="space-y-4">
  <h2 className="text-lg font-semibold">Add Investments</h2>
  
  <button
    onClick={() => setIsManualInvestmentOpen(true)}
    className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors"
  >
    <span className="text-3xl mb-2 block">✋</span>
    <span className="font-medium">Add Manually</span>
  </button>
</div>
```

### Add Modal Component

```tsx
<ManualInvestmentModal
  isOpen={isManualInvestmentOpen}
  onClose={() => setIsManualInvestmentOpen(false)}
  userId={user?.id}
  source="onboarding"
  onSuccess={() => {
    setIsManualInvestmentOpen(false);
    // Continue with onboarding flow
  }}
/>
```

---

## 3. Holdings List with Edit/Delete

### Display Holdings with Edit Option

```tsx
interface Holding {
  id: string;
  asset: {
    name: string;
    asset_type: string;
    asset_metadata?: Record<string, any>;
  };
  current_value: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
  onEdit: (holding: Holding) => void;
  onDelete: (holdingId: string) => void;
}

export function HoldingsTable({ holdings, onEdit, onDelete }: HoldingsTableProps) {
  return (
    <div className="space-y-2">
      {holdings.map((holding) => (
        <div
          key={holding.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
        >
          <div>
            <p className="font-medium">{holding.asset.name}</p>
            <p className="text-sm text-gray-600">{holding.asset.asset_type.toUpperCase()}</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="font-semibold">₹{holding.current_value.toLocaleString('en-IN')}</p>

            <button
              onClick={() => onEdit(holding)}
              className="px-3 py-1 text-sm rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              Edit
            </button>

            <button
              onClick={() => onDelete(holding.id)}
              className="px-3 py-1 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Usage with Edit Modal

```tsx
const [editingHolding, setEditingHolding] = useState<any>(null);

const handleEditHolding = (holding: Holding) => {
  setEditingHolding({
    id: holding.id,
    data: {
      assetType: holding.asset.asset_type,
      // Reconstruct form data from asset_metadata
      ...holding.asset.asset_metadata,
    },
  });
};

return (
  <>
    <HoldingsTable
      holdings={holdings}
      onEdit={handleEditHolding}
      onDelete={handleDeleteHolding}
    />

    <ManualInvestmentModal
      isOpen={!!editingHolding}
      onClose={() => setEditingHolding(null)}
      userId={user?.id}
      source="dashboard"
      editingHoldingId={editingHolding?.id}
      editingData={editingHolding?.data}
      onSuccess={() => {
        setEditingHolding(null);
        // Refresh holdings
      }}
    />
  </>
);
```

---

## 4. Delete API Route (Optional)

If you want to support deletion, create this API route:

**`src/app/api/investments/manual/delete/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
  try {
    const { holding_id, portfolio_id } = await req.json();

    if (!holding_id || !portfolio_id) {
      return NextResponse.json(
        { success: false, error: 'Missing holding_id or portfolio_id' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Delete holding
    const { error: deleteError } = await adminClient
      .from('holdings')
      .delete()
      .eq('id', holding_id);

    if (deleteError) {
      throw new Error('Failed to delete holding');
    }

    // Recalculate metrics
    const { data: holdings } = await adminClient
      .from('holdings')
      .select('*, asset:assets(*)')
      .eq('portfolio_id', portfolio_id);

    if (holdings && holdings.length > 0) {
      let totalValue = 0;
      holdings.forEach((h: any) => {
        totalValue += h.current_value || 0;
      });

      await adminClient
        .from('portfolio_metrics')
        .update({ total_value: totalValue })
        .eq('portfolio_id', portfolio_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete',
      },
      { status: 500 }
    );
  }
}
```

---

## 5. Form Data Reconstruction Helper

Helper function to convert stored asset_metadata back to form data:

```typescript
// src/lib/investments/manual.ts

import type { ManualInvestmentFormData } from '@/types/manual-investments';

export function reconstructFormData(
  asset: any,
  holding: any
): ManualInvestmentFormData | null {
  const metadata = asset.asset_metadata || {};

  switch (asset.asset_type) {
    case 'fd':
      return {
        assetType: 'fd',
        fdInstitution: metadata.institution || '',
        fdPrincipal: metadata.principal || 0,
        fdRate: metadata.interest_rate || 0,
        fdStartDate: metadata.start_date || '',
        fdMaturityDate: metadata.maturity_date || '',
      };

    case 'bond':
      return {
        assetType: 'bond',
        bondIssuer: metadata.issuer || '',
        bondAmount: holding.invested_value || 0,
        bondCouponRate: metadata.coupon_rate || 0,
        bondCouponFrequency: metadata.coupon_frequency || 'annual',
        bondMaturityDate: metadata.maturity_date || '',
      };

    case 'gold':
      return {
        assetType: 'gold',
        goldType: metadata.type || 'physical',
        goldAmount: holding.invested_value || 0,
        goldPurchaseDate: metadata.purchase_date || '',
      };

    case 'cash':
      return {
        assetType: 'cash',
        cashAmount: holding.invested_value || 0,
        cashAccountType: metadata.account_type || '',
      };

    default:
      return null;
  }
}
```

Usage:

```typescript
import { reconstructFormData } from '@/lib/investments/manual';

const handleEditHolding = (holding: Holding) => {
  const formData = reconstructFormData(holding.asset, holding);
  setEditingHolding({
    id: holding.id,
    data: formData,
  });
};
```

---

## 6. Styling Notes

### Modal Appearance

The modal uses:
- Tailwind CSS for styling
- `emerald-600` as primary color
- Calm, neutral design (no urgent reds)
- Smooth transitions and animations

### Custom Styling

To customize colors, edit `ManualInvestmentModal.tsx`:

```typescript
// Change primary color
className="border-emerald-500 bg-emerald-50" // ← Change emerald to your brand color
```

---

## 7. Accessibility

The modal is built with accessibility in mind:

- Semantic HTML
- Keyboard navigation (Tab/Enter/Escape)
- ARIA labels where appropriate
- Color contrast meets WCAG standards

---

## 8. Performance Considerations

- Modal state lives in parent component (not global)
- Form validation is lightweight and local
- API request debounced via form submission
- Asset creation batched with holding upsert

---

## 9. Testing Integration

### Unit Tests

```typescript
// Example: Test form validation
test('FD form requires all fields', () => {
  const modal = render(
    <ManualInvestmentModal isOpen={true} userId="123" source="dashboard" />
  );

  // Click Review without filling fields
  fireEvent.click(screen.getByText('Review'));

  // Should show error
  expect(screen.getByText(/Please fill in all FD details/)).toBeInTheDocument();
});
```

### Integration Tests

```typescript
// Test: Create FD, verify it appears in holdings list
test('FD appears in holdings after save', async () => {
  const { user } = renderWithAuth(<Dashboard />);

  // Open modal
  fireEvent.click(screen.getByText('Add Investment'));

  // Select FD
  fireEvent.click(screen.getByText('Fixed Deposit'));

  // Fill form
  fireEvent.change(screen.getByPlaceholderText('HDFC Bank'), {
    target: { value: 'HDFC Bank' },
  });

  // ... fill other fields

  // Submit
  fireEvent.click(screen.getByText('Save Investment'));

  // Wait for success
  await waitFor(() => {
    expect(screen.getByText('Investment added!')).toBeInTheDocument();
  });

  // Verify in holdings
  await waitFor(() => {
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });
});
```

---

## Quick Checklist

- [ ] Import `ManualInvestmentModal` in your page
- [ ] Add state for `isManualInvestmentOpen`
- [ ] Add button to trigger modal
- [ ] Pass required props: `userId`, `source`, `onSuccess`
- [ ] Test form submission
- [ ] Verify portfolio metrics update
- [ ] Check dashboard totals are correct
- [ ] Test edit functionality (if needed)
- [ ] Test error handling

---

## Troubleshooting

**Modal doesn't appear:**
- Check `isOpen` prop is true
- Verify state is being set on button click
- Check console for errors

**Form doesn't validate:**
- Verify all required fields are filled
- Check amounts are > 0
- Verify dates are valid

**Data doesn't save:**
- Check API route response in Network tab
- Verify user_id is passed correctly
- Check database RLS policies

**Portfolio totals don't update:**
- Check `recalculateMetrics` is called in API
- Verify holdings are visible in Supabase
- Check portfolio_metrics table has row

---

## Support

For issues or questions, refer to:
- `MANUAL_INVESTMENTS_GUIDE.md` - Architecture & design
- `src/components/ManualInvestmentModal.tsx` - Component logic
- `src/app/api/investments/manual/route.ts` - Backend logic

