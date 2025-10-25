"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  SlotInfo,
  Event as RBCEvent,
  View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar.css";
import {
  addAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} from "../lib/firebase";
import { Modal, Button, Form } from "react-bootstrap";

// ✅ Import react-hot-toast
import toast, { Toaster } from "react-hot-toast";

const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type Appointment = {
  id: string;
  patientName: string;
  title: string;
  start: Date;
  end: Date;
  type: "Consultation" | "Cleaning" | "Emergency";
  description?: string;
};

export default function DentistCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    patientName: "",
    type: "Consultation" as Appointment["type"],
    start: "",
    end: "",
    description: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  // Calendar navigation
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchAppointments = async () => {
    const data = await getAppointments();
    const formatted: Appointment[] = data.map((a) => ({
      id: a.id,
      patientName: a.patientName,
      type: a.type,
      start: new Date(a.start),
      end: new Date(a.end),
      description: a.description || "",
      title: `${a.patientName} - ${a.type}`,
    }));
    setAppointments(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      id: "",
      patientName: "",
      type: "Consultation",
      start: "",
      end: "",
      description: "",
    });
    setIsEditing(false);
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    const newAppointment = {
      patientName: formData.patientName,
      type: formData.type,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
      description: formData.description,
    };

    try {
      if (isEditing && formData.id) {
        await updateAppointment(formData.id, newAppointment);
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === formData.id
              ? {
                  ...a,
                  ...newAppointment,
                  start: new Date(newAppointment.start),
                  end: new Date(newAppointment.end),
                  title: `${formData.patientName} - ${formData.type}`,
                }
              : a
          )
        );
        toast.success("Appointment updated successfully!");
      } else {
        const id = await addAppointment(newAppointment);
        setAppointments((prev) => [
          ...prev,
          {
            ...newAppointment,
            id,
            start: new Date(newAppointment.start),
            end: new Date(newAppointment.end),
            title: `${formData.patientName} - ${formData.type}`,
          },
        ]);
        toast.success("Appointment added successfully!");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }

    handleCloseModal();
  };

  const handleDeleteAppointment = async () => {
    if (!formData.id) return;

    try {
      await deleteAppointment(formData.id);
      setAppointments((prev) => prev.filter((a) => a.id !== formData.id));
      toast.success("Appointment deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete appointment.");
    }

    handleCloseModal();
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setFormData({
      id: "",
      patientName: "",
      type: "Consultation",
      start: formatInputDate(slotInfo.start),
      end: formatInputDate(slotInfo.end),
      description: "",
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSelectEvent = (event: RBCEvent) => {
    const appt = event as Appointment;
    setFormData({
      id: appt.id,
      patientName: appt.patientName,
      type: appt.type,
      start: formatInputDate(appt.start),
      end: formatInputDate(appt.end),
      description: appt.description || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const eventStyleGetter = (event: Appointment) => {
    const colorMap: Record<string, string> = {
      Consultation: "#007bff",
      Cleaning: "#28a745",
      Emergency: "#dc3545",
    };
    const borderColor = colorMap[event.type] || "#007bff";
    return {
      style: {
        backgroundColor: `${borderColor}33`,
        border: `2px solid ${borderColor}`,
        color: borderColor,
        borderRadius: "10px",
        padding: "4px 6px",
        fontWeight: 500,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      },
    };
  };

  const formatInputDate = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container-fluid my-3">
      {/* ✅ Toaster component */}
      <Toaster position="top-right" />

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4>Dentist Calendar</h4>
        <Button variant="primary" onClick={handleShowModal}>
          + New Consultation
        </Button>
      </div>

      {/* Calendar */}
      <Calendar
        localizer={localizer}
        events={appointments}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "75vh" }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={["month", "week", "day", "agenda"]}
        view={currentView}
        date={currentDate}
        onView={(view) => setCurrentView(view)}
        onNavigate={(date) => setCurrentDate(date)}
        popup
        components={{
          toolbar: (toolbar) => {
            const goToBack = () => toolbar.onNavigate("PREV");
            const goToNext = () => toolbar.onNavigate("NEXT");
            const goToToday = () => toolbar.onNavigate("TODAY");

            const setView = (view: View) => toolbar.onView(view);
            const label = () => {
              const date = new Date(toolbar.date);

              switch (toolbar.view) {
                case "month":
                  return date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                case "week": {
                  const startOfWeek = new Date(date);
                  const endOfWeek = new Date(date);
                  endOfWeek.setDate(endOfWeek.getDate() + 6);
                  const options: Intl.DateTimeFormatOptions = {
                    month: "short",
                    day: "numeric",
                  };
                  return `${startOfWeek.toLocaleDateString(
                    "en-US",
                    options
                  )} - ${endOfWeek.toLocaleDateString("en-US", options)}`;
                }
                case "day":
                  return date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  });
                case "agenda":
                  return `Agenda for ${date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}`;
                default:
                  return date.toLocaleDateString();
              }
            };

            return (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-3">
                <div className="btn-group mb-2 mb-md-0">
                  <button
                    className="btn btn-outline-primary"
                    onClick={goToBack}
                  >
                    &larr;
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    onClick={goToToday}
                  >
                    Today
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    onClick={goToNext}
                  >
                    &rarr;
                  </button>
                </div>
                <h5 className="mb-2 mb-md-0 text-center">{label()}</h5>

                <div className="btn-group">
                  {["month", "week", "day", "agenda"].map((v) => (
                    <button
                      key={v}
                      className={`btn ${
                        toolbar.view === v
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setView(v as View)}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            );
          },
        }}
      />

      {/* Modal */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        centered
        size="lg"
        className="shadow-lg"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            {isEditing ? "Edit Consultation" : "New Consultation"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveAppointment}>
          <Modal.Body>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="patientName"
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleFormChange}
                    placeholder="Patient Name"
                    required
                  />
                  <Form.Label htmlFor="patientName">Patient Name</Form.Label>
                </Form.Floating>
              </div>

              <div className="col-md-6">
                <Form.Floating className="mb-3">
                  <Form.Select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    aria-label="Appointment Type"
                    required
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Emergency">Emergency</option>
                  </Form.Select>
                  <Form.Label htmlFor="type">Type</Form.Label>
                </Form.Floating>
              </div>

              <div className="col-md-6">
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="start"
                    type="datetime-local"
                    name="start"
                    value={formData.start}
                    onChange={handleFormChange}
                    required
                  />
                  <Form.Label htmlFor="start">Start Time</Form.Label>
                </Form.Floating>
              </div>

              <div className="col-md-6">
                <Form.Floating className="mb-3">
                  <Form.Control
                    id="end"
                    type="datetime-local"
                    name="end"
                    value={formData.end}
                    onChange={handleFormChange}
                    required
                  />
                  <Form.Label htmlFor="end">End Time</Form.Label>
                </Form.Floating>
              </div>

              <div className="col-12">
                <Form.Floating>
                  <Form.Control
                    as="textarea"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Description"
                    style={{ height: "80px" }}
                  />
                  <Form.Label htmlFor="description">Description</Form.Label>
                </Form.Floating>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <div>
              {isEditing && (
                <Button
                  variant="outline-danger"
                  onClick={handleDeleteAppointment}
                  className="me-2"
                >
                  Delete
                </Button>
              )}
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
            </div>
            <Button type="submit" variant="primary">
              {isEditing ? "Update" : "Add Consultation"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
