const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const albumSchema = new mongoose.Schema(
  {
    albumID: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    ownerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedUsers: [
      {
        userID: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emailID: {
          type: String,
          required: true,
        },
        access: {
          type: String,
          enum: ["read"],
          default: "read",
        },
      },
    ],
  },
  { timestamps: true },
);

albumSchema.pre("save", function () {
  if (!this.albumID) {
    this.albumID = uuidv4();
  }
});

const Album = mongoose.model("Album", albumSchema);

module.exports = Album;
