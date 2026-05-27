
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAli6dHJjWpOosq59oWkm_pOIlQiKDl3vE",
  authDomain: "fact-63c4b.firebaseapp.com",
  projectId: "fact-63c4b",
  storageBucket: "fact-63c4b.firebasestorage.app",
  messagingSenderId: "410168072437",
  appId: "1:410168072437:web:e15c3f922d22cb205dcdbc",
  measurementId: "G-Y4ZQTWHCFQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);