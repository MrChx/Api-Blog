const Article = require("../model/article-model");
const User = require("../model/user-model");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const slugify = require("slugify");

const createArticle = async (req, res, next) => {
  try {
    const { title, content, excerpt, tags, status } = req.body;

    if (!title || !content || !excerpt || !tags || !status) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Please enter all required fields",
      });
    }

    // Generate slug from title
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Check if slug already exists
    const existingArticle = await Article.findOne({ slug });
    if (existingArticle) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "An article with this title already exists",
      });
    }

    let coverImageFileName = null;

    if (req.files && req.files.coverImage) {
      const coverImage = req.files.coverImage;

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(coverImage.mimetype)) {
        return res.status(400).json({
          code: 400,
          status: "failed",
          error: "Only JPG, JPEG, and PNG files are allowed",
        });
      }

      if (coverImage.size > 2000000) {
        return res.status(400).json({
          code: 400,
          status: "failed",
          error: "Cover image size should not exceed 2MB",
        });
      }

      const fileName = coverImage.name;
      const split = fileName.split(".");
      const extension = split[split.length - 1].toLowerCase();
      coverImageFileName = `${split[0]}-${uuidv4()}.${extension}`;

      const uploadDir = path.join(__dirname, "../public/uploads/articles");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      try {
        await coverImage.mv(path.join(uploadDir, coverImageFileName));
      } catch (err) {
        return res.status(500).json({
          code: 500,
          status: "failed",
          error: "Failed to upload cover image",
          details: err.message,
        });
      }
    }


    const processedTags = tags ? JSON.parse(tags).map(tag => tag.trim()) : [];

    const newArticle = new Article({
      title,
      slug,
      content,
      excerpt,
      tags: processedTags,
      coverImage: coverImageFileName,
      author: req.user._id,
      status: status || "draft",
    });

    await newArticle.save();

    res.status(201).json({
      code: 201,
      status: "success",
      message: "Article created successfully",
      data: {
        article: {
          _id: newArticle._id,
          title: newArticle.title,
          slug: newArticle.slug,
          content: newArticle.content,
          excerpt: newArticle.excerpt,
          tags: newArticle.tags,
          coverImage: newArticle.coverImage,
          author: newArticle.author,
          status: newArticle.status,
          createdAt: newArticle.createdAt,
        },
      },
    });
  } catch (err) {
    // If error occurs, cleanup any uploaded file
    if (coverImageFileName) {
      const filePath = path.join(
        __dirname,
        "../public/uploads/articles",
        coverImageFileName
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Handle specific MongoDB errors
    if (err.code === 11000) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Duplicate article slug. Please use a different title.",
      });
    }

    return res.status(500).json({
      code: 500,
      status: "failed",
      error: "Internal server error",
      message: err.message,
    });
  }
};

module.exports = { createArticle };