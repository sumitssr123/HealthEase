import React, { useState } from "react";
import Layout from "../components/Layout";
import { Form, Input, message, Button, Card, Spin } from "antd";
import { useAuth } from "../context/AuthContext";
import API from "../api";

const UserProfile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form Submit Handle
  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/user/update-profile", values);
      setLoading(false);
      if (res.data.success) {
        message.success(res.data.message);
        if (res.data.data) {
          setUser(res.data.data);
        }
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      message.error(error.response?.data?.message || "Something went wrong updating profile");
    }
  };

  return (
    <Layout>
      <div className="container mt-5 d-flex justify-content-center">
        <Card 
          className="shadow-lg p-4 border-0" 
          style={{ width: "500px", borderRadius: "15px" }}
        >
          <div className="text-center mb-4">
            <div 
              className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{ width: "80px", height: "80px", fontSize: "35px", fontWeight: "bold" }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <h3 className="mt-3" style={{ color: "#2c3e50", fontWeight: "bold" }}>
              My Profile
            </h3>
            <p className="text-muted">Manage your personal information</p>
          </div>

          {loading ? (
            <div className="text-center p-4">
              <Spin size="large" />
            </div>
          ) : (
            user && (
              <Form
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                  name: user?.name,
                  email: user?.email,
                }}
              >
                <Form.Item
                  label={<span style={{ fontWeight: "bold" }}>Full Name</span>}
                  name="name"
                  rules={[{ required: true, message: "Please enter your name" }]}
                >
                  <Input size="large" prefix={<i className="fa-regular fa-user me-2 text-muted"></i>} />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: "bold" }}>Email Address</span>}
                  name="email"
                  rules={[{ required: true, message: "Please enter your email" }]}
                >
                  <Input size="large" prefix={<i className="fa-regular fa-envelope me-2 text-muted"></i>} />
                </Form.Item>

                <div className="d-flex justify-content-end mt-4">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large"
                    className="w-100 shadow-sm"
                    loading={loading}
                    style={{ borderRadius: "8px", fontWeight: "bold" }}
                  >
                    Update Profile <i className="fa-solid fa-floppy-disk ms-2"></i>
                  </Button>
                </div>
              </Form>
            )
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default UserProfile;