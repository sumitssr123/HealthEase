import React, { useState } from "react";
import { Form, Input, message, Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import "../styles/RegisterStyles.css";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinishHandler = async (values) => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/user/register", values);
      setLoading(false);

      if (res.data && res.data.success) {
        message.success("Registered successfully! Please sign in.");
        navigate("/login");
      } else {
        message.error(res.data.message || "Registration failed");
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      const errMsg = error.response?.data?.detail || "Something went wrong during registration";
      message.error(errMsg);
    }
  };

  return (
    <div className="form-container">
      <Form layout="vertical" onFinish={onFinishHandler} className="register-form shadow-lg">
        <h3 className="text-center mb-4" style={{ fontWeight: "bold", color: "#2c3e50" }}>
          <i className="fa-solid fa-user-plus text-primary me-2"></i> Patient Registration
        </h3>
        <Form.Item
          label="Full Name"
          name="name"
          rules={[{ required: true, message: "Please enter your full name" }]}
        >
          <Input type="text" placeholder="John Doe" size="large" />
        </Form.Item>
        <Form.Item
          label="Email Address"
          name="email"
          rules={[{ required: true, message: "Please enter your email" }]}
        >
          <Input type="email" placeholder="john@example.com" size="large" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, min: 6, message: "Password must be at least 6 characters" }]}
        >
          <Input.Password placeholder="Create secure password" size="large" />
        </Form.Item>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Link to="/login" className="text-primary" style={{ fontSize: "14px" }}>
            Already have an account? Login here
          </Link>
          <Link to="/" className="text-muted" style={{ fontSize: "14px" }}>
            Home
          </Link>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          className="w-100"
          loading={loading}
          style={{ borderRadius: "8px", fontWeight: "bold" }}
        >
          Create Patient Account
        </Button>
      </Form>
    </div>
  );
};

export default Register;