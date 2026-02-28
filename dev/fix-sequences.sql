-- Fix PostgreSQL sequences that are out of sync
-- This happens when data is seeded or bulk imported

-- Fix Options sequence
SELECT setval(pg_get_serial_sequence('"Options"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Options"), 1), 
    true);

-- Fix Questions sequence (in case it has the same issue)
SELECT setval(pg_get_serial_sequence('"Questions"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Questions"), 1), 
    true);

-- Fix other tables that might have the same issue
SELECT setval(pg_get_serial_sequence('"Topics"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Topics"), 1), 
    true);

SELECT setval(pg_get_serial_sequence('"Subjects"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Subjects"), 1), 
    true);

SELECT setval(pg_get_serial_sequence('"Courses"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Courses"), 1), 
    true);

SELECT setval(pg_get_serial_sequence('"Departments"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Departments"), 1), 
    true);

SELECT setval(pg_get_serial_sequence('"Users"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Users"), 1), 
    true);

SELECT setval(pg_get_serial_sequence('"Tests"', 'Id'), 
    COALESCE((SELECT MAX("Id") FROM "Tests"), 1), 
    true);

-- Display results
SELECT 'Options' as table_name, last_value as current_sequence_value FROM "Options_Id_seq"
UNION ALL
SELECT 'Questions', last_value FROM "Questions_Id_seq"
UNION ALL
SELECT 'Topics', last_value FROM "Topics_Id_seq"
UNION ALL
SELECT 'Subjects', last_value FROM "Subjects_Id_seq"
UNION ALL
SELECT 'Courses', last_value FROM "Courses_Id_seq"
UNION ALL
SELECT 'Departments', last_value FROM "Departments_Id_seq"
UNION ALL
SELECT 'Users', last_value FROM "Users_Id_seq"
UNION ALL
SELECT 'Tests', last_value FROM "Tests_Id_seq";
