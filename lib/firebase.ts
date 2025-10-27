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
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

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

export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();

// ------------------ EXISTING BILLS FUNCTIONS ------------------

export async function saveBillMetadata(
  patientName: string,
  consultations: any[]
) {
  console.log("🧾 Saving bill metadata:", { patientName, consultations });
  const billsCol = collection(db, "bills");
  const docRef = await addDoc(billsCol, {
    patientName,
    consultations,
    createdAt: new Date(),
  });
  console.log("✅ Bill saved with ID:", docRef.id);
  return docRef.id;
}

export async function getBillMetadata(id: string) {
  console.log("🔍 Fetching bill by ID:", id);
  const docRef = doc(db, "bills", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    console.error("❌ Bill not found:", id);
    throw new Error("Bill not found");
  }
  console.log("✅ Bill data:", docSnap.data());
  return docSnap.data();
}

export async function getAllBills() {
  console.log("📦 Fetching all bills...");
  const billsCol = collection(db, "bills");
  const snapshot = await getDocs(billsCol);
  const bills = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  console.log("✅ All bills:", bills);
  return bills;
}

// ------------------ EXISTING APPOINTMENTS FUNCTIONS ------------------

const appointmentsCol = collection(db, "appointments");

export type AppointmentData = {
  description: string;
  id: string;
  patientName: string;
  type: "Consultation" | "Cleaning" | "Emergency" | "Follow-up";
  start: string;
  end: string;
};

export async function addAppointment(
  appointment: Omit<AppointmentData, "id">
): Promise<string> {
  console.log("🗓️ Adding appointment:", appointment);
  const docRef = await addDoc(collection(db, "appointments"), appointment);
  console.log("✅ Appointment added with ID:", docRef.id);
  return docRef.id;
}

export async function getAppointments(): Promise<AppointmentData[]> {
  console.log("📅 Fetching all appointments...");
  const snapshot = await getDocs(collection(db, "appointments"));
  const appointments = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<AppointmentData, "id">;
    return {
      id: doc.id,
      ...data,
      start: data.start,
      end: data.end,
    };
  });
  console.log("✅ Appointments fetched:", appointments);
  return appointments;
}

export async function updateAppointment(
  id: string,
  appointment: Omit<AppointmentData, "id">
) {
  console.log("✏️ Updating appointment:", { id, appointment });
  const docRef = doc(db, "appointments", id);
  await updateDoc(docRef, appointment);
  console.log("✅ Appointment updated:", id);
}

export async function deleteAppointment(id: string) {
  console.log("🗑️ Deleting appointment:", id);
  const docRef = doc(db, "appointments", id);
  await deleteDoc(docRef);
  console.log("✅ Appointment deleted:", id);
}

// ------------------ EXISTING PATIENT/BILL HELPERS ------------------

export async function getPatients(): Promise<string[]> {
  console.log("🧍 Fetching patient names from bills...");
  const snapshot = await getDocs(collection(db, "bills"));
  const names = snapshot.docs.map((doc) => (doc.data() as any).patientName);
  const uniqueNames = Array.from(new Set(names));
  console.log("✅ Patients fetched:", uniqueNames);
  return uniqueNames;
}

export async function getBillsByPatient(patientName: string) {
  console.log("📄 Fetching bills for patient:", patientName);
  const snapshot = await getDocs(collection(db, "bills"));
  const bills = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((b) => b.patientName === patientName);
  console.log(`✅ Bills for ${patientName}:`, bills);
  return bills;
}

// ------------------ NEW PATIENT ID SYSTEM ------------------

const patientsCol = collection(db, "patients");

export type PatientData = {
  name: string;
  createdAt: Date;
};

export async function addPatient(name: string): Promise<string> {
  console.log("🧾 Adding/fetching patient:", name);
  const snapshot = await getDocs(patientsCol);
  const existing = snapshot.docs.find(
    (doc) => (doc.data() as any).name === name
  );
  if (existing) {
    console.log("ℹ️ Patient already exists:", existing.id);
    return existing.id;
  }
  const docRef = await addDoc(patientsCol, { name, createdAt: new Date() });
  console.log("✅ New patient added with ID:", docRef.id);
  return docRef.id;
}

export async function getPatientsWithId(): Promise<
  { id: string; name: string }[]
> {
  console.log("📋 Fetching all patients with IDs...");
  const snapshot = await getDocs(patientsCol);
  const patients = snapshot.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data() as any).name,
  }));
  console.log("✅ Patients with IDs:", patients);
  return patients;
}

export async function getBillsByPatientId(patientId: string) {
  console.log("📄 Fetching bills for patient ID:", patientId);
  const snapshot = await getDocs(collection(db, "bills"));
  const bills = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((b) => b.patientId === patientId);
  console.log(`✅ Bills for patient ${patientId}:`, bills);
  return bills;
}

export async function saveBillWithPatientId(
  patientId: string,
  patientName: string,
  consultations: any[]
) {
  console.log("💾 Saving bill with patient ID:", {
    patientId,
    patientName,
    consultations,
  });
  const docRef = await addDoc(collection(db, "bills"), {
    patientId,
    patientName,
    consultations,
    createdAt: new Date(),
  });
  console.log("✅ Bill saved with ID:", docRef.id);
  return docRef.id;
}

// ------------------ DASHBOARD HELPERS ------------------

export async function getTodayAppointmentsCount(): Promise<number> {
  console.log("📊 Counting today's appointments...");
  const snapshot = await getDocs(collection(db, "appointments"));
  const today = new Date().toISOString().split("T")[0];

  const count = snapshot.docs.filter((doc) => {
    const data = doc.data() as any;
    const startDate = new Date(data.start).toISOString().split("T")[0];
    return startDate === today;
  }).length;

  console.log("✅ Appointments today:", count);
  return count;
}
