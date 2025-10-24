import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyATSHH1vuiInE10QiPDB2quVFGdo5dTopY",
  authDomain: "dentist-billing.firebaseapp.com",
  projectId: "dentist-billing",
  storageBucket: "dentist-billing.appspot.com", // <-- FIXED
  messagingSenderId: "36379471591",
  appId: "1:36379471591:web:7e980826afd3562c287c42",
  measurementId: "G-79YL7Y1ZKB",
};

// --- Initialize Firebase ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

/**
 * Upload PDF from server-side (Next.js API route)
 */
export async function uploadPDFServer(fileBuffer: Buffer, fileName: string) {
  const storageRef = ref(storage, `bills/${fileName}`);
  await uploadBytes(storageRef, fileBuffer);
  return getDownloadURL(storageRef);
}

/**
 * Optional: Upload PDF from client-side (if needed)
 * Not recommended due to CORS issues
 */
export async function uploadPDFClient(file: Blob, fileName: string) {
  const storageRef = ref(storage, `bills/${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
