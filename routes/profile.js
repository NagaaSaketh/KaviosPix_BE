const express = require("express");
const { verifyAccessToken } = require("../middlewares/oauth");

const profileRouter = express.Router();

profileRouter.get("/profile/view", verifyAccessToken, async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json(user);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to view user profile", error: err.message });
  }
});


module.exports = profileRouter