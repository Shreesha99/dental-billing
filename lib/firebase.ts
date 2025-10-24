// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
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

// Ensure Firebase is initialized only once
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(firebaseApp);

// ----------- UTILITY FUNCTIONS -----------

// Save bill metadata (used when generating a bill)
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

// Fetch a single bill by ID
export async function getBillMetadata(id: string) {
  const docRef = doc(db, "bills", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error("Bill not found");
  return docSnap.data();
}

// Fetch all bills (used in admin dashboard)
export async function getAllBills() {
  const billsCol = collection(db, "bills");
  const snapshot = await getDocs(billsCol);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
