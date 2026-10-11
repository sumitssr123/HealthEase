import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../api";
import moment from "moment";
import { Table, Tag, Button, Modal, message } from "antd";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const getAppointments = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/v1/user/user-appointments");
      if (res.data && res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAppointments();
  }, []);

  const handleCancelAppointment = (appointmentId) => {
    Modal.confirm({
      title: "Cancel Appointment?",
      content: "Are you sure you want to cancel this booking? This will reopen the slot for other patients.",
      okText: "Yes, Cancel",
      okType: "danger",
      cancelText: "Keep Booking",
      onOk: async () => {
        try {
          const res = await API.post("/api/v1/user/cancel-appointment", {
            appointmentId: appointmentId,
            status: "cancelled",
          });
          if (res.data && res.data.success) {
            message.success("Appointment cancelled successfully");
            getAppointments();
          } else {
            message.error(res.data.message || "Could not cancel appointment");
          }
        } catch (err) {
          console.error(err);
          message.error("Error cancelling appointment");
        }
      },
    });
  };

  const columns = [
    {
      title: "Doctor Name",
      dataIndex: "doctorInfo",
      key: "doctorName",
      render: (doc, record) => {
        const info = doc || record.doctorInfo || {};
        return (
          <span className="fw-semibold">
            Dr. {info.firstName || "Doctor"} {info.lastName || ""}
          </span>
        );
      },
    },
    {
      title: "Clinic Address",
      dataIndex: "doctorInfo",
      key: "address",
      render: (doc) => (
        <span className="text-muted" style={{ fontSize: "13px" }}>
          {doc?.address || "Clinic Address"}
        </span>
      ),
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "dateTime",
      render: (text, record) => (
        <span>
          <i className="fa-regular fa-calendar me-1 text-primary"></i>
          {record.date} &nbsp;
          <i className="fa-regular fa-clock me-1 text-secondary ms-2"></i>
          {record.time}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const isBooked = status === "booked" || status === "approved";
        return (
          <Tag color={isBooked ? "success" : "default"}>
            {(status || "booked").toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => {
        const isBooked = record.status === "booked" || record.status === "approved";
        return isBooked ? (
          <Button
            type="primary"
            danger
            size="small"
            onClick={() => handleCancelAppointment(record._id || record.id)}
          >
            Cancel Booking
          </Button>
        ) : (
          <span className="text-muted" style={{ fontSize: "13px" }}>No action</span>
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="p-4">
        <h2 className="text-center mb-4" style={{ color: "#2c3e50", fontWeight: "bold" }}>
          <i className="fa-solid fa-list-check me-2 text-primary"></i>
          My Appointments
        </h2>
        <Table
          columns={columns}
          dataSource={appointments}
          rowKey={(record) => record._id || record.id}
          loading={loading}
          className="shadow-sm bg-white rounded"
        />
      </div>
    </Layout>
  );
};

export default Appointments;