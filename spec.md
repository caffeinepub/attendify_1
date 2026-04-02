# Attendify

## Current State

Admin portal has an Employees tab showing all employees. Each employee row has:
- Credentials button
- Edit button
- Deactivate button (only shown when `isActive = true`)

Backend has `deleteEmployee` which sets `isActive = false`. There is no `reactivateEmployee` function. Inactive employees are shown in the same table but have no action buttons.

The employees list shows ALL employees (including admin and gatekeeper roles) via `getAllEmployees`.

## Requested Changes (Diff)

### Add
- `reactivateEmployee(token, id)` function in backend that sets `isActive = true`
- Filter tabs in the Employees tab: **All** | **Active** | **Inactive**
- **Reactivate** button for each inactive employee row
- `reactivateEmployee` declaration in `backend.d.ts`, `backend.ts`, `backend.did.js`, and `main.did`

### Modify
- AdminPortal Employees tab: add filter state and tabs (All/Active/Inactive), show Deactivate button for active employees, show Reactivate button for inactive employees
- `handleDeactivate` already works; add `handleReactivate` handler

### Remove
- Nothing removed

## Implementation Plan

1. Add `reactivateEmployee` to `src/backend/main.mo` — same logic as deleteEmployee but sets `isActive = true`
2. Update `main.did` to include `reactivateEmployee` function signature
3. Update `src/frontend/src/backend.d.ts` to add `reactivateEmployee` method
4. Update `src/frontend/src/backend.ts` to add `reactivateEmployee` wrapper
5. Update `src/frontend/src/declarations/backend.did.js` to declare `reactivateEmployee`
6. Update `src/frontend/src/pages/AdminPortal.tsx`:
   - Add `empFilter` state: 'all' | 'active' | 'inactive'
   - Add filter tabs UI (All / Active / Inactive) above the employee table
   - Add `handleReactivate` function
   - Show Reactivate button for inactive employees
   - Filter displayed employees based on `empFilter`
