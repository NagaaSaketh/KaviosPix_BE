const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const imageSchema = new mongoose.Schema(
  {
    imageID: {
      type: String,
      unique: true,
      index: true,
    },
    albumID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    person: {
      type: String,
    },

    isFavorite: {
      type: Boolean,
      default: false,
    },

    comments: [
      {
        type: String,
      },
    ],
    size: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

imageSchema.pre("save", function () {
  if (!this.imageID) {
    this.imageID = uuidv4();
  }
});

const Image = mongoose.model("Image", imageSchema);

module.exports = Image;
