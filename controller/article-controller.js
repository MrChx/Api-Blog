const Article = require("../model/article-model");
const User = require("../model/user-model");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const slugify = require("slugify");
const mongoose = require("mongoose");

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

const getArticle = async (req, res) => {
  try{
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const articles = await Article.find()
      .populate('author', '_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    if (!articles.length) {
      return res.status(404).json({
        code: 404,
        status: "failed",
        error: "No articles found",
      });
    }

    const totalArticles = await Article.countDocuments();
    const totalPages = Math.ceil(totalArticles / limit);

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Get all articles successfully",
      data: {
        articles,
      },
      pagination: {
        totalArticles,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

const searchArticles = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const searchPattern = new RegExp(search, 'i');

    // Build the search query
    const searchQuery = {
      $or: [
        { slug: searchPattern },
        { title: searchPattern }
      ]
    };

    // Get filtered articles
    const articles = await Article.find(searchQuery)
      .populate('author', '_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count of matching articles
    const totalArticles = await Article.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalArticles / limit);

    if (!articles.length) {
      return res.status(404).json({
        code: 404,
        status: "failed",
        error: "The article you are looking for does not exist",
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Articles found successfully",
      data: {
        articles
      },
      pagination: {
        totalArticles,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
      },
      search: {
        term: search,
        matchCount: totalArticles
      }
    });

  } catch (err) {
    res.status(500).json({
      code: 500,
      status: "failed",
      error: "Internal server error",
      message: err.message,
    });
  }
};

const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, tags, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Invalid article ID format",
      });
    }

    if (!title || !content || !excerpt || !tags || !status) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Please enter all required fields",
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        code: 404,
        status: "failed",
        error: "Article not found",
      });
    }

    if (article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        code: 403,
        status: "failed",
        error: "You are not authorized to update this article",
      });
    }

    // Generate new slug if title changed
    let slug = article.slug;
    if (title !== article.title) {
      slug = slugify(title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });

      // Check if new slug already exists (excluding current article)
      const slugExists = await Article.findOne({
        slug,
        _id: { $ne: id }
      });

      if (slugExists) {
        return res.status(400).json({
          code: 400,
          status: "failed",
          error: "An article with this title already exists",
        });
      }
    }

    let coverImageFileName = article.coverImage;

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
        if (article.coverImage) {
          const oldFilePath = path.join(uploadDir, article.coverImage);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

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

    // Process tags
    const processedTags = tags ? JSON.parse(tags).map(tag => tag.trim()) : article.tags;

    // Update article
    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      {
        title,
        slug,
        content,
        excerpt,
        tags: processedTags,
        coverImage: coverImageFileName,
        status: status || article.status,
      },
      { new: true }
    ).populate('author', '_id');

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Article updated successfully",
      data: {
        article: updatedArticle
      }
    });

  } catch (err) {
    // If error occurs, cleanup any newly uploaded file
    if (req.files && req.files.coverImage && coverImageFileName) {
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

    res.status(500).json({
      code: 500,
      status: "failed",
      error: "Internal server error",
      message: err.message,
    });
  }
};

const deleteArctile = async (req, res, next) => {
  try{
    const articleId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({
        code: 400,
        status: "failed",
        error: "Invalid article ID format",
      });
    }

    const article = await Article.findById(articleId);

    if(!article){
      return res.status(404).json({
        code: 404,
        status: "failed",
        error: "Article not found",
      });
    } 

    if(article.author.toString() !== req.user._id.toString()){
      return res.status(403).json({
        code: 403,
        status: "failed",
        error: "You are not authorized to delete this article",
      });
    }

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

      await Article.findByIdAndDelete(articleId);
      res.status(200).json({
        code: 200,
        status: "success",
        message: "Article deleted successfully",
      });
    } 
  } catch (err) {
    next(err);
  }
}

module.exports = { createArticle, getArticle, searchArticles, updateArticle };