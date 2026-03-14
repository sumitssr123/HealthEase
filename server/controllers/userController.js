const doctorModel = require('../models/doctorModel');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const appointmentModel = require("../models/appointmentModel");
// LOGIC 1: REGISTER CALLBACK
const registerController = async (req, res) => {
  try {
    const existingUser = await userModel.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(200).send({ message: 'User Already Exist', success: false });
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;
    const newUser = new userModel(req.body);
    await newUser.save();
    res.status(201).send({ message: 'Register Successfully', success: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: `Register Controller ${error.message}` });
  }
};

// LOGIC 2: LOGIN CALLBACK
const loginController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res.status(200).send({ message: 'User not found', success: false });
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(200).send({ message: 'Invalid Email or Password', success: false });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).send({ message: 'Login Success', success: true, token });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: `Error in Login CTRL ${error.message}` });
  }
};

// LOGIC 3: AUTH CALLBACK (User Data Fetch)
const authController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });
    
    // User nahi mila
    if (!user) {
      return res.status(200).send({
        message: "User not found",
        success: false,
      });
    } else {
      user.password = undefined;
      res.status(200).send({
        success: true,
        data: user,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Auth Error",
      success: false,
      error,
    });
  }
};

// LOGIC 4: APPLY DOCTOR
const applyDoctorController = async (req, res) => {
  try {
    const newDoctor = await doctorModel({ ...req.body, status: 'pending' });
    await newDoctor.save();

    const adminUser = await userModel.findOne({ isAdmin: true });

    const notification = adminUser.notification;
    notification.push({
      type: 'apply-doctor-request',
      message: `${newDoctor.firstName} ${newDoctor.lastName} Has Applied For A Doctor Account`,
      data: {
        doctorId: newDoctor._id,
        name: newDoctor.firstName + " " + newDoctor.lastName,
        onClickPath: '/admin/doctors'
      }
    });

    await userModel.findByIdAndUpdate(adminUser._id, { notification });

    res.status(201).send({
      success: true,
      message: 'Doctor Account Applied Successfully'
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: 'Error While Applying For Doctor'
    });
  }
};

// LOGIC 5: MARK ALL NOTIFICATIONS AS READ
const getAllNotificationController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });
    const seennotification = user.seennotification;
    const notification = user.notification;
    
    seennotification.push(...notification);
    
    user.notification = [];
    user.seennotification = seennotification;
    
    const updatedUser = await user.save();
    updatedUser.password = undefined;

    res.status(200).send({
      success: true,
      message: "all notification marked as read",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message: "Error in notification",
      success: false,
      error,
    });
  }
};

// LOGIC 6: DELETE ALL READ NOTIFICATIONS
const deleteAllNotificationController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });
    
    user.seennotification = [];
    
    const updatedUser = await user.save();
    updatedUser.password = undefined;
    
    res.status(200).send({
      success: true,
      message: "Notifications Deleted Successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "unable to delete all notifications",
      error,
    });
  }
};

// LOGIC 7: GET ALL DOCTORS (HOME PAGE KE LIYE) <--- YE NAYA HAI 🟢
const getAllDoctorsController = async (req, res) => {
  try {
    const doctors = await doctorModel.find({ status: "approved" });
    res.status(200).send({
      success: true,
      message: "Doctors Lists Fetched Successfully",
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error While Fetching Doctor",
    });
  }
};
// BOOK APPOINTMENT
const bookAppointmentController = async (req, res) => {
  try {
    req.body.status = "pending";
    const newAppointment = new appointmentModel(req.body);
    await newAppointment.save();

    // Doctor ko Notification bhejo
    const user = await userModel.findOne({ _id: req.body.doctorInfo.userId });
    user.notification.push({
      type: "New-appointment-request",
      message: `A new Appointment Request from ${req.body.userInfo.name}`,
      onClickPath: "/doctor/appointments", // Baad mein banayenge
    });
    await user.save();

    res.status(200).send({
      success: true,
      message: "Appointment Booked Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error While Booking Appointment",
    });
  }
};
// GET USER APPOINTMENTS
const userAppointmentsController = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({ userId: req.body.userId });
    res.status(200).send({
      success: true,
      message: "Users Appointments Fetched Successfully",
      data: appointments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error In User Appointments",
    });
  }
};
// CHECK BOOKING AVAILABILITY
const bookingAvailabilityController = async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    // Database mein dhoondo ki is doctor ki same date aur time par koi booking hai kya?
    const appointments = await appointmentModel.find({
      doctorId,
      date,
      time,
    });

    if (appointments.length > 0) {
      return res.status(200).send({
        success: false,
        message: "Doctor is not available at this time",
      });
    } else {
      return res.status(200).send({
        success: true,
        message: "Slot is Available! You can book now.",
      });
    }
  } catch (error) {
    console.log("Error in Check Availability: ", error);
    res.status(500).send({
      success: false,
      error,
      message: "Error In Booking Availability",
    });
  }
};
// UPDATE USER PROFILE
const updateUserProfileController = async (req, res) => {
  try {
    const user = await userModel.findByIdAndUpdate(
      req.body.userId, 
      req.body, 
      { new: true }
    );
    user.password = undefined; // Password hide kar diya security ke liye
    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      data: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Updating Profile",
      error,
    });
  }
};


// EXPORTS
module.exports = { 
    loginController, 
    registerController, 
    authController, 
    applyDoctorController, 
    getAllNotificationController, 
    deleteAllNotificationController,
    getAllDoctorsController,
    bookAppointmentController,
    userAppointmentsController,
    bookingAvailabilityController,
    updateUserProfileController
};