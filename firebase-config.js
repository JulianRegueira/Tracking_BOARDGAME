export const firebaseConfig = {
  apiKey: "AIzaSyC-9PFZlBOuNpY-_a7pXL6mMbM1R0jZ9Q8",
  authDomain: "tabletop-a3a19.firebaseapp.com",
  databaseURL: "https://tabletop-a3a19-default-rtdb.firebaseio.com",
  projectId: "tabletop-a3a19",
  storageBucket: "tabletop-a3a19.firebasestorage.app",
  messagingSenderId: "225167118637",
  appId: "1:225167118637:web:24da3905b1977e7bae03a4",
};

export function isFirebaseConfigured() {
  const requiredFields = [
    "apiKey",
    "authDomain",
    "databaseURL",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
  ];

  const hasAllFields = requiredFields.every((field) => {
    const value = firebaseConfig[field];
    return typeof value === "string" && value.trim().length > 0;
  });

  const hasPlaceholders = Object.values(firebaseConfig).some((value) => {
    const text = String(value || "");
    return (
      text.includes("PEGAR") ||
      text.includes("TU_API_KEY") ||
      text.includes("TU_PROYECTO") ||
      text.includes("TU_VALOR_REAL")
    );
  });

  return hasAllFields && !hasPlaceholders;
}