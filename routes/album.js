const express = require("express");
const Album = require("../models/album.model");
const { verifyAccessToken } = require("../middlewares/oauth");
const User = require("../models/user.model");
const Image = require("../models/image.model");

const albumRouter = express.Router();

albumRouter.post("/albums", verifyAccessToken, async (req, res) => {
  const { name, description } = req.body;
  const ownerID = req.user._id;
  try {
    const newAlbum = new Album({
      name,
      description,
      ownerID,
    });
    await newAlbum.save();

    res.status(201).json({
      message: "Album created successfully!",
      albumId: newAlbum.albumID,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create album", error: err.message });
  }
});

albumRouter.put("/albums/:albumID", verifyAccessToken, async (req, res) => {
  const { albumID } = req.params;
  const userID = req.user._id;
  const { description } = req.body;
  try {
    if (!description) {
      return res.status(400).json({
        message: "Description is required",
      });
    }

    const album = await Album.findOne({ albumID });

    if (!album) {
      return res.status(404).json({
        message: "Album not found",
      });
    }

    if (album.ownerID.toString() !== userID.toString()) {
      return res.status(403).json({
        message: "You are not authorized to update this album",
      });
    }

    album.description = description;
    await album.save();

    res.status(200).json({
      message: "Description updated successfully!",
      description: album.description,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update album description",
      error: err.message,
    });
  }
});

albumRouter.post(
  "/albums/:albumID/share",
  verifyAccessToken,
  async (req, res) => {
    try {
      const { albumID } = req.params;
      const { sharedUsers } = req.body; // emails[]
      const ownerID = req.user._id;

      if (!Array.isArray(sharedUsers) || sharedUsers.length === 0) {
        return res.status(400).json({
          message: "Emails array is required",
        });
      }

      const album = await Album.findOne({ albumID });

      if (!album) {
        return res.status(404).json({
          message: "Album not found",
        });
      }

      if (album.ownerID.toString() !== ownerID.toString()) {
        return res.status(403).json({
          message: "Only the owner can share this album",
        });
      }

      const users = await User.find({
        emailID: { $in: sharedUsers },
      });

      if (users.length === 0) {
        return res.status(400).json({
          message: "No valid users found",
        });
      }

      // Existing shared user IDs
      const existingUserIds = album.sharedUsers.map((u) => u.userID.toString());

      // Users already having access
      const alreadyShared = users.filter((user) =>
        existingUserIds.includes(user._id.toString()),
      );

      if (alreadyShared.length > 0) {
        return res.status(400).json({
          message: "This user already has access to this album",
          users: alreadyShared.map((u) => u.emailID),
        });
      }

      // Add new users with READ access
      users.forEach((user) => {
        if (user._id.toString() !== ownerID.toString()) {
          album.sharedUsers.push({
            userID: user._id,
            emailID: user.emailID,
            access: "read",
          });
        }
      });

      await album.save();

      res.status(200).json({
        message: "Album shared with read-only access",
        sharedUsers: album.sharedUsers,
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to share album",
        error: err.message,
      });
    }
  },
);

albumRouter.delete("/albums/:albumID", verifyAccessToken, async (req, res) => {
  const { albumID } = req.params;
  const ownerID = req.user._id;
  try {
    if (!albumID) {
      return res.status(400).json({ message: "albumID is required" });
    }
    const album = await Album.findOne({ albumID });

    if (!album) {
      return res.status(400).json({ message: "Album not found!" });
    }

    if (album.ownerID.toString() !== ownerID.toString()) {
      return res
        .status(403)
        .json({ message: "You are unauthorised to delete this album" });
    }

    await Image.deleteMany({ albumID: album._id });

    await Album.deleteOne({ albumID });

    res
      .status(200)
      .json({
        message: "Album deleted successfully!",
        deletedAlbum: album.name,
      });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete album",
      error: err.message,
    });
  }
});

module.exports = albumRouter;
