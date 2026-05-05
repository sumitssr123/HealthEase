const express = require("express");
const { chatController } = require("../controllers/chatbotController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/chat", authMiddleware, chatController);

module.exports = router;