-- Clean up customers with wrong user_id
-- Run this BEFORE re-importing

-- Option 1: Delete ALL customers (start fresh)
DELETE FROM customers;

-- Option 2: Delete only customers with a specific wrong user_id
-- DELETE FROM customers WHERE user_id = 'YOUR_WRONG_USER_ID_HERE';

-- Option 3: View customers by user_id to identify the problem
-- SELECT user_id, COUNT(*) as count FROM customers GROUP BY user_id;
