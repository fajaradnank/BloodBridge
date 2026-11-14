import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZGwfsHTj_TtIzWdYDqXx1UC9hiR48ktk",
  authDomain: "bloodbridge-se.firebaseapp.com",
  projectId: "bloodbridge-se",
  storageBucket: "bloodbridge-se.firebasestorage.app",
  messagingSenderId: "326836743056",
  appId: "1:326836743056:web:a93c6100432c26973b2115"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);