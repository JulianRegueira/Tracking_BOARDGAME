// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC-9PFZlBOuNpY-_a7pXL6mMbM1R0jZ9Q8",
  authDomain: "tabletop-a3a19.firebaseapp.com",
  databaseURL:"https://tabletop-a3a19-default-rtdb.firebaseio.com",
  projectId: "tabletop-a3a19",
  storageBucket: "tabletop-a3a19.firebasestorage.app",
  messagingSenderId: "225167118637",
  appId: "1:225167118637:web:24da3905b1977e7bae03a4",
  measurementId: "G-HL57QFD9NT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    !firebaseConfig.apiKey.includes("PEGAR") &&
    !firebaseConfig.databaseURL.includes("PEGAR")
  );
}