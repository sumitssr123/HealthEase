const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getDoctorInfoController,
  updateProfileController,
  getDoctorByIdController,
  doctorAppointmentsController, // <--- NAYA IMPORT 🟢
  updateStatusController,       // <--- NAYA IMPORT 🟢
} = require("../controllers/doctorController");

const router = express.Router();

// POST SINGLE DOCTOR INFO
router.post("/getDoctorInfo", authMiddleware, getDoctorInfoController);

// POST UPDATE PROFILE
router.post("/updateProfile", authMiddleware, updateProfileController);

// POST GET SINGLE DOCTOR BY ID (Booking ke liye)
router.post("/getDoctorById", authMiddleware, getDoctorByIdController);

// GET APPOINTMENTS (Doctor ke liye) <--- NAYA ROUTE 🟢
router.get("/doctor-appointments", authMiddleware, doctorAppointmentsController);

// POST UPDATE STATUS (Approve/Reject) <--- NAYA ROUTE 🟢
router.post("/update-status", authMiddleware, updateStatusController);

module.exports = router;