import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag } from "antd";
import moment from "moment";

const DoctorList = ({ doctor }) => {
  const navigate = useNavigate();

  return (
    <Card
      className="shadow-sm m-2"
      hoverable
      style={{ width: "100%", borderRadius: "10px", border: "1px solid #e8e8e8" }}
      onClick={() => navigate(`/doctor/book-appointment/${doctor._id}`)}
      title={
        <div className="d-flex align-items-center">
          <i className="fa-solid fa-user-doctor fs-3 me-2 text-dark"></i>
          <span>Dr. {doctor.firstName} {doctor.lastName}</span>
        </div>
      }
    >
      <div className="d-flex flex-column gap-2">
        <p className="mb-0">
          <i className="fa-solid fa-stethoscope me-2 text-secondary"></i>
          <b>Specialization:</b> <Tag color="cyan">{doctor.specialization}</Tag>
        </p>
        
        {/* --- ADDRESS ADDED HERE 📍 --- */}
        <p className="mb-0">
           <i className="fa-solid fa-location-dot me-2 text-danger"></i>
           <b>Address:</b> {doctor.address}
        </p>

        <p className="mb-0">
          <i className="fa-solid fa-briefcase-medical me-2 text-secondary"></i>
          <b>Experience:</b> {doctor.experience}
        </p>
        <p className="mb-0">
          <i className="fa-solid fa-indian-rupee-sign me-2 text-secondary"></i>
          <b>Fees:</b> ₹{doctor.feesPerCunsultation}
        </p>
        
        {/* --- TIMING FORMAT FIXED HERE ⏰ --- */}
        <p className="mb-0">
          <i className="fa-solid fa-clock me-2 text-secondary"></i>
          <b>Timings:</b> {moment(doctor.timings[0]).format("hh:mm A")} - {moment(doctor.timings[1]).format("hh:mm A")}
        </p>
      </div>
    </Card>
  );
};

export default DoctorList;