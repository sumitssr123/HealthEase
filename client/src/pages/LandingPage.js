import React from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card } from "antd";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", padding: "50px 20px" }}>
      {/* top navbar area */}
      <div className="d-flex justify-content-between align-items-center mb-5 container">
        <h2 style={{ fontWeight: "700", color: "#2c3e50", margin: 0 }}>
          <i className="fa-solid fa-staff-snake text-primary me-2"></i> HealthEase
        </h2>
        <button 
          className="btn btn-primary"
          onClick={() => navigate("/login")}
        >
          Sign In <i className="fa-solid fa-arrow-right-to-bracket ms-2"></i>
        </button>
      </div>

      {/* hero section (project intro) */}
      <div className="container text-center mb-5 mt-5">
        <h1 style={{ fontSize: "3rem", fontWeight: "700", color: "#1a202c" }}>
          Modern Healthcare, <span className="text-primary">Simplified.</span>
        </h1>
        <p className="text-muted mt-3 mb-5" style={{ fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto" }}>
          A complete hospital management system offering smart appointment booking, real-time analytics dashboards, integrated clinic locators via Google Maps, and seamless video consultations.
        </p>
      </div>

      {/* role selection cards */}
      <div className="container mt-5">
        <h3 className="text-center mb-4 text-secondary" style={{ fontWeight: "600" }}>
          Choose Your Portal To Login
        </h3>
        <Row gutter={[24, 24]} className="justify-content-center">
          
          {/* patient login card */}
          <Col xs={24} md={8}>
            <Card 
              className="text-center shadow-sm h-100" 
              style={{ borderRadius: "15px", cursor: "pointer", borderTop: "5px solid #2ecc71" }}
              onClick={() => navigate("/login")}
            >
              <i className="fa-solid fa-bed-pulse mb-3" style={{ fontSize: "3rem", color: "#2ecc71" }}></i>
              <h4 style={{ fontWeight: "600" }}>Patient Portal</h4>
              <p className="text-muted mb-4">Book clinic visits, request video consults, and locate doctors easily on map.</p>
              <button className="btn btn-outline-success w-100">Login as Patient</button>
            </Card>
          </Col>

          {/* doctor login card */}
          <Col xs={24} md={8}>
            <Card 
              className="text-center shadow-sm h-100" 
              style={{ borderRadius: "15px", cursor: "pointer", borderTop: "5px solid #4e73df" }}
              onClick={() => navigate("/login")}
            >
              <i className="fa-solid fa-user-doctor mb-3" style={{ fontSize: "3rem", color: "#4e73df" }}></i>
              <h4 style={{ fontWeight: "600" }}>Doctor Portal</h4>
              <p className="text-muted mb-4">Manage real-time appointments, view analytics dashboard, and approve requests.</p>
              <button className="btn btn-outline-primary w-100">Login as Doctor</button>
            </Card>
          </Col>

          {/* admin login card */}
          <Col xs={24} md={8}>
            <Card 
              className="text-center shadow-sm h-100" 
              style={{ borderRadius: "15px", cursor: "pointer", borderTop: "5px solid #e74c3c" }}
              onClick={() => navigate("/login")}
            >
              <i className="fa-solid fa-shield-halved mb-3" style={{ fontSize: "3rem", color: "#e74c3c" }}></i>
              <h4 style={{ fontWeight: "600" }}>Admin Portal</h4>
              <p className="text-muted mb-4">Control the entire system, verify doctor profiles, and manage user accounts.</p>
              <button className="btn btn-outline-danger w-100">Login as Admin</button>
            </Card>
          </Col>

        </Row>
      </div>

      {/* footer details */}
      <div className="text-center mt-5 pt-5 pb-3 text-muted">
        <p>© 2026 HealthEase Platform. Built with MERN Stack.</p>
      </div>
    </div>
  );
};

export default LandingPage;