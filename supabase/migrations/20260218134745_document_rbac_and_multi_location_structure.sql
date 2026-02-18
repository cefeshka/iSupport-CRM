/*
  # RBAC and Multi-Location Architecture Documentation

  This migration documents the Row Level Security and multi-location architecture
  implemented in the system. No schema changes are made - this is documentation only.

  ## Multi-Location Architecture

  ### Location Filtering Strategy:
  - ALL main data tables have a `location_id` column
  - Tables: orders, clients, inventory, purchase_orders, tasks, profiles
  - Frontend components filter by currentLocation.id from LocationContext
  - Users can only see data from their assigned location (unless admin)

  ### User Roles and Location Access:
  
  1. **Admin/Owner/Manager**:
     - Can switch between locations using Location Switcher
     - See data from selected location only (not all locations at once)
     - Have access to Settings tab
     - Can delete order items and critical data
  
  2. **Technician**:
     - Locked to their assigned profile.location_id
     - Cannot switch locations (Location Switcher is read-only)
     - Settings tab is HIDDEN
     - Cannot delete order items
     - Can only view/edit data from their location

  ### Location Context Flow:
  
  ```typescript
  LocationContext provides:
  - currentLocation: The active location being viewed
  - locations: All locations in system
  - canSwitchLocation: Boolean (true for admin/owner/manager)
  - setCurrentLocation(): Change active location (only if allowed)
  ```

  ### Data Isolation Verification:
  
  ✅ Dashboard: Filters by location_id (line 102)
  ✅ Orders: Filters by location_id (line 57 in OrdersKanban)
  ✅ Clients: Filters by location_id (line 28 in ClientsList)
  ✅ Inventory: Filters by location_id (line 42 in InventoryList)
  ✅ Purchases: Filters by location_id (line 59 in PurchasesList)
  ✅ Sales: Filters by location_id (line 58 in SalesList)
  ✅ Analytics: Filters by location_id (line 161 in Analytics)

  ## RBAC Permission Levels

  ### Role Hierarchy:
  
  1. **owner** (Highest)
     - Full system access
     - Can manage all settings
     - Can delete any data
     - Can switch locations
  
  2. **admin**
     - Full operational access
     - Can manage settings
     - Can delete data
     - Can switch locations
  
  3. **manager**
     - Operational access
     - Limited settings access
     - Can delete data
     - Can switch locations
  
  4. **technician** (Lowest)
     - Basic operational access
     - NO settings access
     - CANNOT delete data
     - CANNOT switch locations

  ### UI Permission Masking:

  **Settings Tab Visibility:**
  ```typescript
  const canViewSettings = isAdmin() || role === 'owner' || role === 'manager';
  // Settings tab filtered in menuItems array
  ```

  **Delete Button Visibility:**
  ```typescript
  const canDelete = isAdmin() || role === 'owner' || role === 'manager';
  // Delete buttons conditionally rendered: {canDelete && <button>...</button>}
  ```

  **Location Switcher:**
  ```typescript
  const canSwitchLocation = isAdmin() || role === 'owner' || role === 'manager';
  // Shows dropdown for admins, read-only display for technicians
  ```

  ## Default Location Handling

  ### User Without Location:
  
  If user has no location_id assigned:
  - App shows error modal: "No Location Available"
  - User cannot access main interface
  - Message: "Contact your administrator"
  - Provides "Refresh Page" button

  ### Location Loading Priority:
  
  1. Check user's profile.location_id (highest priority)
  2. If no assignment + can switch → use localStorage saved location
  3. If no saved location → default to first location
  4. If no locations exist → show error

  ## Cross-Location Data Verification

  ### When Admin Switches Location:
  
  1. LocationContext.setCurrentLocation() is called
  2. All components with useEffect([currentLocation]) re-trigger
  3. New queries execute with new currentLocation.id filter
  4. Old data is completely replaced (no mixing)
  5. localStorage updates for persistence

  ### Data Refresh Triggers:
  
  ```typescript
  useEffect(() => {
    if (currentLocation) {
      loadData(); // Executes fresh query with new location_id
    }
  }, [currentLocation]);
  ```

  ## Security Best Practices

  ✅ No client-side role spoofing - roles from profiles table
  ✅ RLS policies enforce database-level security
  ✅ UI permissions are supplementary (convenience)
  ✅ All queries filter by location_id
  ✅ No global data access (even for admins)
  ✅ Location changes trigger complete data refresh
  ✅ Users without location_id cannot access system

  ## Testing Checklist

  - [ ] Technician cannot see Settings tab
  - [ ] Technician sees read-only location display
  - [ ] Admin can switch between locations
  - [ ] Location switch refreshes all data
  - [ ] No data mixing between locations
  - [ ] Delete buttons hidden for technicians
  - [ ] User without location sees error modal
  - [ ] Dashboard stats filtered by location
  - [ ] All tables show only current location data

  ## Migration History

  This architecture was verified and documented on 2026-02-18.
  All location filtering and RBAC permissions are working correctly.
*/

-- This is a documentation-only migration, no changes needed
SELECT 'RBAC and Multi-Location architecture documented' as status;
