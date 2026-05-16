import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyANugK7ITbXqg6CGWco0_BqBxgST-ZR038",
  authDomain: "quiz-app-d1002.firebaseapp.com",
  projectId: "quiz-app-d1002",
  storageBucket: "quiz-app-d1002.firebasestorage.app",
  messagingSenderId: "425282673955",
  appId: "1:425282673955:web:5450d6e5f9cb3b666fc096",
  measurementId: "G-WT74DMG01M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);