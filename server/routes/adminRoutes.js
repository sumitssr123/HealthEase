const express = require("express");
const {
  getAllUsersController,
  getAllDoctorsController,
  changeAccountStatusController,
  blockUserController, // <--- 1. Import (Ye sahi tha tumhara)
} = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET METHOD || USERS
router.get("/getAllUsers", authMiddleware, getAllUsersController);

// GET METHOD || DOCTORS
router.get("/getAllDoctors", authMiddleware, getAllDoctorsController);

// POST ACCOUNT STATUS || APPROVE/REJECT
router.post(
  "/changeAccountStatus",
  authMiddleware,
  changeAccountStatusController
);

// POST || BLOCK USER (NAYA ROUTE ALAG SE BANA HAI 🟢)
router.post(
  "/blockUser",
  authMiddleware,
  blockUserController
);

module.exports = router;