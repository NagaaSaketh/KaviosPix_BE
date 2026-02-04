const express = require("express");
const fs = require("fs");
const path = require("path");

const upload = require("../middlewares/upload");
const Image = require("../models/image.model");
const Album = require("../models/album.model");
const { verifyAccessToken } = require("../middlewares/oauth");

const imageRouter = express.Router();

imageRouter.post(
  "/albums/:albumID/images",
  verifyAccessToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const userID = req.user._id;
      const { albumID } = req.params;
      const { tags, person, isFavorite } = req.body;

      const album = await Album.findOne({ albumID });
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const hasAccess =
        album.ownerID.toString() === userID.toString() ||
        album.sharedUsers.some(
          (u) => u.userID.toString() === userID.toString(),
        );

      if (!hasAccess) {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }
        return res
          .status(403)
          .json({ message: "You do not have access to this album" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      const filePath = req.file.path;

      const allowedExts = [".jpg", ".jpeg", ".png", ".gif"];
      const ext = path.extname(filePath).toLowerCase();

      if (!allowedExts.includes(ext)) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: "Invalid image type" });
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: "Invalid tags format" });
        }
      }

      const image = new Image({
        albumID: album._id,
        name: req.file.originalname,
        tags: parsedTags,
        person,
        isFavorite,
        size: fileSize,
      });

      await image.save();

      res.status(201).json({
        message: "Image uploaded successfully",
        image,
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to upload image",
        error: err.message,
      });
    }
  },
);

imageRouter.put(
  "/albums/:albumID/images/:imageID/favorite",
  verifyAccessToken,
  async (req, res) => {
    try {
      const { albumID, imageID } = req.params;
      const userID = req.user._id;
      const { isFavorite } = req.body;

      if (typeof isFavorite !== "boolean") {
        return res.status(400).json({
          message: "isFavorite must be true or false",
        });
      }
      const album = await Album.findOne({ albumID });
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const image = await Image.findOne({ imageID });
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Ensuring image belongs to album
      if (!image.albumID.equals(album._id)) {
        return res.status(400).json({
          message: "Image does not belong to this album",
        });
      }

      if (album.ownerID.toString() !== ownerID.toString()) {
        return res.status(403).json({
          message: "Only album owner can favorite images",
        });
      }

      image.isFavorite = isFavorite;
      await image.save();

      res.status(200).json({
        message: isFavorite ? "Marked as favorite" : "Unmarked as favorite",
        image,
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to update favorite status",
        error: err.message,
      });
    }
  },
);

imageRouter.post(
  "/albums/:albumID/images/:imageID/comments",
  verifyAccessToken,
  async (req, res) => {
    try {
      const { albumID, imageID } = req.params;
      const { comment } = req.body;
      const ownerID = req.user._id;

      const image = await Image.findOne({ imageID });
      if (!image) {
        return res.status(404).json({ message: "No image found" });
      }
      const album = await Album.findOne({ albumID });
      if (!album) {
        return res.status(404).json({ message: "No album found" });
      }

      if (!comment || typeof comment !== "string") {
        return res.status(400).json({
          message: "Comment is required and must be a string",
        });
      }

      // Ensuring image belongs to album
      if (!image.albumID.equals(album._id)) {
        return res.status(400).json({
          message: "Image does not belong to this album",
        });
      }

      // Checking owner is the user to comment
      if (album.ownerID.toString() !== ownerID.toString()) {
        return res.status(403).json({ message: "You are unauthorised!" });
      }

      image.comments.push(comment);
      await image.save();

      res.status(201).json({
        message: "Comment added successfully",
        comments: image.comments,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to post comment", error: err.message });
    }
  },
);

imageRouter.delete(
  "/albums/:albumID/images/:imageID",
  verifyAccessToken,
  async (req, res) => {
    try {
      const { albumID, imageID } = req.params;
      const ownerID = req.user._id;

      const album = await Album.findOne({ albumID });
      if (!album) {
        return res.status(404).json({ message: "No album found" });
      }

      // Check user's access
      if (album.ownerID.toString() !== ownerID.toString()) {
        return res
          .status(403)
          .json({ message: "You are not authorized to delete" });
      }

      const image = await Image.findOne({ imageID });
      if (!image) {
        return res.status(404).json({ message: "No image found" });
      }

      if (!image.albumID.equals(album._id)) {
        return res
          .status(403)
          .json({ message: "Image doesn't belong to this album" });
      }

      await Image.deleteOne({ imageID });

      res.status(200).json({
        message: "Image deleted successfully",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to delete image", error: err.message });
    }
  },
);

module.exports = imageRouter;
