const Post = require("../model/post-model");
const User = require("../model/user-model");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const createPost = async (req, res, next) => {
  try {
    const { title, category, description } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Please enter all required fields",
      });
    }

    if (!req.files) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Please upload a thumbnail image",
      });
    }

    if (!req.files.thumbnail) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Thumbnail field is required",
      });
    }

    const thumbnail = req.files.thumbnail;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(thumbnail.mimetype)) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Only JPG, JPEG, and PNG files are allowed",
      });
    }

    if (thumbnail.size > 20000000) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Thumbnail image size should not exceed 2MB",
      });
    }

    // Generate unique filename
    const fileName = thumbnail.name;
    const split = fileName.split(".");
    const extension = split[split.length - 1].toLowerCase();

    const newFileName = `${split[0]}-${uuidv4()}.${extension}`;

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, "../public/uploads/thumbnail");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move uploaded file
    try {
      await thumbnail.mv(path.join(uploadDir, newFileName));
    } catch (err) {
      return res.status(500).json({
        code: 500,
        status: "failed",
        error: "Failed to upload thumbnail",
        details: err.message,
      });
    }

    const newPost = new Post({
      title,
      category,
      description,
      thumbnail: newFileName,
      creator: req.user._id,
    });

    // Save post to database
    await newPost.save();

    // Update user's post count
    const currentUser = await User.findById(req.user._id);
    const userPostCount = (currentUser.posts || 0) + 1;
    await User.findByIdAndUpdate(req.user._id, { posts: userPostCount });

    res.status(201).json({
      code: 201,
      status: "success",
      message: "Post created successfully",
      data: {
        post: {
          _id: newPost._id,
          title: newPost.title,
          category: newPost.category,
          description: newPost.description,
          thumbnail: newFileName,
          creator: newPost.creator,
          createdAt: newPost.createdAt,
        },
      },
    });
  } catch (err) {
    // If error occurs, cleanup any uploaded file
    if (typeof newFileName !== "undefined") {
      const filePath = path.join(
        __dirname,
        "../public/uploads/thumbnail",
        newFileName
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return res.status(500).json({
      code: 500,
      status: "failed",
      error: "Internal server error",
      message: err.message,
    });
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find()
      .select(
        "_id title category description thumbnail creator createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    if (posts.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "not found",
        message: "No posts available",
      });
    }

    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Get all posts successfully",
      data: {
        posts: posts.map((post) => ({
          _id: post._id,
          title: post.title,
          category: post.category,
          description: post.description,
          thumbnail: post.thumbnail,
          creator: post.creator,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })),
        pagination: {
          totalPosts,
          totalPages,
          currentPage: Number(page),
          limit: Number(limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getPostId = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        status: "error",
        message: "Post id is invalid",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        code: 404,
        status: "not found",
        message: "Post not found",
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      data: {
        post: {
          _id: post._id,
          title: post.title,
          category: post.category,
          description: post.description,
          thumbnail: post.thumbnail,
          creator: post.creator,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getPostByCategory = async (req, res, next) => {
  try {
    const category = req.params.category;

    const posts = await Post.find({ category }).sort({ createdAt: -1 });

    if (posts.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "not found",
        message: `No posts found in category "${category}"`,
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Get all posts by category successfully",
      data: {
        posts: posts.map((post) => ({
          _id: post._id,
          title: post.title,
          category: post.category,
          description: post.description,
          thumbnail: post.thumbnail,
          creator: post.creator,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUserPost = async (req, res, next) => {
  try{
    const id = req.params.creator;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });

    if (posts.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "not found",
        message: `No posts found for user`,
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Get all posts by user successfully",
      data: {
        posts: posts.map((post) => ({
          _id: post._id,
          title: post.title,
          category: post.category,
          description: post.description,
          thumbnail: post.thumbnail,
          creator: post.creator,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        code: 400,
        status: "error",
        message: "Post id is invalid",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        code: 404,
        status: "not found",
        message: "Post not found",
      });
    }

    if (post.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        status: "forbidden",
        message: "You are not authorized to update this post",
      });
    }

    const { title, category, description } = req.body;
    
    if (!title || !category || !description) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Please enter all required fields",
      });
    }

    let newFileName;
    if (req.files && req.files.thumbnail) {
      const thumbnail = req.files.thumbnail;

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(thumbnail.mimetype)) {
        return res.status(400).json({
          code: 400,
          status: "failed",
          error: "Only JPG, JPEG, and PNG files are allowed",
        });
      }

      if (thumbnail.size > 20000000) {
        return res.status(400).json({
          code: 400,
          status: "failed",
          error: "Thumbnail image size should not exceed 2MB",
        });
      }

      const fileName = thumbnail.name;
      const split = fileName.split(".");
      const extension = split[split.length - 1].toLowerCase();
      newFileName = `${split[0]}-${uuidv4()}.${extension}`;

      const uploadDir = path.join(__dirname, "../public/uploads/thumbnail");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      try {
        await thumbnail.mv(path.join(uploadDir, newFileName));
        
        // Delete old thumbnail
        const oldFilePath = path.join(__dirname, "../public/uploads/thumbnail", post.thumbnail);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (err) {
        return res.status(500).json({
          code: 500,
          status: "failed",
          error: "Failed to upload thumbnail",
          details: err.message,
        });
      }
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        title,
        category,
        description,
        ...(newFileName && { thumbnail: newFileName }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Post updated successfully",
      data: {
        post: {
          _id: updatedPost._id,
          title: updatedPost.title,
          category: updatedPost.category,
          description: updatedPost.description,
          thumbnail: updatedPost.thumbnail,
          creator: updatedPost.creator,
          createdAt: updatedPost.createdAt,
          updatedAt: updatedPost.updatedAt,
        },
      },
    });
  } catch (err) {
    // Cleanup new thumbnail if error occurs
    if (typeof newFileName !== "undefined") {
      const filePath = path.join(
        __dirname,
        "../public/uploads/thumbnail",
        newFileName
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    next(err);
  }
};

const deleteArticle = async (req, res, next) => {
  try {
    const articleId = req.params.id;

    // Validasi ID artikel
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Invalid article ID format",
      });
    }

    // Cari artikel berdasarkan ID
    const article = await Article.findById(articleId);

    // Jika artikel tidak ditemukan
    if (!article) {
      return res.status(404).json({
        code: 404,
        status: "failed",
        error: "Article not found",
      });
    }

    // Periksa otorisasi pengguna
    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        status: "failed",
        error: "You are not authorized to delete this article",
      });
    }

    // Hapus cover image jika ada
    if (article.coverImage) {
      const filePath = path.join(
        __dirname,
        "../public/uploads/articles",
        article.coverImage
      );
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          return res.status(500).json({
            code: 500,
            status: "failed",
            error: "Failed to delete cover image",
            details: err.message,
          });
        }
      }
    }

    // Hapus artikel dari database
    await Article.findByIdAndDelete(articleId);

    // Respon sukses
    res.status(200).json({
      code: 200,
      status: "success",
      message: "Article deleted successfully",
    });
  } catch (err) {
    // Penanganan error
    next(err);
  }
};


module.exports = { createPost, getPosts, getPostId, getPostByCategory, getUserPost, updatePost, deleteArticle };
