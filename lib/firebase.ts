import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(firebaseApp);

export async function saveBillMetadata(
  patientName: string,
  consultations: any[]
) {
  const billsCol = collection(db, "bills");
  const docRef = await addDoc(billsCol, {
    patientName,
    consultations,
    createdAt: new Date(),
  });
  return docRef.id;
}

export async function getBillMetadata(id: string) {
  const docRef = doc(db, "bills", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Bill not found");
  return docSnap.data();
}
