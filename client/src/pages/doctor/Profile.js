import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Col, Form, Input, Row, TimePicker, message } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { showLoading, hideLoading } from "../../redux/features/alertSlice";
import moment from "moment";

const Profile = () => {
  const { user } = useSelector((state) => state.user);
  const [doctor, setDoctor] = useState(null);
  const params = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- GET DOCTOR DETAILS ---
  useEffect(() => {
    const getDoctorInfo = async () => {
      try {
        const res = await axios.post(
          "/api/v1/doctor/getDoctorInfo",
          { userId: params.id },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (res.data.success) {
          setDoctor(res.data.data);
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (params.id) {
      getDoctorInfo();
    }
    // eslint-disable-next-line
  }, [params.id]); 

  // --- UPDATE PROFILE FUNCTION ---
  const handleFinish = async (values) => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/doctor/updateProfile",
        {
          ...values,
          userId: user._id,
          // Timings ko string format mein convert karna zaroori hai
          timings: [
            moment(values.timings[0]).format("HH:mm"),
            moment(values.timings[1]).format("HH:mm"),
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        message.success(res.data.message);
        navigate("/");
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("Something Went Wrong While Updating");
    }
  };

  return (
    <Layout>
      <h1 className="text-center p-2">Manage Profile</h1>
      {doctor && (
        <Form
          layout="vertical"
          onFinish={handleFinish}
          className="m-3"
          initialValues={{
            ...doctor,
            // Backend se aane wale time string ko moment object mein convert karna
            timings: [
              moment(doctor.timings[0], "HH:mm"),
              moment(doctor.timings[1], "HH:mm"),
            ],
          }}
        >
          <h4 className="mb-3">Personal Details:</h4>
          <Row gutter={20}>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="First Name" name="firstName" required rules={[{ required: true }]}>
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Last Name" name="lastName" required rules={[{ required: true }]}>
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Phone" name="phone" required rules={[{ required: true }]}>
                <Input placeholder="Phone Number" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Email" name="email" required rules={[{ required: true }]}>
                <Input placeholder="Email" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Website" name="website">
                <Input placeholder="Website URL" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Address" name="address" required rules={[{ required: true }]}>
                <Input placeholder="Clinic Address" />
              </Form.Item>
            </Col>
          </Row>

          <h4 className="mb-3 mt-3">Professional Details:</h4>
          <Row gutter={20}>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Specialization" name="specialization" required rules={[{ required: true }]}>
                <Input placeholder="Expertise" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Experience" name="experience" required rules={[{ required: true }]}>
                <Input placeholder="Years of Experience" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Fees" name="feesPerCunsultation" required rules={[{ required: true }]}>
                <Input placeholder="Consultation Fees" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
              <Form.Item label="Timings" name="timings" required>
                <TimePicker.RangePicker format="HH:mm" className="w-100" />
              </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}></Col>
            <Col xs={24} md={24} lg={8} className="d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit">
                Update Profile
              </button>
            </Col>
          </Row>
        </Form>
      )}
    </Layout>
  );
};

export default Profile;