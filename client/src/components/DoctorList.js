import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag } from "antd";
import moment from "moment";

const DoctorList = ({ doctor }) => {
  const navigate = useNavigate();

  const formatTimings = (timings) => {
    if (!timings || !Array.isArray(timings) || timings.length < 2) return "09:00 - 18:00";
    const start = moment(timings[0], ["HH:mm", "YYYY-MM-DDTHH:mm:ssZ"], true);
    const end = moment(timings[1], ["HH:mm", "YYYY-MM-DDTHH:mm:ssZ"], true);
    if (start.isValid() && end.isValid()) {
      return `${start.format("hh:mm A")} - ${end.format("hh:mm A")}`;
    }
    return `${timings[0]} - ${timings[1]}`;
  };

  return (
    <Card
      className="shadow-sm m-2"
      hoverable
      style={{ width: "100%", borderRadius: "10px", border: "1px solid #e8e8e8" }}
      onClick={() => navigate(`/doctor/book-appointment/${doctor?._id || doctor?.id}`)}
      title={
        <div className="d-flex align-items-center">
          <i className="fa-solid fa-user-doctor fs-3 me-2 text-dark"></i>
          <span>Dr. {doctor?.firstName} {doctor?.lastName}</span>
        </div>
      }
    >
      <div className="d-flex flex-column gap-2">
        <p className="mb-0">
          <i className="fa-solid fa-stethoscope me-2 text-secondary"></i>
          <b>Specialization:</b> <Tag color="cyan">{doctor?.specialization}</Tag>
        </p>
        
        <p className="mb-0">
           <i className="fa-solid fa-location-dot me-2 text-danger"></i>
           <b>Address:</b> {doctor?.address}
        </p>

        <p className="mb-0">
          <i className="fa-solid fa-briefcase-medical me-2 text-secondary"></i>
          <b>Experience:</b> {doctor?.experience}
        </p>
        <p className="mb-0">
          <i className="fa-solid fa-indian-rupee-sign me-2 text-secondary"></i>
          <b>Fees:</b> ₹{doctor?.feesPerCunsultation}
        </p>
        
        <p className="mb-0">
          <i className="fa-solid fa-clock me-2 text-secondary"></i>
          <b>Timings:</b> {formatTimings(doctor?.timings)}
        </p>
      </div>
    </Card>
  );
};

export default DoctorList;