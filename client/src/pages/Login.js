import React, { useState } from "react";
import { Form, Input, message, Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import "../styles/RegisterStyles.css";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinishHandler = async (values) => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/user/login", values);
      setLoading(false);

      if (res.data && res.data.success) {
        login(res.data.token, res.data.data);
        message.success("Login successful!");
        navigate("/dashboard");
      } else {
        message.error(res.data.message || "Invalid credentials");
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      const errMsg = error.response?.data?.detail || "Something went wrong during login";
      message.error(errMsg);
    }
  };

  return (
    <div className="form-container">
      <Form layout="vertical" onFinish={onFinishHandler} className="register-form shadow-lg">
        <h3 className="text-center mb-4" style={{ fontWeight: "bold", color: "#2c3e50" }}>
          <i className="fa-solid fa-hospital-user text-primary me-2"></i> HealthEase Login
        </h3>
        <Form.Item
          label="Email Address"
          name="email"
          rules={[{ required: true, message: "Please enter your email" }]}
        >
          <Input type="email" placeholder="user@example.com" size="large" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password placeholder="Enter password" size="large" />
        </Form.Item>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Link to="/register" className="text-primary" style={{ fontSize: "14px" }}>
            New patient? Register here
          </Link>
          <Link to="/" className="text-muted" style={{ fontSize: "14px" }}>
            Back to Home
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
          Sign In
        </Button>
      </Form>
    </div>
  );
};

export default Login;