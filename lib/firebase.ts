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
  apiKey: "AIzaSyATSHH1vuiInE10QiPDB2quVFGdo5dTopY",
  authDomain: "dentist-billing.firebaseapp.com",
  projectId: "dentist-billing",
  storageBucket: "dentist-billing.appspot.com",
  messagingSenderId: "36379471591",
  appId: "1:36379471591:web:7e980826afd3562c287c42",
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
