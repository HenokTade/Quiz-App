import { create } from 'zustand';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  category: string;
  score: number;
  totalQuestions: number;
  date: string;
  answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean }[];
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'student';
  displayName?: string;
}

interface AppState {
  user: User | null;
  darkMode: boolean;
  currentQuiz: Question[];
  currentQuestionIndex: number;
  quizAnswers: { questionIndex: number; selectedAnswer: number }[];
  quizStartTime: number;
  setUser: (user: User | null) => void;
  setDarkMode: (dark: boolean) => void;
  setCurrentQuiz: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  addQuizAnswer: (answer: { questionIndex: number; selectedAnswer: number }) => void;
  startQuiz: () => void;
  resetQuiz: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  darkMode: false,
  currentQuiz: [],
  currentQuestionIndex: 0,
  quizAnswers: [],
  quizStartTime: 0,
  setUser: (user) => set({ user }),
  setDarkMode: (darkMode) => set({ darkMode }),
  setCurrentQuiz: (currentQuiz) => set({ currentQuiz }),
  setCurrentQuestionIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
  addQuizAnswer: (answer) => set((state) => ({
    quizAnswers: [...state.quizAnswers, answer]
  })),
  startQuiz: () => set({ quizStartTime: Date.now(), currentQuestionIndex: 0, quizAnswers: [] }),
  resetQuiz: () => set({ currentQuiz: [], currentQuestionIndex: 0, quizAnswers: [], quizStartTime: 0 }),
}));