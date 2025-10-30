"use client";
import { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { db, storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

interface UploadDocumentModalProps {
  show: boolean;
  onClose: () => void;
  patients: { id: string; name: string }[];
}

export default function UploadDocumentModal({
  show,
  onClose,
  patients,
}: UploadDocumentModalProps) {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedPatient || !docName || !docType || !file) {
      alert("Please fill all fields");
      return;
    }

    try {
      setUploading(true);
      const fileRef = ref(storage, `documents/${selectedPatient}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await updateDoc(doc(db, "patients", selectedPatient), {
        documents: arrayUnion({
          name: docName,
          type: docType,
          url,
          uploadedAt: new Date().toISOString(),
        }),
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload Document</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Select Patient</Form.Label>
            <Form.Select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Document Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., X-ray Report"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Document Type</Form.Label>
            <Form.Select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="">-- Select Type --</option>
              <option>Prescription</option>
              <option>X-ray</option>
              <option>Invoice</option>
              <option>Other</option>
            </Form.Select>
          </Form.Group>

          <Form.Group>
            <Form.Label>Choose File</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf,.jpg,.png,.jpeg"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFile(e.target.files ? e.target.files[0] : null)
              }
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
