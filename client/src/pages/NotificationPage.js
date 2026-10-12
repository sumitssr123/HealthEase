import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { message, Tabs, Button, Empty } from "antd";
import { useAuth } from "../context/AuthContext";
import API from "../api";

const NotificationPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // 1. MARK ALL READ
  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/user/get-all-notification", {
        userId: user?._id || user?.id,
      });
      setLoading(false);
      if (res.data.success) {
        message.success(res.data.message);
        if (res.data.data) {
          setUser(res.data.data);
        }
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      message.error(error.response?.data?.message || "Failed to mark notifications as read");
    }
  };

  // 2. DELETE ALL READ
  const handleDeleteAllRead = async () => {
    try {
      setLoading(true);
      const res = await API.post("/api/v1/user/delete-all-notification", {
        userId: user?._id || user?.id,
      });
      setLoading(false);
      if (res.data.success) {
        message.success(res.data.message);
        if (res.data.data) {
          setUser(res.data.data);
        }
      } else {
        message.error(res.data.message);
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
      message.error(error.response?.data?.message || "Failed to delete read notifications");
    }
  };

  const unreadList = user?.notification || [];
  const readList = user?.seennotification || [];

  // 3. TABS CONFIGURATION
  const items = [
    {
      key: "0",
      label: `Unread (${unreadList.length})`,
      children: (
        <>
          <div className="d-flex justify-content-end mb-2">
            {unreadList.length > 0 && (
              <Button
                type="link"
                className="text-primary p-0"
                onClick={handleMarkAllRead}
                loading={loading}
                style={{ fontSize: "15px", fontWeight: "600" }}
              >
                Mark All Read <i className="fa-solid fa-check-double ms-1"></i>
              </Button>
            )}
          </div>
          {unreadList.length === 0 ? (
            <Empty description="No New Notifications" className="my-5" />
          ) : (
            unreadList.map((notificationMgs, index) => {
              const targetPath = notificationMgs?.onClickPath || notificationMgs?.data?.onClickPath;
              return (
                <div 
                  className="card shadow-sm mb-2" 
                  style={{ 
                    borderLeft: "5px solid #1890ff", 
                    borderRadius: "8px",
                    cursor: targetPath ? "pointer" : "default",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  key={index}
                  onClick={() => {
                    if (targetPath) navigate(targetPath);
                  }}
                >
                  <div className="card-body py-3 d-flex align-items-center justify-content-between">
                    <div>
                      <i className="fa-solid fa-bell text-primary me-2"></i>
                      <span>{notificationMgs.message || notificationMgs}</span>
                    </div>
                    {targetPath && (
                      <span className="badge bg-light text-primary border" style={{ fontSize: "11px" }}>
                        View Details <i className="fa-solid fa-arrow-right ms-1"></i>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      ),
    },
    {
      key: "1",
      label: `Read (${readList.length})`,
      children: (
        <>
          <div className="d-flex justify-content-end mb-2">
            {readList.length > 0 && (
              <Button
                type="link"
                danger
                className="p-0"
                onClick={handleDeleteAllRead}
                loading={loading}
                style={{ fontSize: "15px", fontWeight: "600" }}
              >
                Delete All Read <i className="fa-solid fa-trash ms-1"></i>
              </Button>
            )}
          </div>
          {readList.length === 0 ? (
            <Empty description="No Read Notifications" className="my-5" />
          ) : (
            readList.map((notificationMgs, index) => {
              const targetPath = notificationMgs?.onClickPath || notificationMgs?.data?.onClickPath;
              return (
                <div 
                  className="card shadow-sm mb-2" 
                  style={{ 
                    backgroundColor: "#f8f9fa", 
                    borderRadius: "8px",
                    cursor: targetPath ? "pointer" : "default",
                  }}
                  key={index}
                  onClick={() => {
                    if (targetPath) navigate(targetPath);
                  }}
                >
                  <div className="card-body py-3 d-flex align-items-center justify-content-between">
                    <div>
                      <i className="fa-solid fa-envelope-open text-secondary me-2"></i>
                      <span className="text-secondary">{notificationMgs.message || notificationMgs}</span>
                    </div>
                    {targetPath && (
                      <span className="badge bg-white text-secondary border" style={{ fontSize: "11px" }}>
                        View <i className="fa-solid fa-arrow-right ms-1"></i>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      ),
    },
  ];

  return (
    <Layout>
      <div className="container py-4" style={{ maxWidth: "800px" }}>
        <div className="d-flex align-items-center mb-3">
          <i className="fa-solid fa-bell text-primary fs-3 me-2"></i>
          <h3 className="m-0" style={{ color: "#2c3e50", fontWeight: "bold" }}>Notification Center</h3>
        </div>
        <div className="card p-4 shadow-sm border-0" style={{ borderRadius: "12px" }}>
          <Tabs defaultActiveKey="0" items={items} />
        </div>
      </div>
    </Layout>
  );
};

export default NotificationPage;