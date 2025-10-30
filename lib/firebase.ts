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
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";

// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export type PatientDocumentRecord = {
  id?: string;
  fileName: string;
  fileUrl: string;
  type?: string;
  uploadedAt?: any; // Firestore Timestamp (serverTimestamp())
  uploadedBy?: string;
  sizeMB?: number;
  notes?: string;
};
/**
 * uploadPatientDocument
 * - Resumable upload (progress via callback)
 * - Validates: file size > 0 bytes and <= 5 MB
 * - Stores metadata in Firestore under:
 *     dentists/{dentistId}/patients/{patientId}/documents/{autoId}
 *
 * @param dentistId string
 * @param patientId string
 * @param file File
 * @param type string (optional category: xray, bill, report, etc)
 * @param notes string (optional)
 * @param onProgress (optional) callback(progressNumberInPercent: number)
 * @returns Promise<PatientDocumentRecord>
 */

export async function uploadPatientDocument(
  dentistId: string,
  patientId: string,
  file: File,
  type: string = "other",
  notes?: string,
  onProgress?: (pct: number) => void
): Promise<PatientDocumentRecord> {
  if (!file) throw new Error("No file provided");
  if (file.size === 0) throw new Error("Empty files are not allowed");
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > 5)
    throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB (max 5 MB)`);

  // storage path
  const path = `dentists/${dentistId}/patients/${patientId}/documents/${Date.now()}_${
    file.name
  }`;
  const sRef = storageRef(storage, path);

  // start resumable upload
  return new Promise<PatientDocumentRecord>((resolve, reject) => {
    const task = uploadBytesResumable(sRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(progress));
      },
      (err) => {
        console.error("Upload failed:", err);
        reject(err);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(task.snapshot.ref);

          const payload: any = {
            fileName: file.name,
            fileUrl: downloadURL,
            type,
            uploadedAt: serverTimestamp(),
            uploadedBy:
              auth.currentUser?.email || auth.currentUser?.uid || "unknown",
            sizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
            notes: notes || "",
          };

          const docsCol = collection(
            db,
            "dentists",
            dentistId,
            "patients",
            patientId,
            "documents"
          );
          const docRef = await addDoc(docsCol, payload);

          resolve({
            id: docRef.id,
            ...payload,
          });
        } catch (e) {
          console.error("Finalize upload failed:", e);
          reject(e);
        }
      }
    );
  });
}

/**
 * listPatientDocuments
 * - One-time fetch of documents metadata for a patient
 */
export async function listPatientDocuments(
  dentistId: string,
  patientId: string
): Promise<PatientDocumentRecord[]> {
  const docsCol = collection(
    db,
    "dentists",
    dentistId,
    "patients",
    patientId,
    "documents"
  );
  const snap = await getDocs(docsCol);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as PatientDocumentRecord[];
}

/**
 * listenPatientDocuments
 * - Realtime listener; returns unsubscribe function
 * - onChange callback receives the up-to-date array
 */
import { onSnapshot } from "firebase/firestore";

export function listenPatientDocuments(
  dentistId: string,
  patientId: string,
  onChange: (records: PatientDocumentRecord[]) => void
) {
  const docsCol = collection(
    db,
    "dentists",
    dentistId,
    "patients",
    patientId,
    "documents"
  );
  const unsub = onSnapshot(docsCol, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    onChange(list);
  });
  return unsub;
}

/**
 * deletePatientDocument
 * - Deletes Storage object and Firestore metadata
 * - Accepts either the stored fileUrl or the fileName; we expect fileName path to exist in metadata
 */

export async function deletePatientDocument(
  dentistId: string,
  patientId: string,
  documentId: string,
  fileUrlOrName?: string
) {
  // First try to remove Storage object if we can derive path
  try {
    if (fileUrlOrName) {
      // If full URL passed, try to decode the object path from it
      let objectPath: string | null = null;
      if (fileUrlOrName.startsWith("https://")) {
        // extract between /o/ and ?alt=
        const idx = fileUrlOrName.indexOf("/o/");
        const qidx = fileUrlOrName.indexOf("?alt=");
        if (idx !== -1 && qidx !== -1) {
          const enc = fileUrlOrName.substring(idx + 3, qidx);
          objectPath = decodeURIComponent(enc);
        }
      } else {
        // assume fileUrlOrName is the stored path like 'dentists/.../filename'
        objectPath = fileUrlOrName;
      }

      if (objectPath) {
        const fileRef = storageRef(storage, objectPath);
        await deleteObject(fileRef).catch((err) => {
          // Log but don't block deletion of metadata
          console.warn("Failed to delete storage object:", err);
        });
      }
    }
  } catch (err) {
    console.warn(
      "Storage deletion error (continuing to delete metadata):",
      err
    );
  }

  // Delete firestore metadata record
  const metaRef = doc(
    db,
    "dentists",
    dentistId,
    "patients",
    patientId,
    "documents",
    documentId
  );
  await deleteDoc(metaRef);
}
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
  // 🔹 Step 1: Detect environment
  const isServer = typeof window === "undefined";

  let dentistId: string | null = null;

  // 🔹 Step 2: Try to get dentistId (client only)
  if (!isServer) {
    try {
      dentistId = getCurrentDentistId();
    } catch (err) {
      console.warn("⚠️ [getBillMetadata] No client dentistId:", err);
    }
  }

  // 🔹 Step 3: Try specific dentist path
  if (dentistId) {
    const ref = doc(db, "dentists", dentistId, "bills", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { dentistId, ...snap.data() };
    } else {
      console.warn(
        "⚠️ [getBillMetadata] Not found under client dentist, scanning..."
      );
    }
  }

  // 🔹 Step 4: Server-safe fallback: scan all dentists
  const dentistsRef = collection(db, "dentists");
  const dentistsSnap = await getDocs(dentistsRef);

  for (const d of dentistsSnap.docs) {
    const dentistId = d.id;
    const ref = doc(db, "dentists", dentistId, "bills", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const bill = snap.data() as any;
      return { dentistId, ...bill };
    } else {
    }
  }

  console.error("❌ [getBillMetadata] Bill not found anywhere:", id);
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

export async function addPatient(name: string, phone: string): Promise<string> {
  const dentistId = getCurrentDentistId();
  const patientsRef = dentistCol(dentistId, "patients");

  // 🔍 Check duplicates by name OR phone
  const snapshot = await getDocs(patientsRef);
  const existing = snapshot.docs.find((d) => {
    const data = d.data() as any;
    return (
      data.name.toLowerCase() === name.toLowerCase() ||
      data.phone === phone.trim()
    );
  });

  if (existing) {
    console.warn("⚠️ Patient already exists:", existing.id, existing.data());
    return existing.id; // Return existing patient ID
  }

  // ✅ Add new patient with phone
  const docRef = await addDoc(patientsRef, {
    name: name.trim(),
    phone: phone.trim(),
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
  { id: string; name: string; phone?: string }[]
> {
  const dentistId = getCurrentDentistId();
  const snapshot = await getDocs(dentistCol(dentistId, "patients"));
  return snapshot.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      name: data.name,
      phone: data.phone || "",
    };
  });
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
