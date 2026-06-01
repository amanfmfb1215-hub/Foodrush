import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADUFLyDc9mVJDhvZsV6HhpnCvXrcaOgYk",
  authDomain: "smarteatai-32e9e.firebaseapp.com",
  projectId: "smarteatai-32e9e",
  storageBucket: "smarteatai-32e9e.firebasestorage.app",
  messagingSenderId: "407032301287",
  appId: "1:407032301287:web:9b3a5e900b5cef4b94c442"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore utilizing the custom firestoreDatabaseId
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
