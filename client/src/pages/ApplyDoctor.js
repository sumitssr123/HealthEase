import React from "react";
import Layout from "../components/Layout";
import { Col, Form, Input, Row, TimePicker, message } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showLoading, hideLoading } from "../redux/features/alertSlice";
import axios from "axios";

const ApplyDoctor = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Handle Form Submission
// Handle Form Submission
  const handleFinish = async (values) => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/apply-doctor",
        { ...values, userId: user._id },
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
        // ERROR FIX 1: Yahan pehle 'success' tha, ab 'message' kar diya
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      // ERROR FIX 2: Agar server error de, toh uska message dikhao
      message.error("Something Went Wrong"); 
    }
  };

  return (
    <Layout>
      <h1 className="text-center">Apply Doctor</h1>
      <hr />
      <Form layout="vertical" onFinish={handleFinish} className="m-3">
        {/* ... FORM FIELDS SAME RAHENGE (Jo pichle module mein the) ... */}
        {/* Agar aapne pichla code copy kiya tha toh bas wahi rehne dein, 
            sirf upar ka import aur handleFinish function badal lein. */}
            
            {/* ... Paste same form fields here form Module 16 ... */}
            <h4 className="">Personal Details :</h4>
            <Row gutter={20}>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="First Name" name="firstName" required rules={[{ required: true }]}>
                <Input type="text" placeholder="your first name" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Last Name" name="lastName" required rules={[{ required: true }]}>
                <Input type="text" placeholder="your last name" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Phone No" name="phone" required rules={[{ required: true }]}>
                <Input type="text" placeholder="your phone no" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Email" name="email" required rules={[{ required: true }]}>
                <Input type="email" placeholder="your email address" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Website" name="website">
                <Input type="text" placeholder="your website" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Address" name="address" required rules={[{ required: true }]}>
                <Input type="text" placeholder="your clinic address" />
                </Form.Item>
            </Col>
            </Row>
            <h4 className="mt-3">Professional Details :</h4>
            <Row gutter={20}>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Specialization" name="specialization" required rules={[{ required: true }]}>
                <Input type="text" placeholder="e.g. Cardiologist" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Experience" name="experience" required rules={[{ required: true }]}>
                <Input type="text" placeholder="e.g. 2 Years" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Fees Per Cunsultation" name="feesPerCunsultation" required rules={[{ required: true }]}>
                <Input type="text" placeholder="e.g. 500" />
                </Form.Item>
            </Col>
            <Col xs={24} md={24} lg={8}>
                <Form.Item label="Timings" name="timings" required>
                <TimePicker.RangePicker format="HH:mm" />
                </Form.Item>
            </Col>
            </Row>
            <div className="d-flex justify-content-end">
            <button className="btn btn-primary" type="submit">
                Submit
            </button>
            </div>
      </Form>
    </Layout>
  );
};

export default ApplyDoctor;