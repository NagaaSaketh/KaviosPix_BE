const mongoose = require("mongoose");

const mongo = process.env.MONGO_URI;

const initialiseDataBase = async () => {
  await mongoose
    .connect(mongo)
    .then(() => console.log("Database connected successfully!"))
    .catch((err) => console.log(err));
};

module.exports = { initialiseDataBase };
