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
  query,
  where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Export db
export const db = getFirestore(firebaseApp);

// ------------------ EXISTING BILLS FUNCTIONS ------------------

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

// ------------------ EXISTING APPOINTMENTS FUNCTIONS ------------------

const appointmentsCol = collection(db, "appointments");

export type AppointmentData = {
  description: string;
  id: string;
  patientName: string;
  type: "Consultation" | "Cleaning" | "Emergency";
  start: string; // ISO string
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

// ------------------ EXISTING PATIENT/BILL HELPERS ------------------

export async function getPatients(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, "bills"));
  const names = snapshot.docs.map((doc) => (doc.data() as any).patientName);
  return Array.from(new Set(names));
}

export async function getBillsByPatient(patientName: string) {
  const snapshot = await getDocs(collection(db, "bills"));
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((b) => b.patientName === patientName);
}

// ------------------ NEW PATIENT ID SYSTEM ------------------

const patientsCol = collection(db, "patients");

export type PatientData = {
  name: string;
  createdAt: Date;
};

// Add new patient or return existing ID if patient already exists
export async function addPatient(name: string): Promise<string> {
  const snapshot = await getDocs(patientsCol);
  const existing = snapshot.docs.find(
    (doc) => (doc.data() as any).name === name
  );
  if (existing) return existing.id;

  const docRef = await addDoc(patientsCol, { name, createdAt: new Date() });
  return docRef.id;
}

// Get all patients with IDs
export async function getPatientsWithId(): Promise<
  { id: string; name: string }[]
> {
  const snapshot = await getDocs(patientsCol);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data() as any).name,
  }));
}

// Get all bills for a given patient ID
export async function getBillsByPatientId(patientId: string) {
  const snapshot = await getDocs(collection(db, "bills"));
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((b) => b.patientId === patientId);
}

// Save bill with patientId
export async function saveBillWithPatientId(
  patientId: string,
  patientName: string,
  consultations: any[]
) {
  const docRef = await addDoc(collection(db, "bills"), {
    patientId,
    patientName,
    consultations,
    createdAt: new Date(),
  });
  return docRef.id;
}

// ------------------ DENTIST PROFILE FUNCTIONS ------------------

// export async function getDentistProfile() {
//   const auth = getAuth(firebaseApp);
//   const user = auth.currentUser;

//   if (!user) throw new Error("No user logged in");

//   const docRef = doc(db, "dentists", user.uid);
//   const docSnap = await getDoc(docRef);

//   if (!docSnap.exists()) {
//     throw new Error("Dentist profile not found in Firestore");
//   }

//   return docSnap.data();
// }

// ------------------ DASHBOARD HELPERS ------------------

// ✅ Get total appointments for today
export async function getTodayAppointmentsCount(): Promise<number> {
  const snapshot = await getDocs(collection(db, "appointments"));
  const today = new Date().toISOString().split("T")[0];

  const count = snapshot.docs.filter((doc) => {
    const data = doc.data() as any;
    const startDate = new Date(data.start).toISOString().split("T")[0];
    return startDate === today;
  }).length;

  return count;
}
