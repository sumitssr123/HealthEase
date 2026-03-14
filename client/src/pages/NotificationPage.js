import React from "react";
import Layout from "../components/Layout";
import { message, Tabs } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { showLoading, hideLoading } from "../redux/features/alertSlice";
import { setUser } from "../redux/features/userSlice"; // Logic Best hai!
import { useNavigate } from "react-router-dom";
import axios from "axios";

const NotificationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  // 1. MARK ALL READ
  const handleMarkAllRead = async () => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/get-all-notification",
        { userId: user._id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        message.success(res.data.message);
        dispatch(setUser(res.data.data)); // Page reload nahi hoga, smooth update!
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("Something went wrong");
    }
  };

  // 2. DELETE ALL READ
  const handleDeleteAllRead = async () => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/delete-all-notification",
        { userId: user._id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        message.success(res.data.message);
        dispatch(setUser(res.data.data));
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      dispatch(hideLoading());
      console.log(error);
      message.error("Something Went Wrong In Delete Notifications");
    }
  };

  // 3. TABS CONFIGURATION (Premium UI + New Logic)
  const items = [
    {
      key: "0",
      label: "Unread",
      children: (
        <>
          <div className="d-flex justify-content-end">
            <h4 
              className="p-2 text-primary" 
              onClick={handleMarkAllRead} 
              style={{ cursor: "pointer", fontSize: '16px', textDecoration: 'underline' }}
            >
              Mark All Read <i className="fa-solid fa-check-double ms-1"></i>
            </h4>
          </div>
          {user?.notification?.length === 0 ? (
             <div className="text-center mt-3 text-muted">No New Notifications</div>
          ) : (
             user?.notification?.map((notificationMgs, index) => (
            <div 
                className="card shadow-sm mb-2" 
                style={{ cursor: "pointer", borderLeft: "5px solid #1890ff" }} 
                key={index}
            >
              <div
                className="card-body"
                onClick={() => navigate(notificationMgs.onClickPath)} // .data hata diya ✅
              >
                <i className="fa-solid fa-bell text-primary me-2"></i>
                {notificationMgs.message}
              </div>
            </div>
          )))}
        </>
      ),
    },
    {
      key: "1",
      label: "Read",
      children: (
        <>
          <div className="d-flex justify-content-end">
            <h4
              className="p-2 text-danger"
              style={{ cursor: "pointer", fontSize: '16px', textDecoration: 'underline' }}
              onClick={handleDeleteAllRead}
            >
              Delete All Read <i className="fa-solid fa-trash ms-1"></i>
            </h4>
          </div>
          {user?.seennotification?.map((notificationMgs, index) => (
            <div 
                className="card shadow-sm mb-2" 
                style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }} 
                key={index}
            >
              <div
                className="card-body"
                onClick={() => navigate(notificationMgs.onClickPath)} // .data hata diya ✅
              >
                <i className="fa-solid fa-envelope-open text-secondary me-2"></i>
                {notificationMgs.message}
              </div>
            </div>
          ))}
        </>
      ),
    },
  ];

  return (
    <Layout>
      <div className="p-3">
        <h3 className="text-center text-secondary">Notification Center</h3>
        <Tabs defaultActiveKey="0" items={items} className="mt-3" />
      </div>
    </Layout>
  );
};

export default NotificationPage;