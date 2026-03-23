const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");

const upload = multer({ dest: "temp/" });

module.exports = upload;
