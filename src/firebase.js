// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore" // ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyAgGlETF032aGWY3Eq8uIBJNI0hk9E-bmY",
  authDomain: "halo-6c5dc.firebaseapp.com",
  projectId: "halo-6c5dc",
  storageBucket: "halo-6c5dc.firebasestorage.app",
  messagingSenderId: "787621550369",
  appId: "1:787621550369:web:051f673ec89e8f7bc38660"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app) // ADD THIS
