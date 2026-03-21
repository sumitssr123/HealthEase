import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import { Table, message } from "antd"; // 🟢 message import kiya alerts ke liye

const Users = () => {
  const [users, setUsers] = useState([]);

  // getUsers function
  const getUsers = async () => {
    try {
      const res = await axios.get("/api/v1/admin/getAllUsers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // 🟢 BLOCK USER FUNCTION (FIXED: userId ki jagah blockId use kiya)
  const handleBlock = async (record) => {
    try {
      const res = await axios.post(
        "/api/v1/admin/blockUser",
        { blockId: record._id }, 
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (res.data.success) {
        message.success(res.data.message);
        window.location.reload(); 
      }
    } catch (error) {
      message.error("Error while blocking user");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  // AntD Table Columns
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Doctor",
      dataIndex: "isDoctor",
      render: (text, record) => (
        <span>{record.isDoctor ? "Yes" : "No"}</span>
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (text, record) => (
        <div className="d-flex">
          {/* 🟢 onClick me handleBlock function attach kiya */}
          <button className="btn btn-danger" onClick={() => handleBlock(record)}>Block</button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <h4 className="text-center m-2">Users List</h4>
      <Table columns={columns} dataSource={users} />
    </Layout>
  );
};

export default Users;