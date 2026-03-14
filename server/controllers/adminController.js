const doctorModel = require("../models/doctorModel");
const userModel = require("../models/userModel");

// 1. GET ALL USERS LIST
const getAllUsersController = async (req, res) => {
  try {
    const users = await userModel.find({});
    res.status(200).send({
      success: true,
      message: "users data list",
      data: users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while fetching users",
      error,
    });
  }
};

// 2. GET ALL DOCTORS LIST
const getAllDoctorsController = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    res.status(200).send({
      success: true,
      message: "Doctors Data list",
      data: doctors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "error while getting doctors data",
      error,
    });
  }
};

// 3. ACCOUNT STATUS CHANGER (Approve/Reject Logic)
const changeAccountStatusController = async (req, res) => {
  try {
    const { doctorId, status } = req.body;
    
    // 1. Doctor ka status update karo (pending -> approved)
    const doctor = await doctorModel.findByIdAndUpdate(doctorId, { status });

    // 2. User ko dhoondo taaki notification bhej sakein
    const user = await userModel.findOne({ _id: doctor.userId });

    // 3. Notification bhejoh
    const notification = user.notification;
    notification.push({
      type: "doctor-account-request-updated",
      message: `Your Doctor Account Request Has ${status}`,
      data: {
        onClickPath: "/notification",
      },
    });

    // 4. Agar status "approved" hai, toh User ko Doctor bana do
    user.isDoctor = status === "approved" ? true : false;
    
    // 5. Data save karo
    await user.save();

    res.status(201).send({
      success: true,
      message: "Account Status Updated",
      data: doctor,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Account Status",
      error,
    });
  }
};

// Teeno functions export karein
module.exports = { 
  getAllUsersController, 
  getAllDoctorsController, 
  changeAccountStatusController 
};