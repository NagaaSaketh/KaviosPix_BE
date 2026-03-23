const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const upload = multer({ dest: "temp/" });

module.exports = upload;
