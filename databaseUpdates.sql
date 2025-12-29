-- Database Schema Updates for User Registration & Approval System
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to staff table (without default initially)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('admin', 'staff'));

-- Step 2: Make microsoft_user_id nullable (will be filled at first login)
ALTER TABLE staff
ALTER COLUMN microsoft_user_id DROP NOT NULL;

-- Step 3: Update existing staff records to 'approved' status FIRST
UPDATE staff
SET status = 'approved', role = 'staff'
WHERE status IS NULL;

-- Step 4: Now set defaults for future records
ALTER TABLE staff
ALTER COLUMN status SET DEFAULT 'pending',
ALTER COLUMN role SET DEFAULT 'staff';

-- Step 4: Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- Step 5: Create a function to auto-generate next staff ID
CREATE OR REPLACE FUNCTION get_next_staff_id()
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    last_number INTEGER;
    next_number INTEGER;
    next_id TEXT;
BEGIN
    -- Get the last staff_id that matches pattern 'S###'
    SELECT staff_id INTO last_id
    FROM staff
    WHERE staff_id ~ '^S[0-9]+$'
    ORDER BY CAST(SUBSTRING(staff_id FROM 2) AS INTEGER) DESC
    LIMIT 1;

    -- If no staff_id found, start with S001
    IF last_id IS NULL THEN
        RETURN 'S001';
    END IF;

    -- Extract number from last_id (e.g., 'S001' -> 1)
    last_number := CAST(SUBSTRING(last_id FROM 2) AS INTEGER);
    next_number := last_number + 1;

    -- Format as S### (e.g., S002, S010, S100)
    next_id := 'S' || LPAD(next_number::TEXT, 3, '0');

    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN staff.status IS 'Registration status: pending, approved, or rejected';
COMMENT ON COLUMN staff.role IS 'User role: admin or staff';
COMMENT ON COLUMN staff.microsoft_user_id IS 'Azure AD Object ID (OID), populated on first login';

-- Verification queries (optional - run these to check)
-- SELECT * FROM staff LIMIT 5;
-- SELECT get_next_staff_id();
