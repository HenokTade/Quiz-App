import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RetakeMode = 'unlimited' | 'cooldown' | 'once';
export type FeedbackMode = 'after_each' | 'at_end' | 'none';

export interface QuizSettings {
  quizTime: number;
  retakeMode: RetakeMode;
  retakeCooldown: number;
  feedbackMode: FeedbackMode;
}

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
  quizTime: number;
  currentCategoryId: string;
  currentCategoryName: string;
  feedbackMode: FeedbackMode;
  setUser: (user: User | null) => void;
  setDarkMode: (dark: boolean) => void;
  setCurrentQuiz: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  addQuizAnswer: (answer: { questionIndex: number; selectedAnswer: number }) => void;
  updateQuizAnswer: (answer: { questionIndex: number; selectedAnswer: number }) => void;
  startQuiz: () => void;
  resetQuiz: () => void;
  setCurrentCategory: (id: string, name: string) => void;
  setFeedbackMode: (value: FeedbackMode) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      darkMode: false,
      currentQuiz: [],
      currentQuestionIndex: 0,
      quizAnswers: [],
      quizStartTime: 0,
      quizTime: 0,
      currentCategoryId: '',
      currentCategoryName: '',
      feedbackMode: 'after_each',
      setUser: (user) => set({ user }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setCurrentQuiz: (currentQuiz) => set({ currentQuiz }),
      setCurrentQuestionIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
      addQuizAnswer: (answer) => set((state) => ({
        quizAnswers: [...state.quizAnswers, answer]
      })),
      updateQuizAnswer: (answer) => set((state) => {
        const existing = state.quizAnswers.findIndex(a => a.questionIndex === answer.questionIndex);
        if (existing >= 0) {
          const updated = [...state.quizAnswers];
          updated[existing] = answer;
          return { quizAnswers: updated };
        }
        return { quizAnswers: [...state.quizAnswers, answer] };
      }),
      startQuiz: () => set({ quizStartTime: Date.now(), currentQuestionIndex: 0, quizAnswers: [] }),
      resetQuiz: () => set({ currentQuiz: [], currentQuestionIndex: 0, quizAnswers: [], quizStartTime: 0, quizTime: 0, currentCategoryId: '', currentCategoryName: '', feedbackMode: 'after_each' }),
      setCurrentCategory: (id, name) => set({ currentCategoryId: id, currentCategoryName: name }),
      setFeedbackMode: (value) => set({ feedbackMode: value }),
    }),
    {
      name: 'quiz-app-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        currentQuiz: state.currentQuiz,
        currentQuestionIndex: state.currentQuestionIndex,
        quizAnswers: state.quizAnswers,
        quizStartTime: state.quizStartTime,
        quizTime: state.quizTime,
        currentCategoryId: state.currentCategoryId,
        currentCategoryName: state.currentCategoryName,
        feedbackMode: state.feedbackMode,
      }),
    }
  )
);
