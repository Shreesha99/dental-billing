"use client";

import { useEffect, useState } from "react";
import { db, storage, getCurrentDentistId } from "@/lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";

export default function ClinicProfilePage() {
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [dentists, setDentists] = useState<string[]>([]);
  const [operatingHours, setOperatingHours] = useState("");
  const [newDentist, setNewDentist] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<"logo" | "signature" | null>(
    null
  );
  const [currentFileSize, setCurrentFileSize] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("19:00");

  // ✅ Fetch clinic info
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        const dentistId = getCurrentDentistId();
        const refDoc = doc(db, "dentists", dentistId, "config", "profile");
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = snap.data() as any;
          setClinicName(data.clinicName || "");
          setRegNo(data.regNo || "");
          setGstNo(data.gstNo || "");
          setLogoUrl(data.logoUrl || "");
          setDentists(data.dentists || []);
          setOperatingHours(data.operatingHours || "");
          setSignatureUrl(data.signatureUrl || "");
        }
      } catch (err) {
        console.error(err);
        toast.error("⚠️ Failed to load clinic info");
      } finally {
        setLoading(false);
      }
    };
    fetchClinicData();
  }, []);

  // ✅ Generate readable operating hours string
  useEffect(() => {
    if (!startTime || !endTime) return;

    const validDays = selectedDays.length ? selectedDays : ["Mon"];
    const formattedDays =
      validDays.length === 7
        ? "Mon–Sun"
        : `${validDays[0]}–${validDays[validDays.length - 1]}`;

    const formattedStart = dayjs(`2025-01-01T${startTime}`).format("h:mm A");
    const formattedEnd = dayjs(`2025-01-01T${endTime}`).format("h:mm A");

    setOperatingHours(`${formattedDays}, ${formattedStart} to ${formattedEnd}`);
  }, [selectedDays, startTime, endTime]);

  // ✅ Upload handler with progress + size validation
  const handleFileUpload = async (file: File, type: "logo" | "signature") => {
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    setCurrentFileSize(Number(fileSizeMB.toFixed(2)));

    if (fileSizeMB < 0.1 || fileSizeMB > 5) {
      toast.error(
        `File size must be between 0.1 MB and 5 MB (Yours: ${fileSizeMB.toFixed(
          2
        )} MB)`
      );
      return;
    }

    const dentistId = getCurrentDentistId();
    const storageRef = ref(
      storage,
      `dentists/${dentistId}/${type}/${file.name}`
    );

    try {
      setUploadType(type);
      setUploadProgress(0);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          toast.error("❌ File upload failed");
          setUploadProgress(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const refDoc = doc(db, "dentists", dentistId, "config", "profile");

          await setDoc(
            refDoc,
            type === "logo"
              ? { logoUrl: downloadURL }
              : { signatureUrl: downloadURL },
            { merge: true }
          );

          if (type === "logo") setLogoUrl(downloadURL);
          else setSignatureUrl(downloadURL);

          setUploadProgress(null);
          setUploadType(null);
          toast.success(
            type === "logo"
              ? "Clinic logo uploaded successfully!"
              : "Signature uploaded successfully!"
          );
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("File upload failed");
      setUploadProgress(null);
    }
  };

  // ✅ Delete uploaded file
  const handleDeleteFile = async (type: "logo" | "signature") => {
    try {
      const dentistId = getCurrentDentistId();
      const fileUrl = type === "logo" ? logoUrl : signatureUrl;
      if (!fileUrl) return toast.error("No file to delete.");

      const pathStart = fileUrl.indexOf("/o/") + 3;
      const pathEnd = fileUrl.indexOf("?alt=");
      const encodedPath = fileUrl.substring(pathStart, pathEnd);
      const filePath = decodeURIComponent(encodedPath);

      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);

      const refDoc = doc(db, "dentists", dentistId, "config", "profile");
      await setDoc(
        refDoc,
        type === "logo" ? { logoUrl: "" } : { signatureUrl: "" },
        { merge: true }
      );

      if (type === "logo") setLogoUrl("");
      else setSignatureUrl("");

      toast.success("🗑️ File deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete file.");
    }
  };

  // ✅ Save clinic details (optimized)
  const handleSave = async () => {
    try {
      const dentistId = getCurrentDentistId();
      const refDoc = doc(db, "dentists", dentistId, "config", "profile");

      const snap = await getDoc(refDoc);
      const existingData = snap.exists() ? snap.data() : {};

      const newData = {
        clinicName,
        regNo,
        gstNo,
        dentists,
        operatingHours,
      };

      const hasChanges =
        JSON.stringify(existingData) !==
        JSON.stringify({
          ...existingData,
          ...newData,
        });

      if (!hasChanges) {
        toast("ℹ️ No changes were made to save.");
        return;
      }

      await setDoc(refDoc, newData, { merge: true });
      toast.success("Clinic details saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save clinic details");
    }
  };

  const handleAddDentist = () => {
    if (newDentist.trim()) {
      setDentists([...dentists, newDentist.trim()]);
      setNewDentist("");
    }
  };

  const handleRemoveDentist = (name: string) => {
    setDentists(dentists.filter((d) => d !== name));
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="container py-4">
      <h3 className="mb-4 text-primary fw-semibold">Clinic Profile</h3>

      {/* Clinic Name */}
      <div className="mb-3">
        <label className="form-label fw-medium">Clinic Name</label>
        <input
          type="text"
          className="form-control"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Enter clinic name"
        />
      </div>

      {/* Registration Number */}
      <div className="mb-3">
        <label className="form-label fw-medium">Registration Number</label>
        <input
          type="text"
          className="form-control"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          placeholder="Enter registration number"
        />
      </div>

      {/* GST Number */}
      <div className="mb-3">
        <label className="form-label fw-medium">GST Number</label>
        <input
          type="text"
          className="form-control"
          value={gstNo}
          onChange={(e) => setGstNo(e.target.value)}
          placeholder="Enter GST number"
        />
      </div>

      {/* Logo Upload */}
      <UploadSection
        title="Clinic Logo"
        type="logo"
        fileUrl={logoUrl}
        currentFileSize={currentFileSize}
        uploadType={uploadType}
        uploadProgress={uploadProgress}
        onUpload={handleFileUpload}
        onDelete={handleDeleteFile}
      />

      {/* Dentist List */}
      <DentistList
        dentists={dentists}
        newDentist={newDentist}
        setNewDentist={setNewDentist}
        onAdd={handleAddDentist}
        onRemove={handleRemoveDentist}
      />

      {/* Operating Hours */}
      <OperatingHoursSection
        selectedDays={selectedDays}
        setSelectedDays={setSelectedDays}
        startTime={startTime}
        endTime={endTime}
        setStartTime={setStartTime}
        setEndTime={setEndTime}
        operatingHours={operatingHours}
      />

      {/* Signature Upload */}
      <UploadSection
        title="Authorized Signature"
        type="signature"
        fileUrl={signatureUrl}
        currentFileSize={currentFileSize}
        uploadType={uploadType}
        uploadProgress={uploadProgress}
        onUpload={handleFileUpload}
        onDelete={handleDeleteFile}
      />

      <button className="btn btn-success px-4" onClick={handleSave}>
        Save Changes
      </button>
    </div>
  );
}

/* --- Subcomponents (same as before) --- */

function UploadSection({
  title,
  type,
  fileUrl,
  uploadType,
  uploadProgress,
  currentFileSize,
  onUpload,
  onDelete,
}: any) {
  return (
    <div className="mb-4">
      <label className="form-label fw-medium">{title}</label>
      <input
        type="file"
        accept="image/*"
        className="form-control"
        onChange={(e) =>
          e.target.files?.[0] && onUpload(e.target.files[0], type)
        }
      />

      {currentFileSize && uploadType === type && (
        <div className="text-muted small mt-1">
          File size: {currentFileSize} MB / Max allowed: 5 MB
        </div>
      )}

      {uploadType === type && uploadProgress !== null && (
        <div className="progress mt-2" style={{ height: "8px" }}>
          <div
            className={`progress-bar progress-bar-striped ${
              type === "logo" ? "bg-primary" : "bg-success"
            }`}
            role="progressbar"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {fileUrl && (
        <div className="mt-3 text-center">
          <img
            src={fileUrl}
            alt={title}
            style={{
              height: type === "logo" ? "160px" : "130px",
              objectFit: "contain",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#f9f9f9",
              padding: "8px",
            }}
          />
          <button
            className="btn btn-sm btn-outline-danger d-block mx-auto mt-2"
            onClick={() => onDelete(type)}
          >
            Delete {title}
          </button>
        </div>
      )}
    </div>
  );
}

function DentistList({
  dentists,
  newDentist,
  setNewDentist,
  onAdd,
  onRemove,
}: any) {
  return (
    <div className="mb-4">
      <label className="form-label fw-medium">Dentists</label>
      <div className="d-flex gap-2 mb-2">
        <input
          type="text"
          className="form-control"
          value={newDentist}
          onChange={(e) => setNewDentist(e.target.value)}
          placeholder="Add dentist name"
        />
        <button className="btn btn-primary" onClick={onAdd}>
          Add
        </button>
      </div>
      <ul className="list-group">
        {dentists.map((d: string, idx: number) => (
          <li
            key={idx}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            {d}
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onRemove(d)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OperatingHoursSection({
  selectedDays,
  setSelectedDays,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  operatingHours,
}: any) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mb-4">
      <label className="form-label fw-medium">Operating Hours</label>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {days.map((day) => (
          <div key={day} className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="checkbox"
              checked={selectedDays.includes(day)}
              onChange={() =>
                setSelectedDays((prev: string[]) =>
                  prev.includes(day)
                    ? prev.filter((d) => d !== day)
                    : [...prev, day].sort(
                        (a, b) => days.indexOf(a) - days.indexOf(b)
                      )
                )
              }
            />
            <label className="form-check-label">{day}</label>
          </div>
        ))}
      </div>

      <div className="d-flex gap-3 mb-3">
        <div>
          <label className="form-label small text-muted mb-1">Start Time</label>
          <input
            type="time"
            className="form-control"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label small text-muted mb-1">End Time</label>
          <input
            type="time"
            className="form-control"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <input
        type="text"
        className="form-control"
        value={operatingHours}
        readOnly
      />
    </div>
  );
}
