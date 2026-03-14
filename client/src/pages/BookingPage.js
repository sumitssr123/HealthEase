import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
// row aur col import kiya hai layout ko do hisso mein baatne ke liye (left form, right map)
import { DatePicker, message, TimePicker, Card, Divider, Row, Col } from "antd";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { showLoading, hideLoading } from "../redux/features/alertSlice";

const BookingPage = () => {
  const { user } = useSelector((state) => state.user);
  const params = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [doctors, setDoctors] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);

  // doctor ki details database se lane ka function
  const getUserData = async () => {
    try {
      const res = await axios.post(
        "/api/v1/doctor/getDoctorById",
        { doctorId: params.doctorId },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // page load hote hi doctor ka data fetch karega
  useEffect(() => {
    getUserData();
    // eslint-disable-next-line
  }, []);

  // check karega ki us din aur time par doctor free hai ya nahi
  const handleAvailability = async () => {
    try {
      if (!date || !time) {
        return message.warning("please select date and time first");
      }
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/booking-availbility",
        { doctorId: params.doctorId, date, time },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        setIsAvailable(true);
        message.success(res.data.message);
      } else {
        setIsAvailable(false);
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("error checking availability");
    }
  };

  // jab free ho tab final appointment book karne ka function
  const handleBooking = async () => {
    try {
      if (!date || !time) {
        return message.warning("please select date and time");
      }
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/book-appointment",
        {
          doctorId: params.doctorId,
          userId: user._id,
          doctorInfo: doctors,
          userInfo: user,
          date: date,
          time: time,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        message.success("appointment booked successfully!");
        navigate("/appointments"); 
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("error while booking appointment");
    }
  };

  return (
    <Layout>
      <div className="container mt-4 mb-5">
        <h2 className="text-center mb-5" style={{ color: "#2c3e50", fontWeight: "bold" }}>
          Book Your Appointment
        </h2>
        
        {doctors && (
          /* row ka use karke screen ko split kiya hai. gutter 24 dono ke beech ka gap hai */
          <Row gutter={24}>
            
            {/* left side: doctor ki details aur booking form */}
            {/* xs 24 matlab mobile mein full width, md 12 matlab laptop mein half width */}
            <Col xs={24} md={12}>
              <Card
                className="shadow-sm bg-white rounded h-100"
                style={{ borderRadius: "15px", border: "1px solid #e8e8e8" }}
              >
                <h3 className="text-center text-dark">
                  <i className="fa-solid fa-user-doctor me-2"></i>
                  Dr. {doctors.firstName} {doctors.lastName}
                </h3>
                
                <p className="text-center text-muted mt-2">
                  <i className="fa-solid fa-location-dot text-danger me-2"></i> 
                  {doctors.address}
                </p>

                <Divider />
                
                <div className="d-flex justify-content-between mb-3 px-3">
                  <span className="text-muted"><i className="fa-solid fa-indian-rupee-sign me-2"></i> Consultation Fees:</span>
                  <b className="text-success fs-5">Rs. {doctors.feesPerCunsultation}</b>
                </div>
                
                <div className="d-flex justify-content-between mb-3 px-3">
                  <span className="text-muted"><i className="fa-solid fa-clock me-2"></i> Timings:</span>
                  <b>
                    {doctors.timings && moment(doctors.timings[0]).format("hh:mm A")} - {doctors.timings && moment(doctors.timings[1]).format("hh:mm A")}
                  </b>
                </div>
                
                <Divider dashed />

                <h5 className="text-center text-secondary mb-3">Select Date & Time</h5>
                <div className="d-flex flex-column align-items-center px-3">
                  
                  {/* date select karne ka input */}
                  <DatePicker
                    className="w-100 mb-3"
                    size="large"
                    format="DD-MM-YYYY"
                    onChange={(value, dateString) => {
                      setDate(dateString);
                      setIsAvailable(false); // date change par button hide ho jayega
                    }}
                    placeholder="Select Appointment Date"
                  />
                  
                  {/* time select karne ka input */}
                  <TimePicker
                    className="w-100 mb-3"
                    size="large"
                    format="HH:mm"
                    onChange={(value, timeString) => {
                      setTime(timeString);
                      setIsAvailable(false); // time change par button hide ho jayega
                    }}
                    placeholder="Select Appointment Time"
                  />

                  <button 
                    className="btn btn-primary btn-lg w-100 mt-2 shadow-sm" 
                    onClick={handleAvailability}
                    style={{ borderRadius: "8px", fontWeight: "bold" }}
                  >
                    Check Availability <i className="fa-solid fa-magnifying-glass ms-2"></i>
                  </button>

                  {/* agar available hai tabhi ye confirm wala button dikhega */}
                  {isAvailable && (
                    <button 
                      className="btn btn-success btn-lg w-100 mt-3 shadow-sm" 
                      onClick={handleBooking}
                      style={{ borderRadius: "8px", fontWeight: "bold" }}
                    >
                      Confirm Booking <i className="fa-solid fa-calendar-check ms-2"></i>
                    </button>
                  )}
                </div>
              </Card>
            </Col>

            {/* right side: google maps integration */}
            <Col xs={24} md={12}>
              <Card
                className="shadow-sm rounded h-100 p-0 overflow-hidden"
                style={{ borderRadius: "15px", border: "1px solid #e8e8e8" }}
                bodyStyle={{ padding: 0, height: "100%" }}
              >
                {/* agar doctor ka address database me hai toh map us address par point karega */}
                {doctors.address ? (
                  <iframe
                    title="clinic map"
                    width="100%"
                    height="100%"
                    style={{ minHeight: "450px", border: "none" }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    // encodeuricomponent address me extra spaces ko safe format me change karta hai
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(doctors.address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                ) : (
                  // jab tak load nahi hota tab tak ye placeholder dikhega
                  <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "450px", backgroundColor: "#f8f9fa" }}>
                    <i className="fa-solid fa-map-location-dot text-muted mb-3" style={{ fontSize: "50px" }}></i>
                    <h5 className="text-muted">loading clinic location...</h5>
                  </div>
                )}
              </Card>
            </Col>

          </Row>
        )}
      </div>
    </Layout>
  );
};

export default BookingPage;