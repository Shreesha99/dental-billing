import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyATSHH1vuiInE10QiPDB2quVFGdo5dTopY",
  authDomain: "dentist-billing.firebaseapp.com",
  projectId: "dentist-billing",
  storageBucket: "dentist-billing.firebasestorage.app",
  messagingSenderId: "36379471591",
  appId: "1:36379471591:web:7e980826afd3562c287c42",
  measurementId: "G-79YL7Y1ZKB",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export async function uploadPDF(file: Blob, fileName: string) {
  const storageRef = ref(storage, `bills/${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef); // public URL
}
