import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5012';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  login: async (credentials) => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  // Users
  getUsers: async (pageNumber = 1, pageSize = 10) => {
    const response = await apiClient.get(`/api/users?pageNumber=${pageNumber}&pageSize=${pageSize}`);
    return response.data;
  },

  getUser: async (id) => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await apiClient.post('/api/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/api/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },

  // Subjects
  getSubjects: async (pageNumber = 1, pageSize = 10) => {
    const response = await apiClient.get(`/api/subjects?pageNumber=${pageNumber}&pageSize=${pageSize}`);
    return response.data;
  },

  getSubject: async (id) => {
    const response = await apiClient.get(`/api/subjects/${id}`);
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await apiClient.post('/api/subjects', subjectData);
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await apiClient.put(`/api/subjects/${id}`, subjectData);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await apiClient.delete(`/api/subjects/${id}`);
    return response.data;
  },

  // Questions
  getQuestions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.testId) queryParams.append('testId', params.testId);
    if (params.subjectId) queryParams.append('subjectId', params.subjectId);
    if (params.search) queryParams.append('search', params.search);
    if (params.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params.category) queryParams.append('category', params.category);
    
    const response = await apiClient.get(`/api/questions?${queryParams.toString()}`);
    return response.data;
  },

  getQuestion: async (id) => {
    const response = await apiClient.get(`/api/questions/${id}`);
    return response.data;
  },
};

export default apiClient;
