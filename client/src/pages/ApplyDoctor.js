import React, { useState } from "react";
import Layout from "../components/Layout";
import { Col, Form, Input, Row, TimePicker, message, Button } from "antd";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import moment from "moment";

const ApplyDoctor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const timingsFormatted = values.timings
        ? [moment(values.timings[0]).format("HH:mm"), moment(values.timings[1]).format("HH:mm")]
        : ["09:00", "17:00"];

      const payload = {
        ...values,
        feesPerCunsultation: parseFloat(values.feesPerCunsultation),
        timings: timingsFormatted,
        userId: user?._id || user?.id,
      };

      const res = await API.post("/api/v1/user/apply-doctor", payload);
      setLoading(false);

      if (res.data && res.data.success) {
        message.success(res.data.message || "Application submitted successfully! Awaiting admin review.");
        navigate("/dashboard");
      } else {
        message.error(res.data.message || "Error applying for doctor account");
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      const errMsg = error.response?.data?.detail || "Something went wrong while submitting application";
      message.error(errMsg);
    }
  };

  return (
    <Layout>
      <div className="p-4" style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 className="text-center mb-2" style={{ color: "#2c3e50", fontWeight: "bold" }}>
          <i className="fa-solid fa-user-doctor text-primary me-2"></i> Apply for Doctor Privileges
        </h2>
        <p className="text-center text-muted mb-4">
          Submit your clinical credentials for verification by our system administrators.
        </p>

        <Form layout="vertical" onFinish={handleFinish} className="shadow-sm p-4 bg-white rounded" style={{ borderRadius: "12px" }}>
          <h5 className="text-primary mb-3">1. Personal Information</h5>
          <Row gutter={20}>
            <Col xs={24} md={12}>
              <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: "First name is required" }]}>
                <Input placeholder="Dr. John" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: "Last name is required" }]}>
                <Input placeholder="Smith" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: "Phone number is required" }]}>
                <Input placeholder="+91 9876543210" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Professional Email" name="email" rules={[{ required: true, message: "Email is required" }]}>
                <Input type="email" placeholder="doctor@clinic.com" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Website / Portfolio" name="website">
                <Input placeholder="https://myclinic.com" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Clinic / Practice Address" name="address" rules={[{ required: true, message: "Address is required" }]}>
                <Input placeholder="Physical address for patients to visit" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <h5 className="text-primary mt-4 mb-3">2. Professional Practice</h5>
          <Row gutter={20}>
            <Col xs={24} md={12}>
              <Form.Item label="Specialization" name="specialization" rules={[{ required: true, message: "Specialization is required" }]}>
                <Input placeholder="e.g. Cardiologist, Dermatologist, Physiotherapist" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Experience" name="experience" rules={[{ required: true, message: "Experience is required" }]}>
                <Input placeholder="e.g. 5 Years" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Consultation Fee (Rs.)" name="feesPerCunsultation" rules={[{ required: true, message: "Fee is required" }]}>
                <Input type="number" placeholder="e.g. 500" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Daily Working Hours" name="timings" rules={[{ required: true, message: "Timings are required" }]}>
                <TimePicker.RangePicker format="HH:mm" size="large" className="w-100" />
              </Form.Item>
            </Col>
          </Row>

          <div className="d-flex justify-content-end mt-4">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              style={{ borderRadius: "8px", fontWeight: "bold", minWidth: "180px" }}
            >
              Submit Application
            </Button>
          </div>
        </Form>
      </div>
    </Layout>
  );
};

export default ApplyDoctor;