# Testing the AI Draft Report Modal

## Quick Start

### 1. Start Development Server
```bash
cd /Users/arvind/Documents/Hackathons/Cloud9\ x\ JetBrains\ 2026/synapse
npm run dev
```

### 2. Navigate to Draft
Open: `http://localhost:3000/draft/new`

### 3. Complete a Draft
1. Select your side (Blue or Red)
2. Complete all 20 turns:
   - Bans Phase 1: 6 turns (3 per side)
   - Picks Phase 1: 6 turns (3 per side)
   - Bans Phase 2: 4 turns (2 per side)
   - Picks Phase 2: 4 turns (2 per side)

### 4. Watch the Magic
- **Turn 20 completion** → Modal auto-triggers
- **Loading state** → 2-3 second AI animation
- **Report appears** → Smooth fade-in
- **Scroll through** → Staggered section animations

## Test Scenarios

### Scenario 1: Auto-Trigger on Completion
**Steps:**
1. Start new draft
2. Complete all 20 turns
3. Verify modal appears automatically

**Expected:**
- Loading state shows immediately
- "ANALYZING DRAFT..." text visible
- Rotating AI brain icon
- Pulsing dots
- After 2-3s, report appears

### Scenario 2: Report Content Validation
**Steps:**
1. Complete draft
2. Wait for report
3. Check all sections present

**Expected Sections:**
✅ Draft Summary (Win %, Grade, Strengths)
✅ Strategic Analysis (Comp, Win Conditions, Power Spikes)
✅ Matchup Insights (5 lanes, jungle, objectives)
✅ Recommendations (Early/Mid/Late game)

### Scenario 3: Close and Reopen
**Steps:**
1. View report
2. Close with X button
3. Click "View AI Draft Report" in sidebar

**Expected:**
- Modal closes smoothly
- Button appears in sidebar
- Clicking button reopens same report
- No loading state on reopen

### Scenario 4: Keyboard Navigation
**Steps:**
1. Open report
2. Press ESC key

**Expected:**
- Modal closes
- Returns to draft view

### Scenario 5: Responsive Design
**Steps:**
1. Open report
2. Resize browser window

**Expected:**
- Modal adapts to screen size
- Content remains readable
- Scrolling works properly

## Validation Checklist

### Visual Design
- [ ] Dark gaming aesthetic
- [ ] Cyan/blue accents
- [ ] Gradient backgrounds
- [ ] Proper shadows and borders
- [ ] Icons render correctly
- [ ] Text is readable

### Animations
- [ ] Backdrop fades in smoothly
- [ ] Modal scales and fades
- [ ] Sections slide in with stagger
- [ ] Loading spinner rotates
- [ ] No janky transitions

### Functionality
- [ ] Auto-triggers on turn 20
- [ ] Loading state shows
- [ ] Report data loads
- [ ] Close button works
- [ ] ESC key closes
- [ ] Backdrop click closes (after loading)
- [ ] Sidebar button appears
- [ ] Sidebar button reopens

### Content
- [ ] Win probability displays
- [ ] Draft grade shows
- [ ] Key strengths listed
- [ ] Win conditions present
- [ ] Lane matchups shown
- [ ] Recommendations present
- [ ] All sections scrollable

### Edge Cases
- [ ] Modal doesn't open during draft
- [ ] Can't close during loading
- [ ] Report persists on reopen
- [ ] Works on mobile screens
- [ ] Works with different draft outcomes

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Checks

### Load Times
- Initial modal render: < 100ms
- Loading state duration: 2-3s
- Report transition: < 300ms
- Scroll performance: 60fps

### Network
- API call completes: < 500ms
- Fallback to mock data on error
- No memory leaks on open/close

## Common Issues & Fixes

### Issue: Modal doesn't appear
**Check:**
- Draft is actually complete (turn 20)
- `isComplete` state is true
- `showReportModal` state is true

**Fix:**
```typescript
// In browser console:
useDraftStore.getState().setShowReportModal(true)
```

### Issue: Loading forever
**Check:**
- API endpoint responding
- No network errors in console

**Fix:**
- Modal falls back to mock data after timeout
- Check `/api/draft/[id]/report` route

### Issue: Animations not smooth
**Check:**
- GPU acceleration enabled
- No browser extensions interfering
- Hardware acceleration on

**Fix:**
- Clear browser cache
- Disable extensions
- Update browser

### Issue: Content not scrolling
**Check:**
- Parent container overflow
- Height constraints

**Fix:**
- Modal has `max-h-[90vh]`
- Inner content has `overflow-y-auto`

## Debug Commands

### Open Modal Manually
```typescript
// In browser console:
const store = useDraftStore.getState()
store.setShowReportModal(true)
```

### Check Draft State
```typescript
// In browser console:
const store = useDraftStore.getState()
console.log({
  isComplete: store.isComplete,
  currentTurn: store.currentTurn,
  showReportModal: store.showReportModal,
})
```

### Force Report Generation
```typescript
// In browser console:
fetch('/api/draft/test-id/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blue: { picks: [], bans: [] },
    red: { picks: [], bans: [] },
    userSide: 'blue'
  })
}).then(r => r.json()).then(console.log)
```

## Accessibility Testing

### Keyboard Navigation
1. Tab through all interactive elements
2. Press ESC to close
3. Verify focus management

### Screen Readers
1. Use VoiceOver (Mac) or NVDA (Windows)
2. Navigate through report sections
3. Verify all content is announced

### Color Contrast
1. Use browser DevTools contrast checker
2. Verify text meets WCAG AA (4.5:1)
3. Check large text meets 3:1

## Video Recording

For demo purposes, record:
1. Complete draft progression (timelapse)
2. Modal auto-trigger moment
3. Loading animation
4. Full report scroll-through
5. Close and reopen
6. Different draft outcomes

## Screenshots to Capture

1. Loading state
2. Report summary section
3. Strategic analysis section
4. Matchup insights section
5. Recommendations section
6. Sidebar with "View Report" button
7. Mobile view
8. Different draft grades (S/A/B/C/D)

## Success Criteria

The feature is working correctly when:
✅ Modal auto-triggers at turn 20
✅ Loading animation plays smoothly
✅ Report data loads and displays
✅ All sections render correctly
✅ Animations are smooth and timed
✅ Close/reopen works properly
✅ ESC key closes modal
✅ Content is scrollable
✅ Works on mobile devices
✅ No console errors
✅ Sidebar button appears

---

**Happy Testing!** 🎮

If you encounter any issues, check the console for errors and refer to the debug commands above.
