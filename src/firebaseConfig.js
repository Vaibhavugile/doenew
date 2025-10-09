// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // <-- NEW IMPORT
import { getFunctions, httpsCallable } from "firebase/functions";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmeU2_tCAmhMlsZ3laAvwM6R1J309Y0hk",
  authDomain: "pidr-c644e.firebaseapp.com",
  projectId: "pidr-c644e",
  storageBucket: "pidr-c644e.firebasestorage.app",
  messagingSenderId: "344167777219",
  appId: "1:344167777219:web:a12bdbe8dbc5efab1e7376",
  measurementId: "G-PGRBXP6XK5"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
export { db, storage};
export const checkPincodeServiceability = httpsCallable(functions, 'checkPincodeServiceability');