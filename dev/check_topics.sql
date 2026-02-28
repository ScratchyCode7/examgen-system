-- DEV ONLY: Diagnostic SQL queries to inspect Course/Subject/Topic/Question counts
-- Intended for use with psql against dev databases only. Do NOT run on production.

-- Check if courses exist
SELECT * FROM "Courses" LIMIT 5;

-- Check if subjects exist for each course
SELECT c."Name" as CourseName, s."Name" as SubjectName, COUNT(t."Id") as TopicCount
FROM "Courses" c
LEFT JOIN "Subjects" s ON c."Id" = s."CourseId"
LEFT JOIN "Topics" t ON s."Id" = t."SubjectId"
GROUP BY c."Id", c."Name", s."Id", s."Name"
ORDER BY c."Name";

-- Check questions for topics
SELECT 
  c."Name" as CourseName,
  s."Name" as SubjectName, 
  t."Title" as TopicName,
  COUNT(q."Id") as QuestionCount
FROM "Courses" c
LEFT JOIN "Subjects" s ON c."Id" = s."CourseId"
LEFT JOIN "Topics" t ON s."Id" = t."SubjectId"
LEFT JOIN "Questions" q ON t."Id" = q."TopicId"
GROUP BY c."Id", c."Name", s."Id", s."Name", t."Id", t."Title"
ORDER BY c."Name", s."Name", t."Title";
