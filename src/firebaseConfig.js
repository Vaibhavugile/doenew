// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp // <-- Import for timestamps
} from 'firebase/firestore'; 
import { getStorage } from 'firebase/storage';
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

// --- FUNCTION TO SAVE ORDERS ---

/**
 * Saves a new rental order to the 'orders' collection.
 * @param {object} orderData - The data for the new order.
 * @returns {string} The ID of the newly created order document.
 */
export const saveRentalOrder = async (orderData) => { // <-- EXPORTED HERE
    try {
        const docRef = await addDoc(collection(db, 'orders'), {
            ...orderData,
            orderStatus: 'Awaiting Payment',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error saving rental order:", error);
        throw new Error("Failed to save order to the database: " + error.message);
    }
};

// --- EXPORTS ---
export { db, storage }; // <-- REMOVED saveRentalOrder from here
export const checkPincodeServiceability = httpsCallable(functions, 'checkPincodeServiceability');