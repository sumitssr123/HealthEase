import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import API from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import { Col, Form, Input, Row, TimePicker, message, Spin, Button, Card } from "antd";
import { useAuth } from "../../context/AuthContext";
import moment from "moment";

const Profile = () => {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const navigate = useNavigate();

  // --- GET DOCTOR DETAILS ---
  useEffect(() => {
    const getDoctorInfo = async () => {
      try {
        setLoading(true);
        const res = await API.post("/api/v1/doctor/getDoctorInfo", {
          userId: params.id || user?._id || user?.id,
        });
        setLoading(false);
        if (res.data.success && res.data.data) {
          setDoctor(res.data.data);
        }
      } catch (error) {
        setLoading(false);
        console.error("Error fetching doctor profile:", error);
      }
    };

    if (params.id || user?._id || user?.id) {
      getDoctorInfo();
    }
  }, [params.id, user]);

  // --- UPDATE PROFILE FUNCTION ---
  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const timingsFormatted = values.timings && values.timings.length === 2 ? [
        moment(values.timings[0]).format("HH:mm"),
        moment(values.timings[1]).format("HH:mm"),
      ] : doctor?.timings || ["09:00", "17:00"];

      const res = await API.post("/api/v1/doctor/updateProfile", {
        ...values,
        userId: user?._id || user?.id,
        timings: timingsFormatted,
      });
      setLoading(false);
      if (res.data.success) {
        message.success(res.data.message);
        navigate("/");
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      message.error(error.response?.data?.message || "Something went wrong while updating profile");
    }
  };

  const initialTimings = doctor?.timings && doctor.timings.length === 2
    ? [moment(doctor.timings[0], "HH:mm"), moment(doctor.timings[1], "HH:mm")]
    : [moment("09:00", "HH:mm"), moment("17:00", "HH:mm")];

  return (
    <Layout>
      <div className="container py-4">
        <h2 className="text-center mb-4" style={{ color: "#2c3e50", fontWeight: "bold" }}>
          👨‍⚕️ Manage Doctor Profile
        </h2>

        {loading && !doctor ? (
          <div className="text-center p-5">
            <Spin size="large" />
          </div>
        ) : doctor ? (
          <Card className="shadow-sm border-0 p-3" style={{ borderRadius: "12px" }}>
            <Form
              layout="vertical"
              onFinish={handleFinish}
              initialValues={{
                ...doctor,
                timings: initialTimings,
              }}
            >
              <h4 className="mb-3 text-primary">Personal Details:</h4>
              <Row gutter={20}>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="First Name" name="firstName" required rules={[{ required: true }]}>
                    <Input placeholder="First Name" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Last Name" name="lastName" required rules={[{ required: true }]}>
                    <Input placeholder="Last Name" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Phone" name="phone" required rules={[{ required: true }]}>
                    <Input placeholder="Phone Number" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Email" name="email" required rules={[{ required: true }]}>
                    <Input placeholder="Email" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Website" name="website">
                    <Input placeholder="Website URL" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Clinic Address" name="address" required rules={[{ required: true }]}>
                    <Input placeholder="Clinic Address" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <h4 className="mb-3 mt-4 text-primary">Professional Details:</h4>
              <Row gutter={20}>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Specialization" name="specialization" required rules={[{ required: true }]}>
                    <Input placeholder="e.g. Cardiologist, Dermatologist" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Experience (Years)" name="experience" required rules={[{ required: true }]}>
                    <Input placeholder="e.g. 8" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Consultation Fee (INR)" name="feesPerCunsultation" required rules={[{ required: true }]}>
                    <Input placeholder="e.g. 500" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <Form.Item label="Available Consultation Hours" name="timings" required>
                    <TimePicker.RangePicker format="HH:mm" className="w-100" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12} lg={8} className="d-flex align-items-end">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    className="w-100 shadow-sm"
                    loading={loading}
                    style={{ borderRadius: "8px", fontWeight: "bold", height: "40px" }}
                  >
                    Save Changes <i className="fa-solid fa-floppy-disk ms-2"></i>
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        ) : (
          <div className="text-center p-5 card shadow-sm">
            <h4>No Doctor Profile Found</h4>
            <p className="text-muted">You must apply and be approved as a doctor to manage a doctor profile.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;