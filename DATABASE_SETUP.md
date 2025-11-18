# Database Setup Guide

## Quick Setup for Daily Plucking Feature

To see the dynamic charts and data in action, you need to create the `daily_plucking` table in your Supabase database.

### Option 1: Copy-Paste SQL (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to "SQL Editor"
3. Create a new query
4. Copy and paste the content from `sql/create_daily_plucking_table.sql`
5. Run the query

### Option 2: Step-by-Step Manual Setup
1. In Supabase, go to "Table Editor"
2. Create a new table called `daily_plucking`
3. Add the following columns:
   - `id` (UUID, Primary Key)
   - `worker_id` (UUID, Foreign Key to workers)
   - `plantation_id` (UUID, Foreign Key to plantations)
   - `date` (Date)
   - `kg_plucked` (Decimal)
   - `rate_per_kg` (Decimal) - Default LKR 20-30 per kg
   - `wage_earned` (Decimal)
   - `total_income` (Decimal)
   - `notes` (Text, Optional)
   - `created_at` (Timestamp)
   - `updated_at` (Timestamp)

### Currency Configuration
The system is fully configured for **Sri Lankan Rupees (LKR - රු)**:
- All currency displays use රු symbol
- Sample rates set to LKR 20-30 per kg (realistic Sri Lankan tea rates)
- Salary fields default to LKR
- Charts and tooltips show LKR formatting

### What This Enables:
- ✅ Real-time harvest tracking in LKR
- ✅ Dynamic charts with LKR currency
- ✅ Analytics with actual Sri Lankan tea rates
- ✅ Financial calculations in rupees
- ✅ Worker performance insights

### Graceful Degradation
If the table doesn't exist yet, the system will:
- Show empty states instead of errors
- Still display plantation and worker management
- Gradually populate charts as you add data

### Next Steps:
1. Add some workers via `/dashboard/workers`
2. Add plantations via `/dashboard/plantations`
3. Start recording daily plucking via `/dashboard/daily-plucking` (rates in LKR)
4. Watch the analytics come alive! 📊

### Sample Data
The SQL script includes sample data with realistic LKR rates (20-30 rupees per kg) to help you see the charts immediately.