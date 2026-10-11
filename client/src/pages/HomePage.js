import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../api";
import { Row, Col, Spin, Empty, Card, message, Modal, Form, Input, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    approvedDoctors: 0,
    pendingDoctors: 0,
    totalAppointments: 0,
  });

  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);
  const [selectedDoctorForVideo, setSelectedDoctorForVideo] = useState(null);
  const [submittingVideo, setSubmittingVideo] = useState(false);

  // Fetch approved doctors directory
  const getDoctors = useCallback(async () => {
    try {
      const res = await API.get("/api/v1/user/getAllDoctors");
      if (res.data && res.data.success) {
        setDoctors(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Doctor's booked appointments
  const getDoctorAppointments = useCallback(async () => {
    try {
      const res = await API.get("/api/v1/doctor/doctor-appointments");
      if (res.data && res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  // Fetch Admin Stats
  const getAdminData = useCallback(async () => {
    try {
      const res = await API.get("/api/v1/admin/stats");
      if (res.data && res.data.success) {
        setAdminStats(res.data.data || {});
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    getDoctors();
  }, [getDoctors]);

  useEffect(() => {
    if (user?.isAdmin) {
      getAdminData();
    } else if (user?.isDoctor) {
      getDoctorAppointments();
    }
  }, [user, getAdminData, getDoctorAppointments]);

  const handleVideoRequestSubmit = async (values) => {
    try {
      setSubmittingVideo(true);
      const res = await API.post("/api/v1/user/book-appointment", {
        doctorId: selectedDoctorForVideo._id || selectedDoctorForVideo.id,
        date: "VIDEO-CONSULT",
        time: "ONLINE",
        doctorInfo: selectedDoctorForVideo,
        userInfo: { ...user, phone: values.phone, whatsapp: values.whatsapp, email: values.email },
      });
      setSubmittingVideo(false);

      if (res.data && res.data.success) {
        message.success("Video Consult request submitted successfully!");
        setIsPatientModalVisible(false);
      } else {
        message.error(res.data.message || "Could not submit video request");
      }
    } catch (error) {
      setSubmittingVideo(false);
      console.error(error);
      message.error("Error submitting video consult request");
    }
  };

  const activeAppointmentsCount = appointments.filter((a) => a.status === "booked" || a.status === "approved").length;

  return (
    <Layout>
      <div className="p-4">
        {/* ======================================================== */}
        {/* 1. Admin Dashboard View                                 */}
        {/* ======================================================== */}
        {user?.isAdmin && (
          <div className="admin-dashboard mb-5">
            <h3 className="mb-4 text-secondary" style={{ fontWeight: "bold" }}>
              <i className="fa-solid fa-gauge-high me-2 text-danger"></i> System Admin Dashboard
            </h3>
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#f3e5f5", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Total Registered Users</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-users text-purple me-3" style={{ fontSize: "24px", color: "#8e44ad" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{adminStats.totalUsers}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#e0f7fa", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Verified Doctors</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-user-check text-info me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{adminStats.approvedDoctors}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fff9c4", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Pending Applications</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-hourglass-half text-warning me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{adminStats.pendingDoctors}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#e8f5e9", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Total Appointments</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-calendar-check text-success me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{adminStats.totalAppointments}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24}>
                <Card title="Quick Admin Controls" className="shadow-sm border-0" style={{ borderRadius: "10px" }}>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-primary m-1 flex-grow-1" onClick={() => navigate("/admin/doctors")}>
                      <i className="fa-solid fa-user-doctor me-2"></i> Review Doctor Applications
                    </button>
                    <button className="btn btn-dark m-1 flex-grow-1" onClick={() => navigate("/admin/users")}>
                      <i className="fa-solid fa-users me-2"></i> Manage User Accounts
                    </button>
                    <button className="btn btn-outline-primary m-1 flex-grow-1" onClick={() => navigate("/hospitals")}>
                      <i className="fa-solid fa-hospital me-2"></i> Manage Hospitals & Locations
                    </button>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. Doctor Dashboard View                                */}
        {/* ======================================================== */}
        {user?.isDoctor && !user?.isAdmin && (
          <div className="doctor-dashboard mb-5">
            <h3 className="mb-4 text-secondary" style={{ fontWeight: "bold" }}>
              <i className="fa-solid fa-chart-pie me-2 text-primary"></i> Doctor Clinical Dashboard
            </h3>
            
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#eaf3fc", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Active Appointments</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-calendar-check text-primary me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{activeAppointmentsCount}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#eaf7f0", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Total Bookings</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-users text-success me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{appointments.length}</h2>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fdf4e6", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Cancelled Slots</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-ban text-warning me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>
                        {appointments.filter((a) => a.status === "cancelled").length}
                      </h2>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fbe8ea", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-2" style={{ fontSize: "14px" }}>Clinical Portal</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-user-doctor text-danger me-3" style={{ fontSize: "24px" }}></i>
                      <span className="fw-semibold text-danger">Verified Active</span>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24}>
                <Card title="Quick Actions" className="shadow-sm border-0" style={{ borderRadius: "10px" }}>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-outline-primary m-1 flex-grow-1" onClick={() => navigate("/doctor-appointments")}>
                      <i className="fa-solid fa-list-check me-2"></i> Manage Appointments
                    </button>
                    <button className="btn btn-outline-danger m-1 flex-grow-1" onClick={() => navigate(`/doctor/profile/${user?._id || user?.id}`)}>
                      <i className="fa-solid fa-clock me-2"></i> Update Clinic Timings
                    </button>
                    <button className="btn btn-outline-success m-1 flex-grow-1" onClick={() => navigate("/hospitals")}>
                      <i className="fa-solid fa-hospital me-2"></i> Hospital Affiliations
                    </button>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. Patient View (Doctor Directory)                     */}
        {/* ======================================================== */}
        {!user?.isDoctor && !user?.isAdmin && (
          <div className="patient-view">
            <h2 className="text-center mb-4" style={{ color: "#2c3e50", fontWeight: "bold" }}>
              <i className="fa-solid fa-stethoscope text-primary me-2"></i> Find Your Specialist Doctor
            </h2>

            {loading ? (
              <div className="d-flex justify-content-center mt-5">
                <Spin size="large" />
              </div>
            ) : doctors.length === 0 ? (
              <Empty description="No Approved Doctors Available Right Now" className="mt-5" /> 
            ) : (
              <Row gutter={[20, 20]}>
                {doctors.map((doctor) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={doctor._id || doctor.id}>
                    <Card
                      className="shadow-sm border-0 text-center h-100 d-flex flex-column"
                      style={{ borderRadius: "12px" }}
                      bodyStyle={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
                    >
                      <div className="flex-grow-1">
                        <div
                          className="bg-light rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                          style={{ width: "60px", height: "60px" }}
                        >
                          <i className="fa-solid fa-user-doctor text-primary" style={{ fontSize: "28px" }}></i>
                        </div>
                        <h5 className="text-dark fw-bold mb-1">Dr. {doctor.firstName} {doctor.lastName}</h5>
                        <p className="text-primary mb-1 fw-semibold">{doctor.specialization}</p>
                        <p className="text-muted mb-2" style={{ fontSize: "13px" }}>
                          <i className="fa-solid fa-location-dot text-danger me-1"></i> {doctor.address}
                        </p>
                        <p className="text-success fw-bold fs-6 mb-3">Fee: Rs. {doctor.feesPerCunsultation}</p>
                      </div>

                      <div className="mt-auto">
                        <button 
                          className="btn btn-primary w-100 mb-2"
                          onClick={() => navigate(`/doctor/book-appointment/${doctor._id || doctor.id}`)}
                        >
                          <i className="fa-solid fa-calendar-check me-2"></i> Book Clinic Visit
                        </button>
                        
                        <button 
                          className="btn btn-outline-success w-100"
                          onClick={() => {
                            setSelectedDoctorForVideo(doctor);
                            setIsPatientModalVisible(true);
                          }}
                        >
                          <i className="fa-solid fa-video me-2"></i> Video Consult
                        </button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <Modal
              title="Request Video Consultation"
              open={isPatientModalVisible}
              onCancel={() => setIsPatientModalVisible(false)}
              footer={null}
            >
              <div className="alert alert-info border-0 shadow-sm">
                Request an online consultation with Dr. {selectedDoctorForVideo?.firstName}. The doctor will review your details.
              </div>
              <Form layout="vertical" onFinish={handleVideoRequestSubmit}>
                <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: 'Please enter phone number' }]}>
                  <Input size="large" placeholder="9876543210" />
                </Form.Item>
                <Form.Item label="WhatsApp Number (Optional)" name="whatsapp">
                  <Input size="large" placeholder="9876543210" />
                </Form.Item>
                <Form.Item label="Email ID" name="email" rules={[{ required: true, message: 'Please enter email id' }]}>
                  <Input size="large" type="email" placeholder="patient@mail.com" />
                </Form.Item>
                <div className="d-flex justify-content-end mt-4">
                  <Button size="large" onClick={() => setIsPatientModalVisible(false)} className="me-2">Cancel</Button>
                  <Button size="large" type="primary" htmlType="submit" loading={submittingVideo}>
                    Send Request
                  </Button>
                </div>
              </Form>
            </Modal>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;