const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const { initialiseDataBase } = require("./db/db.connect");
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

const oauthRouter = require("./routes/oauth");
const profileRouter = require("./routes/profile");
const albumRouter = require("./routes/album");
const imageRouter = require("./routes/image");

const fs = require("fs");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


app.use("/", oauthRouter);
app.use("/", profileRouter);
app.use("/", albumRouter);
app.use("/", imageRouter);
app.use("/uploads", express.static("uploads"));

initialiseDataBase();

app.get("/", (req, res) => {
  res.send("KaviosPix Backend");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("Server is running on", PORT));
