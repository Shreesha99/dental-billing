// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
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

// Initialize Firebase
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// **Export db so other modules can use it**
export const db = getFirestore(firebaseApp);

// ----------- BILLS UTILITY FUNCTIONS -----------

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

export async function getAllBills() {
  const billsCol = collection(db, "bills");
  const snapshot = await getDocs(billsCol);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ----------- APPOINTMENTS UTILITY FUNCTIONS -----------

const appointmentsCol = collection(db, "appointments");

export type AppointmentData = {
  description: string;
  id: string;
  patientName: string;
  type: "Consultation" | "Cleaning" | "Emergency";
  start: string; // Firestore timestamp saved as ISO string
  end: string;
};

export async function addAppointment(
  appointment: Omit<AppointmentData, "id">
): Promise<string> {
  const docRef = await addDoc(collection(db, "appointments"), appointment);
  return docRef.id;
}

export async function getAppointments(): Promise<AppointmentData[]> {
  const snapshot = await getDocs(collection(db, "appointments"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AppointmentData, "id">),
  }));
}

export async function updateAppointment(
  id: string,
  appointment: Omit<AppointmentData, "id">
) {
  const docRef = doc(db, "appointments", id);
  await updateDoc(docRef, appointment);
}

export async function deleteAppointment(id: string) {
  const docRef = doc(db, "appointments", id);
  await deleteDoc(docRef);
}
