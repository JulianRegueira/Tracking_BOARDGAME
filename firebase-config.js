export const firebaseConfig = {
  apiKey: "AIzaSyC-9PFZlBOuNpY-_a7pXL6mMbM1R0jZ9Q8",
  authDomain: "tabletop-a3a19.firebaseapp.com",
  databaseURL:"https://tabletop-a3a19-default-rtdb.firebaseio.com",
  projectId: "tabletop-a3a19",
  storageBucket: "tabletop-a3a19.firebasestorage.app",
  messagingSenderId: "225167118637",
  appId: "1:225167118637:web:24da3905b1977e7bae03a4",
  measurementId: "G-HL57QFD9NT"
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes("AIzaSyC-9PFZlBOuNpY-_a7pXL6mMbM1R0jZ9Q8") &&
    !firebaseConfig.databaseURL.includes("https://tabletop-a3a19-default-rtdb.firebaseio.com")
  );
}