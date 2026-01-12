const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const { initialiseDataBase } = require("./db/db.connect");
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const oauthRouter = require("./routes/oauth");

app.use("/", oauthRouter);

initialiseDataBase();

app.get("/", (req, res) => {
  res.send("KaviosPix Backend");
});

const PORT = 3000;

app.listen(PORT, () => console.log("Server is running on", PORT));
