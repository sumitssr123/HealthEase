const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    // 1. Header Check
    const authHeader = req.headers["authorization"];
    
    if (!authHeader) {
        return res.status(401).send({ message: "No Token Provided", success: false });
    }

    // 2. Token Extraction
    const token = authHeader.split(" ")[1];

    // 3. Verification
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        return res.status(200).send({
          message: "Auth Failed",
          success: false,
        });
      } else {
        
        // --- 🛠️ FIX: AGAR BODY NAHI HAI TO BANAO 🛠️ ---
        if (!req.body) {
            req.body = {}; 
        }
        // ----------------------------------------------

        req.body.userId = decode.id;
        next();
      }
    });
  } catch (error) {
    console.log(error);
    res.status(401).send({
      message: "Auth Failed",
      success: false,
    });
  }
};