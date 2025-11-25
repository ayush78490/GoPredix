# Supabase Database Setup Guide

## Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `sxctlynwszsnhhhmzbcs`
3. Click on "SQL Editor" in the left sidebar

## Step 2: Run the Schema SQL

1. Click "New Query"
2. Copy the entire contents of `supabase-schema.sql`
3. Paste into the SQL editor
4. Click "Run" or press `Ctrl+Enter`

## Step 3: Verify Table Creation

1. Go to "Table Editor" in the left sidebar
2. You should see a new table called `user_profiles`
3. Click on it to verify the columns:
   - id (UUID, Primary Key)
   - wallet_address (TEXT, Unique)
   - twitter_id (TEXT, Unique)
   - twitter_username (TEXT)
   - twitter_name (TEXT)
   - twitter_avatar_url (TEXT)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

## Step 4: Test the Table

Run this test query in SQL Editor:

```sql
-- Insert a test record
INSERT INTO user_profiles (wallet_address, twitter_username, twitter_name)
VALUES ('0x1234567890123456789012345678901234567890', 'testuser', 'Test User');

-- Query the record
SELECT * FROM user_profiles;

-- Delete the test record
DELETE FROM user_profiles WHERE wallet_address = '0x1234567890123456789012345678901234567890';
```

## Step 5: Verify RLS Policies

1. Go to "Authentication" → "Policies"
2. Select `user_profiles` table
3. You should see 3 policies:
   - Allow public read access
   - Allow insert for authenticated users
   - Allow update for authenticated users

## Troubleshooting

### If table already exists:
```sql
DROP TABLE IF EXISTS user_profiles CASCADE;
-- Then run the schema again
```

### If you get permission errors:
- Make sure you're using the project owner account
- Check that RLS is properly configured

## Next Steps

After setting up the database:
1. The backend API routes will automatically work
2. Users can link their X accounts to wallets
3. Data will be stored and retrieved from Supabase
