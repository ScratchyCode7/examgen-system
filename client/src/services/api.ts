import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  Subject,
  SubjectRequest,
  Test,
  TestRequest,
  GenerateTestRequest,
  Question,
  QuestionRequest,
  BulkImportRequest,
  TestResult,
  TestResultRequest,
  PagedResponse,
  PaginationParams,
  QuestionDifficulty,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7088';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/auth/login', credentials);
    return response.data;
  }

  // Users
  async getUsers(params?: PaginationParams): Promise<PagedResponse<User>> {
    const response = await this.api.get<PagedResponse<User>>('/api/users', { params });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.api.get<User>(`/api/users/${id}`);
    return response.data;
  }

  async createUser(user: Partial<User>): Promise<User> {
    const response = await this.api.post<User>('/api/users', user);
    return response.data;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const response = await this.api.put<User>(`/api/users/${id}`, user);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.delete(`/api/users/${id}`);
  }

  // Subjects
  async getSubjects(params?: PaginationParams): Promise<PagedResponse<Subject>> {
    const response = await this.api.get<PagedResponse<Subject>>('/api/subjects', { params });
    return response.data;
  }

  async getSubject(id: number): Promise<Subject> {
    const response = await this.api.get<Subject>(`/api/subjects/${id}`);
    return response.data;
  }

  async createSubject(subject: SubjectRequest): Promise<Subject> {
    const response = await this.api.post<Subject>('/api/subjects', subject);
    return response.data;
  }

  async updateSubject(id: number, subject: SubjectRequest): Promise<Subject> {
    const response = await this.api.put<Subject>(`/api/subjects/${id}`, subject);
    return response.data;
  }

  async deleteSubject(id: number): Promise<void> {
    await this.api.delete(`/api/subjects/${id}`);
  }

  // Tests
  async getTests(params?: PaginationParams): Promise<PagedResponse<Test>> {
    const response = await this.api.get<PagedResponse<Test>>('/api/tests', { params });
    return response.data;
  }

  async getTest(id: number): Promise<Test> {
    const response = await this.api.get<Test>(`/api/tests/${id}`);
    return response.data;
  }

  async createTest(test: TestRequest): Promise<Test> {
    const response = await this.api.post<Test>('/api/tests', test);
    return response.data;
  }

  async generateTest(request: GenerateTestRequest): Promise<Test> {
    const response = await this.api.post<Test>('/api/tests/generate', request);
    return response.data;
  }

  async updateTest(id: number, test: TestRequest): Promise<Test> {
    const response = await this.api.put<Test>(`/api/tests/${id}`, test);
    return response.data;
  }

  async deleteTest(id: number): Promise<void> {
    await this.api.delete(`/api/tests/${id}`);
  }

  // Questions
  async getQuestions(params?: PaginationParams & {
    testId?: number;
    subjectId?: number;
    search?: string;
    difficulty?: QuestionDifficulty;
    category?: string;
  }): Promise<PagedResponse<Question>> {
    const response = await this.api.get<PagedResponse<Question>>('/api/questions', { params });
    return response.data;
  }

  async getQuestion(id: number): Promise<Question> {
    const response = await this.api.get<Question>(`/api/questions/${id}`);
    return response.data;
  }

  async createQuestion(question: QuestionRequest): Promise<Question> {
    const response = await this.api.post<Question>('/api/questions', question);
    return response.data;
  }

  async bulkImportQuestions(request: BulkImportRequest): Promise<{ message: string; count: number }> {
    const response = await this.api.post<{ message: string; count: number }>('/api/questions/bulk', request);
    return response.data;
  }

  async updateQuestion(id: number, question: QuestionRequest): Promise<Question> {
    const response = await this.api.put<Question>(`/api/questions/${id}`, question);
    return response.data;
  }

  async deleteQuestion(id: number): Promise<void> {
    await this.api.delete(`/api/questions/${id}`);
  }

  // Test Results
  async getTestResults(params?: PaginationParams & {
    userId?: string;
    testId?: number;
  }): Promise<PagedResponse<TestResult>> {
    const response = await this.api.get<PagedResponse<TestResult>>('/api/test-results', { params });
    return response.data;
  }

  async getTestResult(id: number): Promise<TestResult> {
    const response = await this.api.get<TestResult>(`/api/test-results/${id}`);
    return response.data;
  }

  async createTestResult(result: TestResultRequest): Promise<TestResult> {
    const response = await this.api.post<TestResult>('/api/test-results', result);
    return response.data;
  }

  async updateTestResult(id: number, result: TestResultRequest): Promise<TestResult> {
    const response = await this.api.put<TestResult>(`/api/test-results/${id}`, result);
    return response.data;
  }

  async deleteTestResult(id: number): Promise<void> {
    await this.api.delete(`/api/test-results/${id}`);
  }
}

export const apiService = new ApiService();

