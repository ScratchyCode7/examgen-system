import { API_BASE_URL } from '../services/api';

const LAST_PROFILE_IMAGE_PATH_KEY = 'lastProfileImagePath';

const readLastProfileImagePath = () => {
  try {
    return localStorage.getItem(LAST_PROFILE_IMAGE_PATH_KEY) || '';
  } catch {
    return '';
  }
};

export const persistLastProfileImagePath = (profileImagePath) => {
  if (!profileImagePath) return;

  try {
    localStorage.setItem(LAST_PROFILE_IMAGE_PATH_KEY, String(profileImagePath));
  } catch {
    // Ignore storage failures and keep runtime behavior stable.
  }
};

export const getUserDisplayName = (user, fallback = 'User') => {
  if (!user) return fallback;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.username || fallback;
};

export const getUserProfileImageUrl = (profileImagePath) => {
  const candidatePath = profileImagePath || readLastProfileImagePath();
  if (!candidatePath) return '';
  if (/^https?:\/\//i.test(candidatePath)) return candidatePath;

  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const relativePath = String(candidatePath).replace(/^\//, '');
  return `${normalizedBase}/${relativePath}`;
};