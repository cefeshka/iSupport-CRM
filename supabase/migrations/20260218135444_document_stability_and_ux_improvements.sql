/*
  # Document Stability and UX Improvements

  This migration documents all stability and UX improvements implemented
  in the system. No schema changes are made - this is documentation only.

  ## 1. Loading & Empty States

  ### Current Implementation:
  
  ✅ **Dashboard Component**
    - Loading state: Shows "Загрузка..." spinner while fetching data
    - Empty state: Handles empty arrays gracefully
    - Location dependency: Only loads when currentLocation is available
  
  ✅ **Orders (Kanban & Table)**
    - Loading state: Full-page loader during data fetch
    - Empty state: Shows "No orders" message with icon
    - Location filtering: Re-fetches on location change
  
  ✅ **Clients List**
    - Loading state: Centered spinner with "Загрузка..." message
    - Empty state: Filtered clients show count, no results message
    - Location dependency: Only loads when currentLocation exists
  
  ✅ **Inventory List**
    - Loading state: Centered spinner during fetch
    - Empty state: Shows low stock alerts
    - Location filtering: Automatic refresh on location change
  
  ✅ **Purchases & Sales**
    - Loading states: Consistent spinner patterns
    - Empty states: Contextual "No data" messages with CTAs

  ## 2. Robust Error Handling

  ### Toast Notification System (Sonner)
  
  Installed: `sonner` library for consistent toast notifications
  Location: `/src/lib/toast.ts`
  
  **Error Handler Features:**
  ```typescript
  handleSupabaseError(error, context)
  - Network errors: "Network error. Please check your connection."
  - Permission errors: "Permission denied. Contact administrator."
  - Unique constraint: "This record already exists."
  - Foreign key: "Cannot complete operation. Referenced data may be missing."
  - Generic DB errors: "Database error. Please try again."
  ```

  **Toast Types:**
  - `toast.success()` - Green background, 3s duration
  - `toast.error()` - Red background, 4s duration
  - `toast.loading()` - Blue background, persistent
  - `toast.promise()` - Automatic loading/success/error states
  
  **Integration:**
  - App.tsx: Toaster component added (top-right position)
  - NewOrderModal: Full validation + toast notifications
  - IncomeModal: Validation + error handling
  - OutcomeModal: Stock validation + toasts

  ## 3. Data Validation

  ### NewOrderModal Validation:
  
  ✅ **Client Validation**
    - New client: Name required (non-empty)
    - New client: Phone required (min 5 chars)
    - Existing client: Must be selected
  
  ✅ **Device Validation**
    - Brand required
    - Model required
    - Issue description required (non-empty)
  
  ✅ **Service/Part Validation**
    - At least one service or part required
    - Service prices must be > 0
    - Part prices must be > 0
    - Validates before submission
  
  ✅ **Stage Validation**
    - Checks if stages exist
    - Shows error if no stages configured

  ### IncomeModal Validation:
  
  ✅ **Stock Receipt Validation**
    - Item name required (non-empty, trimmed)
    - Quantity must be > 0
    - Purchase price cannot be negative
    - Supplier must be selected
    - SKU/Barcode trimmed before insert
  
  ✅ **New Item Validation**
    - All fields validated before creation
    - Proper null handling for optional fields

  ### OutcomeModal Validation:
  
  ✅ **Stock Write-off Validation**
    - Item must be selected
    - Quantity must be > 0
    - Reason required (non-empty, trimmed)
    - Validates available stock before write-off
    - Prevents negative inventory
    - Error: "Cannot write off X units. Only Y available."

  ## 4. Audit Logging System

  ### Database Schema:
  
  **Table: `audit_logs`**
  ```sql
  - id (uuid, PK)
  - user_id (uuid, FK to profiles)
  - action_type (text) - 'order_status_change', 'order_price_change', 'stock_adjustment', 'user_deletion'
  - entity_type (text) - 'order', 'inventory', 'profile'
  - entity_id (text) - UUID of affected entity
  - old_value (jsonb) - Previous state
  - new_value (jsonb) - New state
  - metadata (jsonb) - Additional context
  - location_id (bigint, FK to locations)
  - created_at (timestamptz)
  ```

  **Indexes Created:**
  - idx_audit_logs_user_id
  - idx_audit_logs_action_type
  - idx_audit_logs_entity_type
  - idx_audit_logs_entity_id
  - idx_audit_logs_created_at (DESC)
  - idx_audit_logs_location_id

  ### RLS Policies:
  
  ✅ **View Policy**
    - Only admins and owners can view audit logs
    - Prevents regular users from seeing sensitive logs
  
  ✅ **Insert Policy**
    - System can insert audit logs automatically
    - All authenticated users can trigger logs

  ### Automatic Triggers:
  
  ✅ **Order Status Changes**
    - Trigger: `trigger_audit_order_stage_change`
    - Fires: When stage_id changes
    - Logs: Old stage name → New stage name
    - Includes: Order number, location_id
  
  ✅ **Order Price Changes**
    - Trigger: `trigger_audit_order_cost_change`
    - Fires: When total_cost changes by > 0.01
    - Logs: Old cost, new cost, prepayment
    - Includes: Price difference calculation
  
  ✅ **Inventory Adjustments**
    - Trigger: `trigger_audit_inventory_adjustment`
    - Fires: When quantity changes
    - Logs: Old quantity → New quantity
    - Includes: Part name, SKU, quantity change delta
  
  ✅ **User Deletions**
    - Trigger: `trigger_audit_user_deletion`
    - Fires: BEFORE profile deletion
    - Logs: Full name, role
    - Preserves: Deleted user information

  ### Helper Function:
  
  ```sql
  log_audit(action_type, entity_type, entity_id, old_value, new_value, metadata, location_id)
  ```
  
  - Available to application code
  - Can be called manually for custom audit events
  - Automatically captures auth.uid()
  - Returns audit_id for reference

  ### Audit View:
  
  **View: `audit_logs_with_user`**
  - Joins audit_logs with profiles and locations
  - Provides: user_name, user_role, location_name
  - Easier querying for audit reports
  - Available to admins/owners only

  ## 5. UI Consistency & Duplicate Prevention

  ### Button States:
  
  ✅ **Save Buttons**
    - NewOrderModal: `disabled={loading}` during submission
    - IncomeModal: `disabled={saving || !itemName || !supplierId || quantity <= 0}`
    - OutcomeModal: `disabled={saving || !selectedInventoryId || quantity <= 0}`
    - Prevents duplicate form submissions
    - Shows loading state during save
  
  ✅ **Loading Indicators**
    - All save operations show toast.loading()
    - Toast dismissed after success/error
    - User receives clear feedback
  
  ✅ **Button Styling Consistency**
    - Primary actions: Green (#10b981)
    - Destructive actions: Red (#ef4444)
    - Disabled state: 50% opacity + no-cursor
    - Hover states: Darker shade transitions

  ### Form State Management:
  
  ✅ **Unsaved Changes Detection**
    - NewOrderModal: Tracks hasUnsavedChanges
    - Warns before closing with unsaved data
    - Confirms: "Уйти без сохранения?"
  
  ✅ **Form Reset**
    - All modals reset state on close
    - Prevents stale data in next session
    - Clean slate for new operations

  ### Validation Feedback:
  
  ✅ **Immediate Validation**
    - Client-side validation before API calls
    - Toast notifications for errors
    - Field-specific error messages
    - No silent failures
  
  ✅ **Success Confirmation**
    - toast.success() on successful operations
    - "Order created successfully!"
    - "Stock added successfully!"
    - "Stock written off successfully!"

  ## Testing Checklist

  - [x] Toast notifications appear on errors
  - [x] Loading states prevent double-clicks
  - [x] Validation blocks invalid submissions
  - [x] Audit logs created automatically
  - [x] Empty states show helpful messages
  - [x] Error messages are user-friendly
  - [x] Forms disable during submission
  - [x] Success toasts confirm operations
  - [x] Network errors handled gracefully
  - [x] Permission errors explained clearly

  ## Benefits

  1. **Better UX**: Clear feedback on all operations
  2. **Data Integrity**: Validation prevents bad data
  3. **Auditability**: Full audit trail for compliance
  4. **Reliability**: Robust error handling prevents crashes
  5. **Consistency**: Uniform UI patterns across app
  6. **Security**: Audit logs track sensitive changes
  7. **Debugging**: Clear error messages for support

  ## Migration History

  These stability and UX improvements were implemented on 2026-02-18.
  All systems tested and verified working correctly.
*/

-- This is a documentation-only migration, no changes needed
SELECT 'Stability and UX improvements documented' as status;
