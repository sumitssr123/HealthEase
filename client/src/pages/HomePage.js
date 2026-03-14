import React, { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { Row, Col, Spin, Empty, Card, message, Modal, Form, Input, Button } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { showLoading, hideLoading } from "../redux/features/alertSlice";

const HomePage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  
  // Real stats for Admin
  const [totalUsers, setTotalUsers] = useState(0);

  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);
  const [selectedDoctorForVideo, setSelectedDoctorForVideo] = useState(null);

  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch All Doctors
  const getUserData = async () => {
    try {
      const res = await axios.get("/api/v1/user/getAllDoctors", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      if (res.data.success) {
        setDoctors(res.data.data);
        setLoading(false);
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // Fetch Doctor's Real Appointments
  const getDoctorAppointments = async () => {
    try {
      const res = await axios.get("/api/v1/doctor/doctor-appointments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch Real Users for Admin
  const getAdminData = async () => {
    try {
      const res = await axios.get("/api/v1/admin/getAllUsers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.data.success) {
        setTotalUsers(res.data.data.length);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      getAdminData();
    } else if (user?.isDoctor) {
      getDoctorAppointments();
    }
    // eslint-disable-next-line
  }, [user]);

  // Calculations
  const todayDate = moment().format("DD-MM-YYYY");
  const todaysAppointments = appointments.filter((app) => app.date === todayDate).length;
  const approvedAppointments = appointments.filter((app) => app.status === "approved").length;
  const pendingAppointments = appointments.filter((app) => app.status === "pending").length;
  const totalPatients = appointments.length;

  const handleVideoRequestSubmit = async (values) => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/book-appointment",
        {
          doctorId: selectedDoctorForVideo._id,
          userId: user._id,
          doctorInfo: selectedDoctorForVideo,
          userInfo: { ...user, phone: values.phone, whatsapp: values.whatsapp, email: values.email },
          date: "VIDEO CONSULT",
          time: "Requested",
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        message.success("Video Consult Request Sent Successfully");
        setIsPatientModalVisible(false);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("Error sending video request");
    }
  };

  return (
    <Layout>
      <div className="p-4">
        
        {/* Admin Dashboard */}
        {user?.isAdmin && (
          <div className="admin-dashboard mb-5">
            <h3 className="mb-4 text-secondary" style={{ fontWeight: "bold" }}>
              <i className="fa-solid fa-gauge-high me-2 text-danger"></i> System Admin Dashboard
            </h3>
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12} md={8}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#f3e5f5", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Total Registered Users</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-users text-purple me-3" style={{ fontSize: "24px", color: "#8e44ad" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{totalUsers}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#e0f7fa", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Verified Doctors</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-user-check text-info me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{doctors.filter(d => d.status === 'approved').length}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fff9c4", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Pending Doctor Requests</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-hourglass-half text-warning me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{doctors.filter(d => d.status === 'pending').length}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24}>
                <Card title="Quick Actions" className="shadow-sm border-0" style={{ borderRadius: "10px" }}>
                  <div className="d-flex flex-wrap">
                    <button className="btn btn-primary m-2 flex-grow-1" onClick={() => navigate("/admin/doctors")}>
                      <i className="fa-solid fa-user-doctor me-2"></i> Manage Doctors
                    </button>
                    <button className="btn btn-dark m-2 flex-grow-1" onClick={() => navigate("/admin/users")}>
                      <i className="fa-solid fa-users me-2"></i> Manage Users
                    </button>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* Doctor Dashboard (Only visible if NOT Admin) */}
        {user?.isDoctor && !user?.isAdmin && (
          <div className="doctor-dashboard mb-5">
            <h3 className="mb-4 text-secondary" style={{ fontWeight: "bold" }}>
              <i className="fa-solid fa-chart-pie me-2 text-primary"></i> Doctor Overview Dashboard
            </h3>
            
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#eaf3fc", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Today's Appointments</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-calendar-day text-primary me-3" style={{ fontSize: "24px" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{todaysAppointments}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#eaf7f0", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Total Patients</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-users text-success me-3" style={{ fontSize: "24px", color: "#2e7d32" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{totalPatients}</h2>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fdf4e6", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Approved Appointments</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-circle-check text-warning me-3" style={{ fontSize: "24px", color: "#f39c12" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{approvedAppointments}</h2>
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-sm border-0" style={{ backgroundColor: "#fbe8ea", borderRadius: "10px" }}>
                  <div className="d-flex flex-column">
                    <span className="text-muted mb-3" style={{ fontSize: "14px" }}>Pending Requests</span>
                    <div className="d-flex align-items-center">
                      <i className="fa-solid fa-bell text-danger me-3" style={{ fontSize: "24px", color: "#e74c3c" }}></i>
                      <h2 className="m-0" style={{ fontWeight: "600" }}>{pendingAppointments}</h2>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24}>
                <Card title="Quick Actions" className="shadow-sm border-0" style={{ borderRadius: "10px" }}>
                  <div className="d-flex flex-wrap">
                    <button className="btn btn-outline-primary m-2 flex-grow-1" onClick={() => navigate("/doctor-appointments")}>
                      Manage Appointments
                    </button>
                    <button className="btn btn-outline-danger m-2 flex-grow-1" onClick={() => navigate(`/doctor/profile/${user?._id}`)}>
                      Update Timings
                    </button>
                    <button className="btn btn-outline-dark m-2 flex-grow-1" onClick={() => window.print()}>
                      Print Dashboard
                    </button>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* Patient View */}
        {!user?.isDoctor && !user?.isAdmin && (
          <div className="patient-view">
            <h2 className="text-center mb-4" style={{ color: "#2c3e50", fontWeight: "bold" }}>
              Find Your Doctor
            </h2>

            {loading ? (
              <div className="d-flex justify-content-center mt-5">
                <Spin size="large" />
              </div>
            ) : doctors.length === 0 ? (
              <Empty description="No Doctors Available Right Now" className="mt-5" /> 
            ) : (
              <Row gutter={[20, 20]}>
                {doctors.map((doctor) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={doctor._id}>
                    <Card className="shadow-sm border-0 text-center" style={{ borderRadius: "10px", cursor: "pointer" }}>
                      <h5 className="text-dark">Dr. {doctor.firstName}</h5>
                      <p className="text-muted mb-1">{doctor.specialization}</p>
                      <p className="text-success fw-bold">Fees: Rs. {doctor.feesPerCunsultation}</p>
                      
                      <button 
                        className="btn btn-primary w-100 mb-2 mt-2"
                        onClick={() => navigate(`/doctor/book-appointment/${doctor._id}`)}
                      >
                        Book Clinic Visit
                      </button>
                      
                      <button 
                        className="btn btn-outline-success w-100"
                        onClick={() => {
                          setSelectedDoctorForVideo(doctor);
                          setIsPatientModalVisible(true);
                        }}
                      >
                        Video Consult
                      </button>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <Modal
              title="Request Video Consult"
              open={isPatientModalVisible}
              onCancel={() => setIsPatientModalVisible(false)}
              footer={null}
            >
              <div className="alert alert-info border-0 shadow-sm">
                Send your details to Dr. {selectedDoctorForVideo?.firstName}. The doctor will review and contact you.
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
                  <Button size="large" type="primary" htmlType="submit" className="bg-success border-success">
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