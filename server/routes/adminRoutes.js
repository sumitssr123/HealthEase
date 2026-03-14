const express = require("express");
const {
  getAllUsersController,
  getAllDoctorsController,
  changeAccountStatusController, // <--- 1. Import This
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
); // <--- 2. Add New Route

module.exports = router;