// API Response Types
export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  department: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// Subject Types
export interface Subject {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRequest {
  name: string;
  description?: string;
}

// Test Types
export interface Test {
  id: number;
  subjectId: number;
  title: string;
  description?: string;
  durationMinutes: number;
  isPublished: boolean;
  availableFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRequest {
  subjectId: number;
  title: string;
  description?: string;
  durationMinutes: number;
  isPublished: boolean;
  availableFrom?: string;
}

export interface GenerateTestRequest {
  subjectId: number;
  title: string;
  description?: string;
  questionCount: number;
  durationMinutes: number;
  isPublished: boolean;
  availableFrom?: string;
  difficulty?: QuestionDifficulty;
  category?: string;
}

// Question Types
export const QuestionDifficulty = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
} as const;

export type QuestionDifficulty = typeof QuestionDifficulty[keyof typeof QuestionDifficulty];

export interface Question {
  id: number;
  testId: number;
  content: string;
  type: string;
  points: number;
  displayOrder: number;
  difficulty?: QuestionDifficulty;
  category?: string;
}

export interface QuestionRequest {
  testId: number;
  content: string;
  type: string;
  points: number;
  displayOrder: number;
  difficulty?: QuestionDifficulty;
  category?: string;
}

export interface BulkQuestionDto {
  content: string;
  type?: string;
  points: number;
  displayOrder: number;
  difficulty?: QuestionDifficulty;
  category?: string;
  options?: BulkOptionDto[];
}

export interface BulkOptionDto {
  content: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface BulkImportRequest {
  testId: number;
  questions: BulkQuestionDto[];
}

// Test Result Types
export interface TestResult {
  id: number;
  userId: string;
  testId: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: string;
  completedAt: string;
}

export interface TestResultRequest {
  userId: string;
  testId: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  duration: string;
  completedAt?: string;
}

