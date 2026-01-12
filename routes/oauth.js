const express = require("express");
const axios = require("axios");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../middlewares/oauth");
const bcrypt = require("bcrypt");
const { User } = require("../models/user");

const oauthRouter = express.Router();

oauthRouter.use(cookieParser());

oauthRouter.get("/user/profile", verifyAccessToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

oauthRouter.get("/auth/google", (req, res) => {
  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=openid email profile` +
    `&access_type=offline` +
    `&prompt=consent`;
  res.redirect(googleAuthUrl);
});

oauthRouter.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send({ message: "Authorization code not provided" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Fetch user data from Google
    const googleUserResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const googleData = googleUserResponse.data;
    const primaryEmail = googleData.email;

    // Check if user exists by email or Google ID
    let user = await User.findOne({
      $or: [{ emailID: primaryEmail }, { userID: googleData.id }],
    });

    if (user) {
      // If user exists by email but doesn't have userID, link the Google account
      if (!user.userID) {
        user.userID = googleData.id;
        await user.save();
      }

      // Create JWT token for existing user
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      });

      return res.redirect(`${process.env.FRONTEND_URL}/`);
    } else {
      // New user - create account
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      if (!googleData.id) {
        throw new Error("Google user ID missing");
      }

      const newUser = new User({
        userID: String(googleData.id),
        emailID: primaryEmail,
        password: hashedPassword,
        name: googleData.name,
        photoUrl:googleData.picture,
      });

      await newUser.save();

      const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      });

      return res.redirect(`${process.env.FRONTEND_URL}/home`);
    }
  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

oauthRouter.post("/logout",async(req,res)=>{
    res.cookie("token",null,{expires:new Date(Date.now())});
    res.status(200).send("Logout Successful!")
})


module.exports = oauthRouter;
