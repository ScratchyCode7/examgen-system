import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

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
  getSubjects: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.courseId) queryParams.append('courseId', params.courseId);
    if (params.search) queryParams.append('search', params.search);

    const response = await apiClient.get(`/api/subjects?${queryParams.toString()}`);
    const data = response.data;
    // normalize paged or array responses
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
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

  createQuestion: async (questionData) => {
    const response = await apiClient.post('/api/questions', questionData);
    return response.data;
  },

  updateQuestion: async (id, questionData) => {
    const response = await apiClient.put(`/api/questions/${id}`, questionData);
    return response.data;
  },

  deleteQuestion: async (id) => {
    const response = await apiClient.delete(`/api/questions/${id}`);
    return response.data;
  },

  getQuestionsByTopic: async (topicId) => {
    const response = await apiClient.get(`/api/questions?topicId=${topicId}&pageSize=500`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },

  // Test connectivity
  testConnection: async () => {
    try {
      const response = await apiClient.get('/api/departments');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        baseURL: API_BASE_URL,
        status: error.response?.status
      };
    }
  },
  // Departments
  getDepartments: async () => {
    const response = await apiClient.get('/api/departments');
    const data = response.data;
    // normalize: some endpoints return { items: [...] } while others return an array
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  // Courses by department
  getCourses: async (departmentId) => {
    const response = await apiClient.get(`/api/courses?departmentId=${departmentId}`);
    const data = response.data;
    console.log('getCourses: raw response for deptId', departmentId, data);
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },

  // Topics by subject
  getTopics: async (subjectId) => {
    const response = await apiClient.get(`/api/topics?subjectId=${subjectId}&pageSize=500`);
    const data = response.data;
    console.log('getTopics raw response:', data);
    if (Array.isArray(data)) {
      console.log('Response is direct array, returning', data.length, 'items');
      return data;
    }
    if (data?.items && Array.isArray(data.items)) {
      console.log('Response has items property, returning', data.items.length, 'items');
      return data.items;
    }
    if (data?.data && Array.isArray(data.data)) {
      console.log('Response has data property, returning', data.data.length, 'items');
      return data.data;
    }
    console.log('Could not extract array from response');
    return [];
  },

  // Topics by course (fetches all topics associated with a course)
  getTopicsByCourse: async (courseId) => {
    try {
      // Try direct course->topics endpoint first
      const directResponse = await apiClient.get(`/api/topics/by-course/${courseId}`);
      const directTopics = directResponse.data;
      console.log('getTopicsByCourse: Topics from direct endpoint:', directTopics);
      if (Array.isArray(directTopics) && directTopics.length > 0) {
        return directTopics;
      }

      // Fallback to subjects approach
      const subjectsResponse = await apiClient.get(`/api/subjects?courseId=${courseId}&pageSize=500`);
      const subjectsData = subjectsResponse.data;
      
      let subjects = [];
      if (Array.isArray(subjectsData)) subjects = subjectsData;
      else if (subjectsData?.items && Array.isArray(subjectsData.items)) subjects = subjectsData.items;
      else if (subjectsData?.data && Array.isArray(subjectsData.data)) subjects = subjectsData.data;
      
      console.log('getTopicsByCourse: subjects for courseId', courseId, subjects);
      
      if (!Array.isArray(subjects) || subjects.length === 0) {
        console.warn('No subjects found for courseId:', courseId);
        return [];
      }
      
      // Fetch topics for all subjects
      let allTopics = [];
      for (const subject of subjects) {
        try {
          const topicsResponse = await apiClient.get(`/api/topics?subjectId=${subject.id}&pageSize=500`);
          const topicsData = topicsResponse.data;
          
          let topicsForSubject = [];
          if (Array.isArray(topicsData)) topicsForSubject = topicsData;
          else if (topicsData?.items && Array.isArray(topicsData.items)) topicsForSubject = topicsData.items;
          else if (topicsData?.data && Array.isArray(topicsData.data)) topicsForSubject = topicsData.data;
          
          console.log('Topics for subjectId', subject.id, ':', topicsForSubject);
          if (Array.isArray(topicsForSubject)) {
            allTopics = [...allTopics, ...topicsForSubject];
          }
        } catch (err) {
          console.error(`Failed to fetch topics for subject ${subject.id}:`, err);
        }
      }
      
      console.log('Total topics fetched for courseId', courseId, ':', allTopics);
      return allTopics;
    } catch (err) {
      console.error('Failed to fetch topics by course:', err);
      return [];
    }
  },

  createTopic: async (topicData) => {
    const response = await apiClient.post('/api/topics', topicData);
    return response.data;
  },

  // Exams/Tests
  generateExam: async (generateData) => {
    const response = await apiClient.post('/api/tests/generate', generateData);
    return response.data;
  },

  createTestWithQuestions: async (testData) => {
    // testData should contain: title, description, questionIds (array), durationMinutes, isPublished
    const response = await apiClient.post('/api/tests/create-with-questions', testData);
    return response.data;
  },

  saveGeneratedExam: async (payload) => {
    const response = await apiClient.post('/api/tests/save-generated', payload);
    return response.data;
  },

  getExam: async (id) => {
    const response = await apiClient.get(`/api/tests/${id}`);
    return response.data;
  },

  deleteExam: async (id) => {
    await apiClient.delete(`/api/tests/${id}`);
  },

  getExams: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);
    if (params.subjectId) queryParams.append('subjectId', params.subjectId);
    if (params.examType) queryParams.append('examType', params.examType);
    if (params.semester) queryParams.append('semester', params.semester);
    if (params.schoolYear) queryParams.append('schoolYear', params.schoolYear);
    if (params.setLabel) queryParams.append('setLabel', params.setLabel);

    const qs = queryParams.toString();
    const response = await apiClient.get(`/api/tests${qs ? `?${qs}` : ''}`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },
};

export default apiClient;
