import { createSlice } from "@reduxjs/toolkit";

export const userSlice = createSlice({
  name: "user",
  initialState: {
    user: null, // Shuru mein koi user nahi hai
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload; // Jab data aaye, toh user mein set kar do
    },
  },
});

export const { setUser } = userSlice.actions;