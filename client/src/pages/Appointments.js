import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import moment from "moment";
import { Table, Tag } from "antd";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);

  const getAppointments = async () => {
    try {
      const res = await axios.get("/api/v1/user/user-appointments", {
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

  // Table ke Columns Design
  const columns = [
    {
      title: "Doctor Name",
      dataIndex: "name",
      render: (text, record) => (
        <span>
          Dr. {record.doctorInfo.firstName} {record.doctorInfo.lastName}
        </span>
      ),
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      render: (text, record) => (
        <span>
          <i className="fa-regular fa-calendar me-1"></i>
          {moment(record.date, "DD-MM-YYYY").format("DD-MM-YYYY")} &nbsp;
          <i className="fa-regular fa-clock me-1"></i>
          {moment(record.time, "HH:mm").format("HH:mm")}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text, record) => (
        <Tag color={record.status === "pending" ? "warning" : "success"}>
          {record.status.toUpperCase()}
        </Tag>
      ),
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
          rowKey={(record) => record._id} 
          className="shadow-sm"
        />
      </div>
    </Layout>
  );
};

export default Appointments;