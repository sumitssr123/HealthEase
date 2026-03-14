const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");

// SABHI CONTROLLERS EK HI JAGAH IMPORT KIYE 🟢
const {
  loginController,
  registerController,
  authController,
  applyDoctorController,
  getAllNotificationController, 
  deleteAllNotificationController, 
  getAllDoctorsController,
  bookAppointmentController, 
  userAppointmentsController,
  bookingAvailabilityController, // <--- FIX 1: Ye yahan MISSING tha!
  updateUserProfileController
} = require("../controllers/userController");

// router object
const router = express.Router();

// routes
// LOGIN || POST
router.post("/login", loginController);

// REGISTER || POST
router.post("/register", registerController);

// Auth || POST
router.post("/getUserData", authMiddleware, authController);

// APPLY DOCTOR || POST
router.post("/apply-doctor", authMiddleware, applyDoctorController);

// Notification User || POST
router.post(
  "/get-all-notification",
  authMiddleware,
  getAllNotificationController
);

// Delete Notification || POST
router.post(
  "/delete-all-notification",
  authMiddleware,
  deleteAllNotificationController
);

// GET ALL DOCTORS || GET (Home Page ke liye)
router.get("/getAllDoctors", authMiddleware, getAllDoctorsController);

// BOOK APPOINTMENT || POST
router.post("/book-appointment", authMiddleware, bookAppointmentController);

// GET USER APPOINTMENTS || GET
router.get("/user-appointments", authMiddleware, userAppointmentsController);

// POST || CHECK AVAILABILITY <--- FIX 2: Ise UPAR le aaye hain
router.post("/booking-availbility", authMiddleware, bookingAvailabilityController);

// UPDATE USER PROFILE || POST
router.post("/update-profile", authMiddleware, updateUserProfileController);
// EXPORT HAMESHA SABSE NEECHE HOTA HAI 🟢
module.exports = router;