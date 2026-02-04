# Real Estate Property Detail - Quick Reference

## Three Main Features

### 1️⃣ Edit Property - Full Details
**When**: Click "Edit Property" button on property detail page

**What You Can Edit**:
- Basic: Property nickname, type, status
- Financial: Purchase price, date, registration value, ownership %
- Location: Address, city, state, pincode, project name, builder, RERA #
- Dimensions: Carpet area, built-up area

**How**: Multi-step wizard (3 steps with Previous/Next buttons)

**Tip**: Same comprehensive form as when you added the property initially

---

### 2️⃣ XIRR - Your Annual Return
**What It Shows**: The annualized % return on your real estate investment

**Simple Example**:
- Paid: ₹50L in 2020
- Worth: ₹60L in 2024
- XIRR: 4.7% annual return

**Quick Interpretation**:
| XIRR | Status |
|------|--------|
| 3-5% | Normal appreciation |
| 5-7% | Good returns |
| 7%+ | Excellent |

**Remember**: This is appreciation-only, not including rental income

---

### 3️⃣ Sell vs Hold Simulation - Future Planning
**What It Does**: Compare "sell today" vs "hold for X years"

**Key Changes**:
- ✅ Can now model up to **50 years** (was limited to 10)
- ✅ Your assumptions **automatically save** between visits
- ✅ "Reset to defaults" button to restore original values

**How to Use**:
1. Adjust simulation assumptions (holding period, appreciation %, rent growth, etc.)
2. See side-by-side comparison of:
   - **Sell Today**: Current proceeds
   - **Hold for X Years**: Projected future value
3. Compare net proceeds from both scenarios
4. Your assumptions persist when you revisit

---

## Common Questions

**Q: Why can't I edit all property details in the quick modal?**
A: The new Edit modal now has everything! It's the same form as adding a property.

**Q: What does XIRR actually measure?**
A: The annualized compound growth rate of your property investment. It answers: "What annual % return am I getting?"

**Q: My simulation assumptions disappeared after refresh!**
A: They're now saved automatically! Refresh and they'll be back. Use "Reset to defaults" if needed.

**Q: Can I model 30-year holding periods?**
A: Yes! Max is now 50 years (was 10 before).

**Q: Does XIRR include rental income?**
A: No, our XIRR shows appreciation-only. Full XIRR with rentals would be higher.

---

## Pro Tips

1. **Use Edit Property** to update all details when property circumstances change
2. **Track XIRR** over time to monitor your investment performance
3. **Run Multiple Scenarios** - Simulation assumptions persist, so test different holding periods
4. **Compare Returns** - What's your XIRR vs. fixed deposits or stocks?
5. **Plan Ahead** - Use 20-30 year scenarios for retirement planning

---

## Need More Info?

- **Edit Modal**: Works exactly like "Add Property" form
- **XIRR Details**: See `REAL_ESTATE_XIRR_EXPLANATION.md`
- **Full Guide**: See `PROPERTY_DETAIL_PAGE_ENHANCEMENTS.md`

---

## File Locations

| Feature | File |
|---------|------|
| Edit Modal | `src/components/real-estate/EditPropertyModal.tsx` |
| Simulation | `src/components/real-estate/SellHoldSimulation.tsx` |
| Property Detail | `src/app/portfolio/real-estate/[propertyId]/page.tsx` |
