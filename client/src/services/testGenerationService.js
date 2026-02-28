import { apiService } from './api';

/**
 * Transform questions from database format to test generation format
 * Handles multiple questions and their options
 */
export const transformQuestionsForGeneration = (questions) => {
  if (!Array.isArray(questions)) return [];

  return questions.map((q) => {
    // Sort options by displayOrder to ensure correct mapping (A, B, C, D)
    const sortedOptions = (q.options || []).sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Create choices array with format: "A. content", "B. content", etc.
    const choices = sortedOptions.map((opt, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D
      return `${letter}. ${opt.content}`;
    });

    // Find correct answer letter
    let correctAnswer = 'A';
    const correctOption = sortedOptions.find(opt => opt.isCorrect);
    if (correctOption) {
      const correctIndex = sortedOptions.indexOf(correctOption);
      correctAnswer = String.fromCharCode(65 + correctIndex);
    }

    return {
      id: q.id,
      topic: q.topicId,
      topicName: q.topic?.name || `Topic ${q.topicId}`,
      question: q.content,
      // Assign Bloom's level based on difficulty or category if available
      bloomLevel: q.bloomLevel || q.difficulty || 'Remembering',
      choices: choices,
      correctAnswer: correctAnswer,
      // Keep original for reference
      difficulty: q.difficulty,
      category: q.category
    };
  });
};

/**
 * Fetch questions by topic from API and transform them
 */
export const getQuestionsByTopic = async (topicId) => {
  try {
    const questions = await apiService.getQuestionsByTopic(topicId);
    return transformQuestionsForGeneration(questions);
  } catch (error) {
    console.error(`Failed to fetch questions for topic ${topicId}:`, error);
    return [];
  }
};

/**
 * Get questions filtered by topic and Bloom's level
 * If bloomLevel not available in database, use difficulty as fallback
 */
export const getQuestionsByTopicAndLevel = async (topicId, bloomLevel) => {
  try {
    const questions = await getQuestionsByTopic(topicId);
    
    // Map Bloom's levels to difficulty or custom categories
    const bloomToDifficulty = {
      'Remembering': ['Easy', 'Basic', '1'],
      'Analyzing': ['Medium', 'Intermediate', '2'],
      'Evaluating': ['Hard', 'Advanced', '3']
    };

    const expectedDifficulties = bloomToDifficulty[bloomLevel] || [bloomLevel];

    return questions.filter(q => {
      // First check bloomLevel field
      if (q.bloomLevel && q.bloomLevel.toLowerCase().includes(bloomLevel.toLowerCase())) {
        return true;
      }
      // Fallback to difficulty if bloomLevel not present
      if (q.difficulty && expectedDifficulties.some(d => d.toLowerCase() === q.difficulty.toLowerCase())) {
        return true;
      }
      // Fallback: distribute based on ID for testing
      // Remembering: IDs ending in 1-4
      // Analyzing: IDs ending in 5-7
      // Evaluating: IDs ending in 8-0
      const idMod = q.id % 10;
      if (bloomLevel === 'Remembering' && idMod >= 1 && idMod <= 4) return true;
      if (bloomLevel === 'Analyzing' && idMod >= 5 && idMod <= 7) return true;
      if (bloomLevel === 'Evaluating' && (idMod === 8 || idMod === 9 || idMod === 0)) return true;
      
      return false;
    });
  } catch (error) {
    console.error(`Failed to get questions for topic ${topicId} and level ${bloomLevel}:`, error);
    return [];
  }
};

/**
 * Generate random unique placements for questions
 */
export const generateUniquePlacements = (count, total, usedSet = new Set()) => {
  const placements = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  while (placements.length < Math.min(count, total) && attempts < maxAttempts) {
    const random = Math.floor(Math.random() * total) + 1;
    if (!usedSet.has(random)) {
      placements.push(random);
      usedSet.add(random);
    }
    attempts++;
  }

  return placements.sort((a, b) => a - b);
};

/**
 * Select random items from an array
 */
export const selectRandomFromArray = (arr, count) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
};
