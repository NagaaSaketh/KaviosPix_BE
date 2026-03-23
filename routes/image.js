const express = require("express");
const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

const upload = require("../middlewares/upload");
const Image = require("../models/image.model");
const Album = require("../models/album.model");
const { verifyAccessToken } = require("../middlewares/oauth");

const imageRouter = express.Router();

const fs = require("fs");

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
          (u) => u.userID.toString() === userID.toString()
        );

      if (!hasAccess) {
        if (req.file?.path) fs.unlinkSync(req.file.path); 
        return res.status(403).json({
          message: "You do not have access to this album",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }



      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path); 
        return res.status(400).json({ message: "Invalid image type" });
      }

      let parsedTags = [];
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          fs.unlinkSync(req.file.path); 
          return res.status(400).json({ message: "Invalid tags format" });
        }
      }



      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "kaviospix",
      });

      fs.unlinkSync(req.file.path); 



      const image = new Image({
        albumID: album._id,
        name: result.original_filename,
        imageUrl: result.secure_url,
        public_id: result.public_id,
        tags: parsedTags,
        person,
        isFavorite,
        size: result.bytes,
      });

      await image.save();

      res.status(201).json({
        message: "Image uploaded successfully",
        image,
      });
    } catch (err) {
      console.error(err);

      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        message: "Failed to upload image",
        error: err.message,
      });
    }
  }
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

      if (album.ownerID.toString() !== userID.toString()) {
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

      const image = await Image.findOne({ imageID }).populate(
        "comments.userID",
        "name photoUrl",
      );
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

      const isOwner = album.ownerID.equals(ownerID);

      const isSharedUser = album.sharedUsers?.some(
        (user) => user.userID?.toString() === ownerID.toString(),
      );

      if (!isOwner && !isSharedUser) {
        return res.status(403).json({
          message: "You are not authorised to comment.",
        });
      }

      image.comments.push({ userID: ownerID, comment });
      await image.save();

      const updatedImage = await Image.findOne({ imageID }).populate(
        "comments.userID",
        "name photoUrl",
      );

      res.status(201).json({
        message: "Comment added successfully",
        comments: updatedImage.comments,
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
