import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../redux/features/alertSlice";
import { setUser } from "../redux/features/userSlice";

export default function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  // Redux se user nikalo
  const { user } = useSelector((state) => state.user);

  // API Call to get user
  const getUser = async () => {
    try {
      dispatch(showLoading());
      const res = await axios.post(
        "/api/v1/user/getUserData",
        { token: localStorage.getItem("token") },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      dispatch(hideLoading());
      if (res.data.success) {
        // Data aate hi Redux mein save karo
        dispatch(setUser(res.data.data));
      } else {
        // Agar token kharab hai, to login par bhejo
        localStorage.clear();
        return <Navigate to="/login" />;
      }
    } catch (error) {
      dispatch(hideLoading());
      localStorage.clear();
      console.log(error);
    }
  };

  useEffect(() => {
    // Agar user nahi hai, tabhi server se maango
    if (!user) {
      getUser();
    }
  }, [user, getUser]); // Dependencies add ki

  if (localStorage.getItem("token")) {
    return children;
  } else {
    return <Navigate to="/login" />;
  }
}