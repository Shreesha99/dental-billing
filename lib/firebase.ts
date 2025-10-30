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
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ------------------ FIREBASE CONFIG ------------------
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
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Helper to get dentist’s scoped collection path
const dentistCol = (dentistId: string, subCol: string) =>
  collection(db, "dentists", dentistId, subCol);

// ------------------ 🔐 AUTH HELPERS ------------------

export function getCurrentDentistId(): string {
  if (typeof window === "undefined") {
    // Server environment — no localStorage access
    throw new Error("getCurrentDentistId() called on server");
  }
  const dentistId = auth.currentUser?.uid || localStorage.getItem("dentistId");
  if (!dentistId) throw new Error("Dentist not logged in");
  return dentistId;
}

export const storage = getStorage(firebaseApp);
export { ref, uploadBytes, getDownloadURL };

// ------------------ 🧾 BILLS ------------------

export async function saveBillMetadata(
  patientName: string,
  consultations: any[]
) {
  const dentistId = getCurrentDentistId();
  console.log("🧾 Saving bill metadata:", { dentistId, patientName });
  const billsCol = dentistCol(dentistId, "bills");
  const docRef = await addDoc(billsCol, {
    dentistId,
    patientName,
    consultations,
    createdAt: new Date(),
  });
  return docRef.id;
}

/**
 * ✅ getBillMetadata() – Safe for both client & server
 * If called on the client, uses current dentist ID.
 * If called on the server (no localStorage), auto-scans all dentists.
 */
export async function getBillMetadata(id: string): Promise<any> {
  try {
    const dentistId = getCurrentDentistId();
    const ref = doc(db, "dentists", dentistId, "bills", id);
    const snap = await getDoc(ref);
    if (snap.exists()) return { dentistId, ...snap.data() };
  } catch {
    // Server mode — fallback to global search
    const dentistsSnap = await getDoc(doc(db, "meta", "dentistIndex"));
    const dentistIds = dentistsSnap.exists()
      ? dentistsSnap.data()?.ids || []
      : [];

    for (const dentistId of dentistIds) {
      const ref = doc(db, "dentists", dentistId, "bills", id);
      const snap = await getDoc(ref);
      if (snap.exists()) return { dentistId, ...snap.data() };
    }
  }

  throw new Error("Bill not found");
}

export async function getAllBills() {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "bills"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ------------------ 🗓️ APPOINTMENTS ------------------

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
  const dentistId = getCurrentDentistId();
  const docRef = await addDoc(
    dentistCol(dentistId, "appointments"),
    appointment
  );
  return docRef.id;
}

export async function getAppointments(): Promise<AppointmentData[]> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "appointments"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AppointmentData, "id">),
  }));
}

export async function updateAppointment(
  id: string,
  appointment: Omit<AppointmentData, "id">
) {
  const dentistId = getCurrentDentistId();
  const docRef = doc(db, "dentists", dentistId, "appointments", id);
  await updateDoc(docRef, appointment);
}

export async function deleteAppointment(id: string) {
  const dentistId = getCurrentDentistId();
  const docRef = doc(db, "dentists", dentistId, "appointments", id);
  await deleteDoc(docRef);
}

// ------------------ 🧍 PATIENTS ------------------

export type PatientData = {
  name: string;
  createdAt: Date;
};

export async function addPatient(name: string): Promise<string> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "patients"));
  const existing = snapshot.docs.find((d) => (d.data() as any).name === name);
  if (existing) return existing.id;

  const docRef = await addDoc(dentistCol(dentistId, "patients"), {
    name,
    createdAt: new Date(),
  });
  return docRef.id;
}

export async function getPatients(): Promise<string[]> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "patients"));
  return snapshot.docs.map((d) => (d.data() as any).name);
}

export async function getPatientsWithId(): Promise<
  { id: string; name: string }[]
> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "patients"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: (doc.data() as any).name,
  }));
}

// ------------------ 💾 BILLS BY PATIENT ------------------

export async function getBillsByPatient(patientName: string) {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "bills"));
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((b) => b.patientName === patientName);
}

export async function saveBillWithPatientId(
  patientId: string,
  patientName: string,
  consultations: any[]
) {
  const dentistId = getCurrentDentistId();
  const docRef = await addDoc(dentistCol(dentistId, "bills"), {
    dentistId,
    patientId,
    patientName,
    consultations,
    createdAt: new Date(),
  });
  return docRef.id;
}

// ------------------ 📊 DASHBOARD HELPERS ------------------

export async function getTodayAppointmentsCount(): Promise<number> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "appointments"));
  const today = new Date().toISOString().split("T")[0];

  return snapshot.docs.filter((doc) => {
    const data = doc.data() as any;
    const startDate = new Date(data.start).toISOString().split("T")[0];
    return startDate === today;
  }).length;
}

export async function updateBillStatus(billId: string, status: string) {
  const dentistId = getCurrentDentistId();
  if (!dentistId) throw new Error("No dentist logged in");

  const billRef = doc(db, "dentists", dentistId, "bills", billId);
  await updateDoc(billRef, { status });
}

// ------------------ 🏥 CLINIC PROFILE ------------------

/**
 * Fetch clinic profile details for a dentist.
 * Works both client-side and server-side.
 */
export async function getClinicProfile(dentistId?: string) {
  try {
    const effectiveId = dentistId || getCurrentDentistId();
    const profileRef = doc(db, "dentists", effectiveId, "config", "profile");
    const snap = await getDoc(profileRef);
    return snap.exists()
      ? (snap.data() as {
          clinicName?: string;
          operatingHours?: string;
          logoUrl?: string;
          regNo?: string;
          gstNo?: string;
          signatureUrl?: string;
          dentists?: string[];
        })
      : null;
  } catch {
    return null;
  }
}
