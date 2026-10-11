import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import API from "../../api";
import { Table, message } from "antd";

const Users = () => {
  const [users, setUsers] = useState([]);

  // getUsers function
  const getUsers = async () => {
    try {
      const res = await API.get("/api/v1/admin/getAllUsers");
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // BLOCK USER FUNCTION
  const handleBlock = async (record) => {
    try {
      const res = await API.post("/api/v1/admin/blockUser", { blockId: record._id });
      if (res.data.success) {
        message.success(res.data.message);
        getUsers();
      }
    } catch (error) {
      message.error("Error while updating user status");
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