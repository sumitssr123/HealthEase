import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import moment from "moment";
import { message, Table, Tag } from "antd";

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);

  // Appointments Fetch Karna
  const getAppointments = async () => {
    try {
      const res = await axios.get("/api/v1/doctor/doctor-appointments", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAppointments();
  }, []);

  // Status Update Logic (Approve/Reject)
  const handleStatus = async (record, status) => {
    try {
      const res = await axios.post(
        "/api/v1/doctor/update-status",
        { appointmentsId: record._id, status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (res.data.success) {
        message.success(res.data.message);
        getAppointments(); // Table refresh karein
      }
    } catch (error) {
      console.log(error);
      message.error("Something Went Wrong");
    }
  };

  // Table Columns
  const columns = [
    {
      title: "ID",
      dataIndex: "_id",
    },
    {
        title: "Patient Name",
        dataIndex: "name",
        render: (text, record) => (
          <span>
             {record.userInfo.name} 
          </span>
        ),
      },
    {
      title: "Date & Time",
      dataIndex: "date",
      render: (text, record) => (
        <span>
           {moment(record.date, "DD-MM-YYYY").format("DD-MM-YYYY")} &nbsp;
           <i className="fa-regular fa-clock"></i> {moment(record.time, "HH:mm").format("HH:mm")}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text, record) => (
        <Tag color={record.status === "pending" ? "warning" : record.status === "reject" ? "error" : "success"}>
            {record.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (text, record) => (
        <div className="d-flex">
          {record.status === "pending" && (
            <div className="d-flex">
              <button
                className="btn btn-success btn-sm me-2"
                onClick={() => handleStatus(record, "approved")}
              >
                Approve
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleStatus(record, "reject")}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="p-3">
        <h2 className="text-center mb-3" style={{color: '#2c3e50'}}>Doctor Appointments Panel</h2>
        <Table columns={columns} dataSource={appointments} />
      </div>
    </Layout>
  );
};

export default DoctorAppointments;