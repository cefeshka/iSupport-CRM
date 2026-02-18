# Technician Motivation Widget - Implementation Documentation

## Overview

The Technician Motivation Widget is a dashboard component that displays monthly performance metrics and bonus calculations for technicians. It provides real-time feedback on work progress and motivates staff by showing how close they are to earning bonuses.

## Location

**Component:** `src/components/Dashboard/TechnicianPerformance.tsx`
**Integration:** `src/components/Dashboard/Dashboard.tsx` (line 281)

## Features

### 1. Role-Based Visibility
- **Only visible to users with role = 'technician'**
- Returns `null` for all other roles (admin, owner, etc.)
- No rendering overhead for non-technician users

### 2. Data Source
- **Function:** `get_technician_performance(target_month)`
- **Parameters:** Current month timestamp
- **Returns:**
  - `total_labor_revenue` - Total work completed this month
  - `quota` - Monthly target (default: 6000€)
  - `bonus_amount` - Calculated bonus (25% of excess)
  - `percent_complete` - Progress percentage
  - `remaining_to_plan` - Amount needed to reach target
  - `plan_reached` - Boolean flag

### 3. Visual States

#### State 1: Goal Not Reached (Blue Theme)
- **Progress Bar:** Blue gradient (0-100%)
- **Display:**
  - "Выполнено работ: {current_labor_sum}€"
  - "До бонуса осталось: {needed_for_plan}€"
  - Motivational text: "Давай еще чуть и тебе будет начислятся бонус! 🚀"
- **Icon:** Target icon in blue
- **Badge:** Blue with percentage

#### State 2: Goal Reached (Green Theme)
- **Progress Bar:** Green gradient (100%+)
- **Display:**
  - "План выполнен! ✅"
  - "Общая работа: {current_labor_sum}€"
  - Highlighted bonus box: "💰 Ваш бонус: {bonus_amount}€"
  - Calculation details: "Сумма сверх плана: {excess}€ × 25%"
- **Icon:** Award icon in green
- **Badge:** Green with percentage

### 4. Auto-Refresh Mechanisms

#### Real-Time Subscriptions
```typescript
// Listens to order updates for the current technician
supabase
  .channel('technician_performance_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `assigned_to=eq.${profile.id}`
  })
```

**When it refreshes:**
- Automatically when assigned orders are updated
- When stage changes (especially to "Закрыт"/Closed)
- When order costs are modified
- On component mount
- When location changes
- When refreshTrigger prop changes

#### Manual Refresh
The Dashboard can trigger a refresh via the `refreshTrigger` prop:
```typescript
<TechnicianPerformance refreshTrigger={refreshTrigger} />
```

### 5. Error Handling
- Uses `handleSupabaseError()` utility
- Toast notifications for:
  - Network errors
  - Permission issues
  - Database errors
- Graceful fallback to loading state

### 6. Loading State
```tsx
<div className="bg-white border border-neutral-200 rounded-lg p-4">
  <div className="text-sm text-neutral-500">Загрузка...</div>
</div>
```

## Design Specifications

### Colors
- **Not Reached:** Blue (#3b82f6) to Cyan (#06b6d4) gradient
- **Reached:** Green (#10b981) to Emerald (#059669) gradient
- **Background (Not Reached):** from-blue-50 to-cyan-50
- **Background (Reached):** from-green-50 to-emerald-50
- **Border (Not Reached):** border-blue-200
- **Border (Reached):** border-green-300

### Typography
- **Title:** "Моя мотивация" (14px, bold)
- **Month:** Russian locale, long format
- **Numbers:** 2 decimal places for euros
- **Progress:** Integer percentage

### Layout
- **Container:** Rounded-xl with gradient background
- **Padding:** 16px (p-4)
- **Progress Bar:** 12px height, rounded-full
- **Bonus Box:** Centered, white text on green gradient
- **Shadow:** shadow-sm on container, shadow-lg on bonus box

## Integration Example

```tsx
import TechnicianPerformance from './TechnicianPerformance';

function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div>
      <TechnicianPerformance refreshTrigger={refreshTrigger} />
    </div>
  );
}
```

## Database Requirements

### Function: `get_technician_performance`
Must exist in Supabase with signature:
```sql
get_technician_performance(target_month timestamptz)
```

### Expected Return Fields
```typescript
{
  total_labor_revenue: number;
  quota: number;
  bonus_amount: number;
  percent_complete: number;
  remaining_to_plan: number;
  plan_reached: boolean;
}
```

## Permissions

### RLS Requirements
- Technicians must be able to call `get_technician_performance`
- Function should filter to auth.uid() automatically
- Should only return data for the authenticated user

## Testing Checklist

- [x] Visible only to technicians
- [x] Hidden from admins/owners/other roles
- [x] Shows blue state when below target
- [x] Shows green state when target reached
- [x] Progress bar animates smoothly
- [x] Real-time updates on order changes
- [x] Loading state displays correctly
- [x] Error handling with toast notifications
- [x] EUR symbol formatting consistent
- [x] Russian locale for dates
- [x] Responsive design
- [x] Auto-refresh on order completion

## Future Enhancements

1. **Historical View:** Show past months' performance
2. **Goal Setting:** Allow custom quota per technician
3. **Leaderboard:** Compare performance with team
4. **Achievements:** Badges for milestones
5. **Export:** Download monthly reports
6. **Push Notifications:** Alert when goal is reached

## Troubleshooting

### Widget not showing?
- Check user role is 'technician'
- Verify `get_technician_performance` function exists
- Check RLS policies allow function execution

### Data not refreshing?
- Verify real-time subscriptions are enabled
- Check network tab for websocket connection
- Ensure assigned_to matches profile.id

### Wrong data displayed?
- Verify function filters by auth.uid()
- Check date range in function logic
- Confirm order items have correct profit calculations

## Support

For issues or questions:
1. Check console for errors
2. Verify database function exists
3. Test with Supabase SQL editor
4. Check audit logs for permission issues
