
import { SRSCardData, SRSRating, Vocabulary } from '../types';

const STORAGE_KEY = 'infinity_srs_data';

// Helper to get today's midnight timestamp
const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const loadSRSData = (): Record<string, SRSCardData> => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

export const saveSRSData = (data: Record<string, SRSCardData>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const initializeLessonCards = (vocabList: Vocabulary[]) => {
  const currentData = loadSRSData();
  let changed = false;

  vocabList.forEach(word => {
    if (!currentData[word.en]) {
      currentData[word.en] = {
        wordEn: word.en,
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextReviewDate: getToday(), // Due immediately
        isNew: true
      };
      changed = true;
    }
  });

  if (changed) saveSRSData(currentData);
};

export const getDueCards = (vocabList: Vocabulary[]): Vocabulary[] => {
  const srsData = loadSRSData();
  const now = getToday();

  // Filter vocab list to only include those that are due or new
  return vocabList.filter(word => {
    const data = srsData[word.en];
    // If no data exists (shouldn't happen if initialized), treat as due
    if (!data) return true;
    return data.nextReviewDate <= now;
  });
};

// Simplified SuperMemo-2 Algorithm
export const processCardReview = (wordEn: string, rating: SRSRating) => {
  const allData = loadSRSData();
  const card = allData[wordEn] || {
    wordEn,
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    nextReviewDate: getToday(),
    isNew: true
  };

  let { interval, repetition, efactor } = card;

  // 1. Update E-Factor
  // q: 0 (Again) to 3 (Easy) mapping for formula
  let q = 0;
  if (rating === 'again') q = 0;
  else if (rating === 'hard') q = 1; // actually SM2 uses 0-5 scale, we map loosely
  else if (rating === 'good') q = 2; // passing grade
  else if (rating === 'easy') q = 3; // perfect

  // SM-2: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  // Using simplified adjustment:
  if (rating === 'again') {
    repetition = 0;
    interval = 0; // Review same day or next
  } else {
    // Grade >= 3 (in SM2 terms, here hard/good/easy are passing)
    
    // Update E-Factor
    if (rating === 'hard') efactor = Math.max(1.3, efactor - 0.2);
    if (rating === 'good') efactor = efactor; // unchanged
    if (rating === 'easy') efactor = efactor + 0.15;

    // Update Repetition & Interval
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * efactor);

    repetition++;
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const nextDate = getToday() + (interval * ONE_DAY_MS);

  allData[wordEn] = {
    wordEn,
    interval,
    repetition,
    efactor,
    nextReviewDate: nextDate,
    isNew: false
  };

  saveSRSData(allData);
};
