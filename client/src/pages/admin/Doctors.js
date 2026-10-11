import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import API from "../../api";
import { Table, message } from "antd";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);

  // 1. Get Doctors Function
  const getDoctors = async () => {
    try {
      const res = await API.get("/api/v1/admin/getAllDoctors");
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 2. Handle Account Status (Approve/Reject Request)
  const handleAccountStatus = async (record, status) => {
    try {
      const res = await API.post("/api/v1/admin/changeAccountStatus", {
        doctorId: record._id,
        userId: record.userId,
        status: status,
      });
      if (res.data.success) {
        message.success(res.data.message);
        getDoctors();
      }
    } catch (error) {
      message.error("Something Went Wrong Updating Status");
    }
  };

  useEffect(() => {
    getDoctors();
  }, []);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text, record) => (
        <span>
          {record.firstName} {record.lastName}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
    },
    {
      title: "Phone",
      dataIndex: "phone",
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (text, record) => (
        <div className="d-flex">
          {record.status === "pending" ? (
            <>
              <button
                className="btn btn-success me-2" // 🟢 added me-2 taaki thoda gap rahe dono button mein
                onClick={() => handleAccountStatus(record, "approved")}
              >
                Approve
              </button>
              {/* 🟢 NAYA: Reject Button me function attach kiya */}
              <button 
                className="btn btn-danger"
                onClick={() => handleAccountStatus(record, "rejected")}
              >
                Reject
              </button>
            </>
          ) : (
             // 🟢 Agar pehle se action liya ja chuka hai toh Action Taken dikhayega
             <button className="btn btn-secondary" disabled>Action Taken</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <h4 className="text-center m-2">All Doctors</h4>
      <Table columns={columns} dataSource={doctors} />
    </Layout>
  );
};

export default Doctors;