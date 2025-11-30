
export enum ExerciseType {
  FILL_BLANK = 'FILL_BLANK',
  TRANSLATE_EN_PL = 'TRANSLATE_EN_PL',
  TRANSLATE_PL_EN = 'TRANSLATE_PL_EN',
  REORDER_WORDS = 'REORDER_WORDS',
  MATCH_PAIRS = 'MATCH_PAIRS',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  LISTENING_CHOOSE = 'LISTENING_CHOOSE',
  PRONUNCIATION = 'PRONUNCIATION',
  AI_CONVERSATION = 'AI_CONVERSATION'
}

export interface Vocabulary {
  en: string;
  pl: string;
  phonetic: string;
  example_en: string;
  example_pl: string;
}

// SRS Data Structure
export interface SRSCardData {
  wordEn: string;
  interval: number; // Days until next review
  repetition: number; // Consecutive successful reviews
  efactor: number; // Easiness factor (SM-2 algo)
  nextReviewDate: number; // Timestamp
  isNew: boolean;
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface Phrase {
  en: string;
  pl: string;
}

export interface GrammarRule {
  rule: string;
  example: string;
}

export interface GrammarSection {
  topic: string;
  explanation: string;
  rules: GrammarRule[];
}

export interface DialogLine {
  speaker: string;
  text: string;
  translation: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  audioText?: string; // For listening
  options?: string[]; // For multiple choice / matching
  correctAnswer: string | string[] | { [key: string]: string };
  explanation?: string;
}

export interface Lesson {
  id: string;
  level: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  title: string;
  description: string;
  isLocked: boolean;
  isCompleted: boolean;
  stars: number;
  
  // Study Content
  vocabulary: Vocabulary[];
  phrases: Phrase[];
  grammar: GrammarSection;
  dialogs: DialogLine[][];

  // Practice Content
  exercises: Exercise[];
}

export interface Section {
  id: string;
  title: string;
  description: string;
  color: string; // Tailwind color class base (e.g. 'indigo', 'green')
  lessons: Lesson[];
}

export interface UserProgress {
  xp: number;
  streak: number;
  completedLessons: string[];
}