import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import { DatePicker, message, TimePicker, Card, Divider, Row, Col, Spin, Button } from "antd";
import { useAuth } from "../context/AuthContext";

const BookingPage = () => {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);

  // Fetch doctor data by ID
  const getDoctorData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/doctor/getDoctorById", {
        doctorId: params.doctorId,
      });
      if (res.data && res.data.success) {
        setDoctor(res.data.data);
      } else {
        message.error("Could not load doctor details");
      }
    } catch (error) {
      console.error(error);
      message.error("Error loading doctor profile");
    } finally {
      setLoading(false);
    }
  }, [params.doctorId]);

  useEffect(() => {
    getDoctorData();
  }, [getDoctorData]);

  // Check slot availability
  const handleAvailability = async () => {
    if (!date || !time) {
      return message.warning("Please select both a date and time first");
    }
    try {
      setCheckingAvail(true);
      const res = await API.post("/api/v1/user/booking-availbility", {
        doctorId: params.doctorId,
        date,
        time,
      });
      setCheckingAvail(false);

      if (res.data && res.data.success) {
        setIsAvailable(true);
        message.success(res.data.message || "Slot is available! You can book now.");
      } else {
        setIsAvailable(false);
        message.error(res.data.message || "Doctor is not available at this time");
      }
    } catch (error) {
      setCheckingAvail(false);
      console.error(error);
      message.error("Error checking availability");
    }
  };

  // Immediate confirmed booking
  const handleBooking = async () => {
    if (!date || !time) {
      return message.warning("Please select date and time");
    }
    try {
      setBookingLoading(true);
      const res = await API.post("/api/v1/user/book-appointment", {
        doctorId: params.doctorId,
        userId: user?._id || user?.id,
        doctorInfo: doctor,
        userInfo: user,
        date: date,
        time: time,
      });
      setBookingLoading(false);

      if (res.data && res.data.success) {
        message.success("Appointment booked and confirmed successfully!");
        navigate("/appointments");
      } else {
        // Slot conflict or other message
        message.error(res.data.message || "Could not complete booking");
      }
    } catch (error) {
      setBookingLoading(false);
      console.error(error);
      const detail = error.response?.data?.detail || "Error while booking appointment";
      message.error(detail);
    }
  };

  return (
    <Layout>
      <div className="container mt-4 mb-5">
        <h2 className="text-center mb-4" style={{ color: "#2c3e50", fontWeight: "bold" }}>
          <i className="fa-solid fa-calendar-check text-primary me-2"></i> Book Doctor Appointment
        </h2>

        {loading ? (
          <div className="d-flex justify-content-center p-5">
            <Spin size="large" />
          </div>
        ) : doctor ? (
          <Row gutter={[24, 24]}>
            {/* Left: Doctor Details & Booking Form */}
            <Col xs={24} md={12}>
              <Card
                className="shadow-sm bg-white rounded h-100"
                style={{ borderRadius: "15px", border: "1px solid #e8e8e8" }}
              >
                <div className="text-center mb-3">
                  <div
                    className="bg-light rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "70px", height: "70px" }}
                  >
                    <i className="fa-solid fa-user-doctor text-primary" style={{ fontSize: "32px" }}></i>
                  </div>
                  <h3 className="text-dark mb-1">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </h3>
                  <span className="badge bg-primary-subtle text-primary fs-6 mb-2">
                    {doctor.specialization}
                  </span>
                  <p className="text-muted" style={{ fontSize: "14px" }}>
                    <i className="fa-solid fa-location-dot text-danger me-2"></i>
                    {doctor.address}
                  </p>
                </div>

                <Divider />

                <div className="d-flex justify-content-between mb-3 px-3">
                  <span className="text-muted">
                    <i className="fa-solid fa-indian-rupee-sign me-2"></i> Consultation Fee:
                  </span>
                  <b className="text-success fs-5">Rs. {doctor.feesPerCunsultation}</b>
                </div>

                <div className="d-flex justify-content-between mb-3 px-3">
                  <span className="text-muted">
                    <i className="fa-solid fa-clock me-2"></i> Available Timings:
                  </span>
                  <b>
                    {doctor.timings && Array.isArray(doctor.timings)
                      ? `${doctor.timings[0]} - ${doctor.timings[1]}`
                      : "09:00 - 18:00"}
                  </b>
                </div>

                <Divider dashed />

                <h5 className="text-center text-secondary mb-3">Select Date & Time Slot</h5>
                <div className="px-3">
                  <DatePicker
                    className="w-100 mb-3"
                    size="large"
                    format="DD-MM-YYYY"
                    onChange={(val, dateString) => {
                      setDate(dateString);
                      setIsAvailable(false);
                    }}
                    placeholder="Select Appointment Date"
                  />

                  <TimePicker
                    className="w-100 mb-3"
                    size="large"
                    format="HH:mm"
                    onChange={(val, timeString) => {
                      setTime(timeString);
                      setIsAvailable(false);
                    }}
                    placeholder="Select Appointment Time"
                  />

                  <Button
                    type="primary"
                    size="large"
                    className="w-100 mt-2 shadow-sm"
                    loading={checkingAvail}
                    onClick={handleAvailability}
                    style={{ borderRadius: "8px", fontWeight: "bold" }}
                  >
                    Check Availability <i className="fa-solid fa-magnifying-glass ms-2"></i>
                  </Button>

                  {isAvailable && (
                    <Button
                      type="primary"
                      size="large"
                      className="w-100 mt-3 shadow-sm bg-success border-success"
                      loading={bookingLoading}
                      onClick={handleBooking}
                      style={{ borderRadius: "8px", fontWeight: "bold" }}
                    >
                      Confirm Booking Immediately <i className="fa-solid fa-check ms-2"></i>
                    </Button>
                  )}
                </div>
              </Card>
            </Col>

            {/* Right: Embedded Clinic Google Map */}
            <Col xs={24} md={12}>
              <Card
                className="shadow-sm rounded h-100 p-0 overflow-hidden"
                style={{ borderRadius: "15px", border: "1px solid #e8e8e8" }}
                bodyStyle={{ padding: 0, height: "100%" }}
              >
                {doctor.address ? (
                  <iframe
                    title="clinic map"
                    width="100%"
                    height="100%"
                    style={{ minHeight: "480px", border: "none" }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(doctor.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  />
                ) : (
                  <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "480px", backgroundColor: "#f8f9fa" }}>
                    <i className="fa-solid fa-map-location-dot text-muted mb-3" style={{ fontSize: "50px" }}></i>
                    <h5 className="text-muted">Loading Clinic Location Map...</h5>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          <div className="text-center p-5 text-muted">Doctor details not found.</div>
        )}
      </div>
    </Layout>
  );
};

export default BookingPage;