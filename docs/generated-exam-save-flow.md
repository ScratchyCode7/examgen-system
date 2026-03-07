# Saved Exam Sets – Persistence & Retrieval

This README summarizes how generated exams move from the Test Generation UI to durable storage and back to the Saved Exam Sets report. Treat it as the onboarding reference when enhancing the workflow.

## High-Level Lifecycle

1. **Generate preview** in the Test Generation page ([client/src/pages/TestGeneration.jsx](client/src/pages/TestGeneration.jsx)). The UI enforces a Table of Specification (TOS), shuffles questions, and tags each with the derived Bloom level plus `correctAnswer` metadata for preview only.
2. **User confirms Save Exam**, which opens a modal pre-filled with Department, Program, Subject, exam term, semester, and school year. On submit the UI calls `apiService.saveGeneratedExam()` ([client/src/services/api.js](client/src/services/api.js)) with a normalized payload containing ordered `questions[]` entries.
3. **Backend validation & persistence** happens in [src/Features/Tests/Save/SaveGeneratedExamEndpoint.cs](src/Features/Tests/Save/SaveGeneratedExamEndpoint.cs). The endpoint validates the course/subject hierarchy, ensures every question belongs to the target subject, computes a deterministic signature via [src/Features/Tests/TestSignatureHelper.cs](src/Features/Tests/TestSignatureHelper.cs), and writes rows to `Tests` plus `TestQuestions` including an option-order snapshot per item.
4. **Saved exam listing** uses `GET /api/tests` (see [src/Features/Tests/List/GetTestsEndpoint.cs](src/Features/Tests/List/GetTestsEndpoint.cs)) and displays options on the Saved Exam Sets page ([client/src/pages/SavedExamsReport.jsx](client/src/pages/SavedExamsReport.jsx)).
5. **Detailed view & printing** rely on `GET /api/tests/{id}` ([src/Features/Tests/GetById/GetTestEndpoint.cs](src/Features/Tests/GetById/GetTestEndpoint.cs)), which returns ordered questions with option records. The frontend reconstructs the Exam Paper, TOS, and Answer Key directly from the stored snapshot.

## Save API Contract

Endpoint: `POST /api/tests/save-generated` (admin only)

### Request Shape

```json
{
  "departmentId": 1,
  "courseId": 3,
  "subjectId": 42,
  "examType": "Midterm",
  "semester": "1st",
  "schoolYear": "20252026",
  "durationMinutes": 60,
  "totalPoints": 50,
  "questions": [
    {
      "questionId": 101,
      "displayOrder": 1,
      "options": [
        { "optionId": 555, "displayOrder": 0 },
        { "optionId": 556, "displayOrder": 1 },
        { "optionId": 557, "displayOrder": 2 },
        { "optionId": 558, "displayOrder": 3 }
      ]
    },
    {
      "questionId": 305,
      "displayOrder": 2,
      "options": [
        { "optionId": 559, "displayOrder": 0 },
        { "optionId": 560, "displayOrder": 1 },
        { "optionId": 561, "displayOrder": 2 },
        { "optionId": 562, "displayOrder": 3 }
      ]
    }
  ],
  "specificationSnapshot": "{...json...}",
  "generationNotes": "Fallback topic mix",
  "description": "Optional custom title"
}
```

Key rules enforced server-side:

- `questions` must be non-empty and each referenced `Question` must belong to the `subjectId` supplied.
- Course and department IDs must match the subject hierarchy, preventing cross-program saves.
- `displayOrder` is honored exactly as supplied; the frontend must send contiguous ordering to guarantee correct exam layout and answer key letters later.
- Each question now includes an `options[]` array mirroring the shuffled preview order. Missing or duplicate option IDs result in a `400 Bad Request`, so the client must snapshot every option for immutability.

### Duplicate detection via signature

`TestSignatureHelper.BuildSignature()` converts the ordered `(displayOrder, questionId)` tuples into a string like `1:101|2:305`. The Save endpoint checks for an existing `Tests` row with the same Subject, Exam Type, Semester, School Year, and signature. If found, it returns HTTP 409, nudging the UI to regenerate so each saved set remains unique.

## Persistence Details

- **Set labels**: `BuildSetLabel()` turns the existing count of saved sets for that subject/term into `Set A`, `Set B`, …, enabling instructors to reference versions unambiguously.
- **Tests table**: stores the exam metadata plus `SpecificationSnapshot`, `GenerationNotes`, and `QuestionSignature`. Timestamps default to `DateTime.UtcNow` and `AvailableFrom` is initialized so future publish flows can extend it.
- **TestQuestions table**: holds the ordered list of question IDs bound to the saved test and a `OptionSnapshotJson (jsonb)` column capturing the exact option ordering used during generation. Options themselves remain in the `Options` table tied to each question; only the ordering metadata is duplicated.

## Retrieval and Rendering

- **List view**: `GET /api/tests` returns paged/filtered sets. The UI filters by subject, exam type, semester, and school year before allowing selection.
- **Detail fetch**: `GET /api/tests/{id}` includes `questions[]` → `options[]` (see `OptionResponse` definition in [src/Features/Tests/TestDtos.cs](src/Features/Tests/TestDtos.cs)). When a saved snapshot exists, the server reorders the options to match it so Exam Paper and Answer Key layouts reproduce the original preview exactly.
- **Answer key reconstruction**: Saved Exams page runs `getOrderedOptions()` and `getCorrectLetter()` to map the persisted `isCorrect` flag to letters A–D. Because all ordering is preserved from the save payload, no re-generation is needed; printing simply formats the stored data.

## Extension Hooks & Future Improvements

1. **Metadata enrichment**: Extend `SaveGeneratedExamRequest` with additional auditing fields (e.g., preparedBy, reviewer) and store them on the `Tests` row; the endpoint already validates base relationships, so adding optional columns is straightforward.
2. **Versioning**: Use the `QuestionSignature` as a natural key for detecting regenerations. Future deployments could attach a `parentTestId` or `supersededByTestId` to chain revisions without losing history.
3. **Publishing workflow**: Currently `IsPublished` is forced to `false`. Introduce an approval step and toggle this flag when a dean releases the set; consumers can filter for published-only sets in `GET /api/tests`.
4. **Spec snapshot schema**: The snapshot is an opaque JSON string. Document a version number inside the JSON so collectors know how to parse it when adding analytics or migrating to a relational TOS table later.
5. **Bulk export/import**: Leverage the deterministic signature and ordered `TestQuestions` to build CSV/JSON exporters without hitting question-generation logic; simply stream the `Tests` row plus joined `Questions`/`Options`.

Keeping these mechanics in mind ensures future upgrades stay compatible with the existing saved sets while expanding functionality safely.
