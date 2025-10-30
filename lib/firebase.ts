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

export async function getBillMetadata(id: string): Promise<any> {
  console.log("📥 [getBillMetadata] Called with ID:", id);

  try {
    console.log(
      "🦷 [getBillMetadata] Trying to get current dentist ID (client mode)"
    );
    const dentistId = getCurrentDentistId();
    console.log("✅ [getBillMetadata] Found current dentist ID:", dentistId);

    const ref = doc(db, "dentists", dentistId, "bills", id);
    console.log(
      "🔗 [getBillMetadata] Fetching doc from path: dentists/",
      dentistId,
      "/bills/",
      id
    );
    const snap = await getDoc(ref);

    if (snap.exists()) {
      console.log(
        "✅ [getBillMetadata] Bill found under current dentist:",
        dentistId
      );
      return { dentistId, ...snap.data() };
    } else {
      console.warn(
        "⚠️ [getBillMetadata] Bill not found under current dentist, scanning all dentists…"
      );
    }
  } catch (err) {
    console.warn(
      "⚠️ [getBillMetadata] Could not get dentistId from client:",
      err
    );
    console.warn(
      "🔁 [getBillMetadata] Falling back to direct search in all dentists"
    );
  }

  // 🚀 Try to find bill directly by scanning all dentists
  const dentistsRef = collection(db, "dentists");
  const dentistsSnap = await getDocs(dentistsRef);
  console.log(
    `🧾 [getBillMetadata] Found ${dentistsSnap.docs.length} dentist docs to scan for bill ${id}`
  );

  for (const d of dentistsSnap.docs) {
    const dentistId = d.id;
    console.log("🔍 [getBillMetadata] Checking dentist:", dentistId);
    const ref = doc(db, "dentists", dentistId, "bills", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      console.log(
        `✅ [getBillMetadata] FOUND bill ${id} under dentist ${dentistId}`
      );
      const bill = snap.data() as any;
      return { dentistId, ...bill };
    }
  }

  console.error("❌ [getBillMetadata] Bill not found anywhere for id:", id);
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
  let dentistId: string | null = null;
  try {
    dentistId = getCurrentDentistId();
  } catch {
    console.warn(
      "⚠️ No dentistId found in client, using fallback localStorage"
    );
    dentistId =
      typeof window !== "undefined" ? localStorage.getItem("dentistId") : null;
  }

  if (!dentistId) {
    console.error("❌ Dentist ID missing during bill creation");
    throw new Error("Dentist not logged in");
  }

  const billData = {
    dentistId,
    patientId,
    patientName,
    consultations,
    createdAt: new Date(),
  };

  const docRef = await addDoc(dentistCol(dentistId, "bills"), billData);
  console.log("🧾 Bill created successfully:", {
    billId: docRef.id,
    patientName,
    dentistId,
    consultationsCount: consultations.length,
  });
  return docRef.id;
}

/**
 * 💾 saveBillWithDentist()
 * Explicitly saves a bill with a known dentistId (recommended for new flow)
 */
export async function saveBillWithDentist(
  dentistId: string,
  patientId: string,
  patientName: string,
  consultations: any[]
) {
  if (!dentistId) throw new Error("Dentist ID is required to save bill");

  const billData = {
    dentistId,
    patientId,
    patientName,
    consultations,
    createdAt: new Date(),
  };

  const billsCol = collection(db, "dentists", dentistId, "bills");
  const docRef = await addDoc(billsCol, billData);

  console.log("🧾 Bill created (with explicit dentistId):", {
    billId: docRef.id,
    patientName,
    dentistId,
    consultationsCount: consultations.length,
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
