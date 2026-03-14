import React from "react";
import Layout from "../components/Layout";
import { Form, Input, message, Button, Card } from "antd";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { showLoading, hideLoading } from "../redux/features/alertSlice";

const UserProfile = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // Form Submit Handle
  const handleFinish = async (values) => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/update-profile",
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
        // Refresh page to show updated name
        window.location.reload(); 
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("Something went wrong");
    }
  };

  return (
    <Layout>
      <div className="container mt-5 d-flex justify-content-center">
        <Card 
          className="shadow-lg p-4 border-0" 
          style={{ width: "500px", borderRadius: "15px" }}
        >
          <div className="text-center mb-4">
            <div 
              className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{ width: "80px", height: "80px", fontSize: "35px", fontWeight: "bold" }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <h3 className="mt-3" style={{ color: "#2c3e50", fontWeight: "bold" }}>
              My Profile
            </h3>
            <p className="text-muted">Manage your personal information</p>
          </div>

          {user && (
            <Form
              layout="vertical"
              onFinish={handleFinish}
              initialValues={{
                name: user?.name,
                email: user?.email,
              }}
            >
              <Form.Item
                label={<span style={{ fontWeight: "bold" }}>Full Name</span>}
                name="name"
                rules={[{ required: true, message: "Please enter your name" }]}
              >
                <Input size="large" prefix={<i className="fa-regular fa-user me-2 text-muted"></i>} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: "bold" }}>Email Address</span>}
                name="email"
                rules={[{ required: true, message: "Please enter your email" }]}
              >
                <Input size="large" prefix={<i className="fa-regular fa-envelope me-2 text-muted"></i>} />
              </Form.Item>

              <div className="d-flex justify-content-end mt-4">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  className="w-100 shadow-sm"
                  style={{ borderRadius: "8px", fontWeight: "bold" }}
                >
                  Update Profile <i className="fa-solid fa-floppy-disk ms-2"></i>
                </Button>
              </div>
            </Form>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default UserProfile;