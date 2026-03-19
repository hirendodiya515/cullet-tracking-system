import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBIqvm26c6E1YQSZ4Mt_06I9FD4_XIhyZY",
  authDomain: "cullet-management-system.firebaseapp.com",
  projectId: "cullet-management-system",
  storageBucket: "cullet-management-system.firebasestorage.app",
  messagingSenderId: "740634779937",
  appId: "1:740634779937:web:b417db6c9188cdf8ba9e60"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
