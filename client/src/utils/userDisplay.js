import { API_BASE_URL } from '../services/api';

const LEGACY_LAST_PROFILE_IMAGE_PATH_KEY = 'lastProfileImagePath';
const PROFILE_IMAGE_KEY_PREFIX = 'profileImagePath:';

const toScopedProfileKey = (userId) => {
  if (!userId) return '';
  return `${PROFILE_IMAGE_KEY_PREFIX}${String(userId)}`;
};

const readLastProfileImagePath = (userId) => {
  const scopedKey = toScopedProfileKey(userId);
  if (!scopedKey) return '';

  try {
    return localStorage.getItem(scopedKey) || '';
  } catch {
    return '';
  }
};

export const clearLegacyProfileImageCache = () => {
  try {
    localStorage.removeItem(LEGACY_LAST_PROFILE_IMAGE_PATH_KEY);
  } catch {
    // Ignore storage failures and keep runtime behavior stable.
  }
};

export const persistLastProfileImagePath = (profileImagePath, userId) => {
  const scopedKey = toScopedProfileKey(userId);
  if (!scopedKey) return;

  try {
    if (profileImagePath) {
      localStorage.setItem(scopedKey, String(profileImagePath));
    } else {
      localStorage.removeItem(scopedKey);
    }
  } catch {
    // Ignore storage failures and keep runtime behavior stable.
  }
};

export const getUserDisplayName = (user, fallback = 'User') => {
  if (!user) return fallback;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.username || fallback;
};

export const getUserProfileImageUrl = (profileImagePath, userId) => {
  const candidatePath = profileImagePath || readLastProfileImagePath(userId);
  if (!candidatePath) return '';
  if (/^https?:\/\//i.test(candidatePath)) return candidatePath;

  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  const relativePath = String(candidatePath).replace(/^\//, '');
  return `${normalizedBase}/${relativePath}`;
};