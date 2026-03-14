import { configureStore } from "@reduxjs/toolkit";
import { alertSlice } from "./features/alertSlice";
import { userSlice } from "./features/userSlice"; // <--- Import This

export default configureStore({
  reducer: {
    alerts: alertSlice.reducer,
    user: userSlice.reducer, // <--- Add This
  },
});