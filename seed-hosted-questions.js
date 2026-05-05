#!/usr/bin/env node

/*
 * Seed exactly N mock questions through hosted API (no direct DB writes).
 *
 * Usage:
 *   node seed-hosted-questions.js \
 *     --baseUrl "https://your-hosted-api.example.com" \
 *     --adminToken "<JWT>" \
 *     --courseCode "CS201" \
 *     --departmentCode "CCS" \
 *     --subjectName "Social and Professional Ethics" \
 *     --lessonQuery "Lesson 1" \
 *     --totalQuestions 300
 *
 * Optional:
 *   --courseId 123
 *   --concurrency 3
 */

const DEFAULTS = {
  baseUrl: process.env.BASE_URL || "http://localhost:5012",
  adminToken: process.env.ADMIN_TOKEN || "",
  courseCode: process.env.COURSE_CODE || "CS201",
  departmentCode: process.env.DEPARTMENT_CODE || "CCS",
  subjectName: process.env.SUBJECT_NAME || "Social and Professional Ethics",
  lessonQuery: process.env.LESSON_QUERY || "Lesson 1",
  totalQuestions: Number(process.env.TOTAL_QUESTIONS || 300),
  topicsToUse: Number(process.env.TOPICS_TO_USE || 0),
  perTopicQuestions: Number(process.env.PER_TOPIC_QUESTIONS || 0),
  concurrency: Number(process.env.CONCURRENCY || 3),
  courseId: process.env.COURSE_ID ? Number(process.env.COURSE_ID) : undefined,
};

const ALLOWED_DEPARTMENT_CODES = new Set(["CCS", "CAS"]);

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (next === undefined || next.startsWith("--")) {
      args[name] = true;
      continue;
    }
    args[name] = next;
    i += 1;
  }

  args.totalQuestions = Number(args.totalQuestions);
  args.topicsToUse = Number(args.topicsToUse);
  args.perTopicQuestions = Number(args.perTopicQuestions);
  args.concurrency = Number(args.concurrency);
  args.courseId = args.courseId !== undefined ? Number(args.courseId) : undefined;
  return args;
}

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

async function apiRequest({ baseUrl, token, method, path, body }) {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const message = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`${method} ${path} failed (${response.status}): ${message}`);
  }

  return parsed;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupedBloomBucket(globalIndex, total) {
  // 30% low, 30% middle, 40% high
  const lowCut = Math.floor(total * 0.3);
  const middleCut = Math.floor(total * 0.6);

  if (globalIndex < lowCut) return "LOW";
  if (globalIndex < middleCut) return "MIDDLE";
  return "HIGH";
}

function bloomEnumForBucket(bucket) {
  if (bucket === "LOW") return pick(["Remember", "Understand"]);
  if (bucket === "MIDDLE") return pick(["Apply", "Analyze"]);
  return pick(["Evaluate", "Create"]);
}

const GENERIC_THEMES = [
  "algorithm efficiency",
  "data modeling",
  "software design principles",
  "debugging and testing",
  "secure coding practices",
  "system reliability",
  "performance optimization",
  "requirements analysis",
  "collaborative development workflows",
  "user-centered design",
];

function buildThemesFromTopic(topicTitle) {
  const title = String(topicTitle || "").trim();
  if (!title) return GENERIC_THEMES;

  const lower = title.toLowerCase();
  const words = lower
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 4);

  const topicDerived = words.map((w) => `${w} concepts`);
  return [...topicDerived, ...GENERIC_THEMES];
}

const LOW_STEMS = [
  "Which statement best defines",
  "Which option correctly describes",
  "What is the primary purpose of",
  "Which principle is most closely related to",
  "Which of the following is true about",
];

const MIDDLE_STEMS = [
  "In the scenario below, which action best applies",
  "Given this case, what is the most ethical response based on",
  "Which decision most appropriately applies",
  "How should the team apply",
  "Which approach best demonstrates practical use of",
];

const HIGH_STEMS = [
  "Which policy recommendation is most defensible when evaluating",
  "Which decision best balances stakeholder impact and",
  "What is the strongest ethical justification for",
  "Which governance strategy most effectively addresses",
  "Which response shows the best critical evaluation of",
];

function buildQuestionContent({ topicTitle, subjectName, theme, bucket, uniqueTag }) {
  const stem = bucket === "LOW"
    ? pick(LOW_STEMS)
    : bucket === "MIDDLE"
      ? pick(MIDDLE_STEMS)
      : pick(HIGH_STEMS);

  const scenarioByBucket = {
    LOW: "Focus on recalling core concepts from the lesson material.",
    MIDDLE: "A student developer team is preparing a real deployment for campus use.",
    HIGH: "A cross-functional review board must approve a high-impact implementation with long-term consequences.",
  };

  return `${stem} ${theme} in ${subjectName} (${topicTitle})? <br><em>${scenarioByBucket[bucket]}</em> <small>[${uniqueTag}]</small>`;
}

function buildOptions({ bucket, theme }) {
  const strong = {
    LOW: `It aligns with established ethical principles for ${theme}.`,
    MIDDLE: `It applies ethical guidelines while addressing realistic constraints in ${theme}.`,
    HIGH: `It demonstrates transparent, accountable, and impact-aware governance for ${theme}.`,
  };

  const distractors = [
    `It prioritizes speed and convenience while postponing ethical review of ${theme}.`,
    `It focuses only on technical success metrics and ignores stakeholder harm in ${theme}.`,
    `It transfers responsibility to end users without clear safeguards for ${theme}.`,
  ];

  const answerText = strong[bucket];
  const optionPool = shuffle([answerText, ...distractors]);
  const correctIndex = optionPool.findIndex((text) => text === answerText);

  return optionPool.map((content, idx) => ({
    Content: content,
    IsCorrect: idx === correctIndex,
    DisplayOrder: idx,
  }));
}

function generateQuestionPayload({
  topic,
  topicQuestionIndex,
  globalQuestionIndex,
  totalQuestions,
  subjectName,
}) {
  const bucket = groupedBloomBucket(globalQuestionIndex, totalQuestions);
  const bloomLevel = bloomEnumForBucket(bucket);
  const theme = pick(buildThemesFromTopic(topic.title));
  const uniqueTag = `${topic.id}-${topicQuestionIndex + 1}-${globalQuestionIndex + 1}`;

  const content = buildQuestionContent({
    topicTitle: topic.title || `Topic ${topic.id}`,
    subjectName,
    theme,
    bucket,
    uniqueTag,
  });

  const options = buildOptions({ bucket, theme });

  return {
    Content: content,
    QuestionType: "MultipleChoice",
    BloomLevel: bloomLevel,
    Points: bucket === "HIGH" ? 2 : 1,
    DisplayOrder: topic.baseDisplayOrder + topicQuestionIndex + 1,
    Options: options,
  };
}

function computeDistribution(topics, totalQuestions) {
  const n = topics.length;
  if (n === 0) return [];

  const base = Math.floor(totalQuestions / n);
  let remainder = totalQuestions % n;

  const sortedByExisting = [...topics].sort((a, b) => b.existingCount - a.existingCount);
  const byTopicId = new Map(topics.map((t) => [t.id, { ...t, allocation: base }]));

  let idx = 0;
  while (remainder > 0) {
    const topic = sortedByExisting[idx % sortedByExisting.length];
    byTopicId.get(topic.id).allocation += 1;
    remainder -= 1;
    idx += 1;
  }

  return topics.map((t) => byTopicId.get(t.id));
}

async function getDepartmentIdByCode(args, departmentCode) {
  const response = await apiRequest({
    baseUrl: args.baseUrl,
    token: args.adminToken,
    method: "GET",
    path: "/api/departments?pageSize=200",
  });

  const items = extractArray(response);
  const match = items.find((d) =>
    String(d.code || "").toUpperCase() === String(departmentCode || "").toUpperCase()
  );

  if (!match?.id) {
    throw new Error(`Department '${departmentCode}' not found.`);
  }

  return Number(match.id);
}

async function getCourse(args) {
  if (Number.isFinite(args.courseId) && args.courseId > 0) {
    const direct = await apiRequest({
      baseUrl: args.baseUrl,
      token: args.adminToken,
      method: "GET",
      path: `/api/courses/${args.courseId}`,
    });

    if (!direct?.id) {
      throw new Error(`Course with id '${args.courseId}' not found.`);
    }

    return {
      id: Number(direct.id),
      code: String(direct.code || args.courseCode || "").toUpperCase(),
      departmentId: Number(direct.departmentId),
      name: direct.name || "",
    };
  }

  const response = await apiRequest({
    baseUrl: args.baseUrl,
    token: args.adminToken,
    method: "GET",
    path: `/api/courses?search=${encodeURIComponent(args.courseCode)}&pageSize=200`,
  });

  const items = extractArray(response);
  const match = items.find((c) =>
    String(c.code || "").toUpperCase() === String(args.courseCode || "").toUpperCase()
  ) || items[0];

  if (!match?.id) {
    throw new Error(`No course found for code/search '${args.courseCode}'. Pass --courseId explicitly.`);
  }

  return {
    id: Number(match.id),
    code: String(match.code || "").toUpperCase(),
    departmentId: Number(match.departmentId),
    name: match.name || "",
  };
}

async function getTopicExistingCount(args, topicId) {
  const res = await apiRequest({
    baseUrl: args.baseUrl,
    token: args.adminToken,
    method: "GET",
    path: `/api/questions?topicId=${topicId}&pageNumber=1&pageSize=1`,
  });

  const totalCount = Number(res?.totalCount || 0);
  return Number.isFinite(totalCount) ? totalCount : 0;
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.max(1, limit); i += 1) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const normalizedCourseCode = String(args.courseCode || "").trim().toUpperCase();
  const normalizedDepartmentCode = String(args.departmentCode || "").trim().toUpperCase();
  const hasExactTopicPlan = Number.isFinite(args.topicsToUse) && args.topicsToUse > 0
    && Number.isFinite(args.perTopicQuestions) && args.perTopicQuestions > 0;

  if (!args.adminToken || args.adminToken.length < 20) {
    throw new Error("Missing/invalid --adminToken (or ADMIN_TOKEN env).");
  }
  if (!Number.isFinite(args.totalQuestions) || args.totalQuestions <= 0) {
    throw new Error("--totalQuestions must be a positive number.");
  }
  if (!ALLOWED_DEPARTMENT_CODES.has(normalizedDepartmentCode)) {
    throw new Error("Only CCS and CAS are allowed for seeding. Set --departmentCode to CCS or CAS.");
  }

  console.log("\n=== Hosted Bulk Question Seeder ===");
  console.log(`Base URL: ${args.baseUrl}`);
  console.log(`Department code: ${normalizedDepartmentCode}`);
  console.log(`Course code: ${normalizedCourseCode}`);
  console.log(`Subject target: ${args.subjectName}`);
  console.log(`Lesson filter: ${args.lessonQuery}`);
  if (hasExactTopicPlan) {
    console.log(`Exact plan: ${args.topicsToUse} topics x ${args.perTopicQuestions} questions each`);
  }
  console.log(`Requested insert: ${args.totalQuestions}`);

  const allowedDepartmentId = await getDepartmentIdByCode(args, normalizedDepartmentCode);
  console.log(`Resolved departmentId for ${normalizedDepartmentCode}: ${allowedDepartmentId}`);

  const course = await getCourse({ ...args, courseCode: normalizedCourseCode });
  if (!Number.isFinite(course.departmentId)) {
    throw new Error(`Course '${normalizedCourseCode}' does not include DepartmentId in API response.`);
  }
  if (course.departmentId !== allowedDepartmentId) {
    throw new Error(
      `Course '${normalizedCourseCode}' is not under ${normalizedDepartmentCode}. Allowed departmentId=${allowedDepartmentId}, course departmentId=${course.departmentId}.`
    );
  }

  const courseId = course.id;
  console.log(`Resolved courseId: ${courseId} (${course.code}${course.name ? ` - ${course.name}` : ""})`);

  const rawTopics = await apiRequest({
    baseUrl: args.baseUrl,
    token: args.adminToken,
    method: "GET",
    path: `/api/topics/by-course/${courseId}`,
  });

  const topics = (Array.isArray(rawTopics) ? rawTopics : []).map((t) => ({
    id: Number(t.id),
    title: t.title || "",
    subjectName: t.subject?.name || t.subjectName || "",
  }));

  if (topics.length === 0) {
    throw new Error("No topics returned by /api/topics/by-course/{courseId}.");
  }

  let subjectFiltered = topics.filter((t) =>
    String(t.subjectName || "").toLowerCase().includes(String(args.subjectName).toLowerCase())
  );

  if (subjectFiltered.length === 0) {
    console.warn(`No topics matched subject '${args.subjectName}'. Falling back to all course topics.`);
    subjectFiltered = topics;
  }

  let lessonFiltered = subjectFiltered.filter((t) =>
    String(t.title || "").toLowerCase().includes(String(args.lessonQuery).toLowerCase())
  );

  if (lessonFiltered.length === 0) {
    console.warn(`No topics matched lesson '${args.lessonQuery}'. Falling back to subject-filtered topics.`);
    lessonFiltered = subjectFiltered;
  }

  const withCounts = await runWithConcurrency(
    lessonFiltered,
    Math.min(args.concurrency, 8),
    async (topic) => {
      const count = await getTopicExistingCount(args, topic.id);
      return { ...topic, existingCount: count, baseDisplayOrder: count };
    }
  );

  let distributedTopics;
  let effectiveTotalQuestions = args.totalQuestions;

  if (hasExactTopicPlan) {
    if (withCounts.length !== args.topicsToUse) {
      const topicList = withCounts.map((t) => `[${t.id}] ${t.title}`).join("; ");
      throw new Error(
        `Expected exactly ${args.topicsToUse} topic(s) after filters, but found ${withCounts.length}. Topics: ${topicList}`
      );
    }

    distributedTopics = withCounts.map((t) => ({
      ...t,
      allocation: args.perTopicQuestions,
    }));
    effectiveTotalQuestions = args.topicsToUse * args.perTopicQuestions;

    if (args.totalQuestions !== effectiveTotalQuestions) {
      console.warn(`Adjusting totalQuestions from ${args.totalQuestions} to ${effectiveTotalQuestions} based on exact plan.`);
    }
  } else {
    const encodedTopics = withCounts.filter((t) => t.existingCount > 0);
    if (encodedTopics.length === 0) {
      throw new Error("No encoded topics found (all matched topics have 0 existing questions).");
    }

    console.log(`Eligible encoded topics: ${encodedTopics.length}`);
    encodedTopics.forEach((t) => {
      console.log(` - [${t.id}] ${t.title} (existing: ${t.existingCount})`);
    });

    distributedTopics = computeDistribution(encodedTopics, args.totalQuestions);
  }

  const plannedTotal = distributedTopics.reduce((sum, t) => sum + t.allocation, 0);
  if (plannedTotal !== effectiveTotalQuestions) {
    throw new Error(`Distribution mismatch: planned ${plannedTotal}, expected ${effectiveTotalQuestions}`);
  }

  console.log("\nDistribution plan:");
  distributedTopics.forEach((t) => {
    console.log(` - Topic ${t.id} (${t.title}): ${t.allocation}`);
  });

  let globalQuestionIndex = 0;
  const perTopicPayload = distributedTopics.map((topic) => {
    const questions = [];
    for (let i = 0; i < topic.allocation; i += 1) {
      questions.push(
        generateQuestionPayload({
          topic,
          topicQuestionIndex: i,
          globalQuestionIndex,
          totalQuestions: effectiveTotalQuestions,
          subjectName: args.subjectName,
        })
      );
      globalQuestionIndex += 1;
    }

    return {
      topic,
      requestBody: {
        TopicId: topic.id,
        Questions: questions,
      },
    };
  });

  // Validation pre-flight
  let validationErrors = 0;
  for (const batch of perTopicPayload) {
    for (const [idx, q] of batch.requestBody.Questions.entries()) {
      if (!q.Content || !q.QuestionType || !q.BloomLevel || !Number.isFinite(q.Points)) {
        console.error(`Invalid question field in topic ${batch.topic.id} at idx ${idx}`);
        validationErrors += 1;
      }
      if (!Array.isArray(q.Options) || q.Options.length !== 4) {
        console.error(`Options count invalid in topic ${batch.topic.id} at idx ${idx}`);
        validationErrors += 1;
      }
      const correctCount = q.Options.filter((o) => o.IsCorrect).length;
      if (correctCount !== 1) {
        console.error(`Correct answer invalid in topic ${batch.topic.id} at idx ${idx}`);
        validationErrors += 1;
      }
      if (q.Options.some((o) => !o.Content)) {
        console.error(`Null/empty option content in topic ${batch.topic.id} at idx ${idx}`);
        validationErrors += 1;
      }
    }
  }
  if (validationErrors > 0) {
    throw new Error(`Validation failed with ${validationErrors} errors. Aborting import.`);
  }

  console.log("\nSubmitting bulk batches...");

  const topicResults = await runWithConcurrency(
    perTopicPayload,
    Math.min(args.concurrency, 6),
    async (batch) => {
      const startedAt = Date.now();
      try {
        const result = await apiRequest({
          baseUrl: args.baseUrl,
          token: args.adminToken,
          method: "POST",
          path: "/api/questions/bulk",
          body: batch.requestBody,
        });

        return {
          topicId: batch.topic.id,
          topicTitle: batch.topic.title,
          requested: batch.requestBody.Questions.length,
          success: true,
          apiCount: Number(result?.count || 0),
          elapsedMs: Date.now() - startedAt,
          error: null,
        };
      } catch (err) {
        return {
          topicId: batch.topic.id,
          topicTitle: batch.topic.title,
          requested: batch.requestBody.Questions.length,
          success: false,
          apiCount: 0,
          elapsedMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  );

  console.log("\nPer-topic results:");
  topicResults.forEach((r) => {
    if (r.success) {
      console.log(` [OK] Topic ${r.topicId} (${r.topicTitle}): requested=${r.requested}, apiCount=${r.apiCount}, ${r.elapsedMs}ms`);
    } else {
      console.log(` [ERR] Topic ${r.topicId} (${r.topicTitle}): requested=${r.requested}, error=${r.error}`);
    }
  });

  const failed = topicResults.filter((r) => !r.success);
  if (failed.length > 0) {
    throw new Error(`Import failed for ${failed.length} topic batch(es). Aborting final count validation.`);
  }

  // Final validation: query total deltas from API
  const finalCounts = await runWithConcurrency(
    distributedTopics,
    Math.min(args.concurrency, 8),
    async (topic) => {
      const current = await getTopicExistingCount(args, topic.id);
      return {
        topicId: topic.id,
        before: topic.existingCount,
        after: current,
        delta: current - topic.existingCount,
      };
    }
  );

  const insertedTotal = finalCounts.reduce((sum, x) => sum + x.delta, 0);

  console.log("\nPost-import validation:");
  finalCounts.forEach((c) => {
    console.log(` - Topic ${c.topicId}: before=${c.before}, after=${c.after}, delta=${c.delta}`);
  });

  console.log(`\nInserted total (validated): ${insertedTotal}`);

  if (insertedTotal !== effectiveTotalQuestions) {
    throw new Error(`Expected exactly ${effectiveTotalQuestions} inserted, but validated ${insertedTotal}.`);
  }

  console.log(`\nSUCCESS: Exactly ${effectiveTotalQuestions} questions inserted via API bulk import.`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
