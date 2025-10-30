"use client";
import { useState, useEffect } from "react";
import UploadDocumentModal from "../../components/UploadDocumentModal";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Button } from "react-bootstrap";

export default function DocumentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadPatients = async () => {
      const snapshot = await getDocs(collection(db, "patients"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setPatients(data);
    };
    loadPatients();
  }, []);

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Documents</h3>
        <Button onClick={() => setShowModal(true)}>Upload Document</Button>
      </div>

      <UploadDocumentModal
        show={showModal}
        onClose={() => setShowModal(false)}
        patients={patients}
      />
    </div>
  );
}
