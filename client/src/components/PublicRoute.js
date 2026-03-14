import React from "react";
import { Navigate } from "react-router-dom";

// public route component
export default function PublicRoute({ children }) {
  if (localStorage.getItem("token")) {
    // agar token hai toh seedha dashboard par bhejo
    return <Navigate to="/dashboard" />;
  } else {
    return children;
  }
}