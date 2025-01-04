const Post = require('../model/post-model');
const User = require("../model/user-model");
const fs = require('fs');
const path = require('path');   
const {v4 : uuidv4} = require('uuid');

const createPost = async (req, res, next) => {
    try {
        const {title, category, description} = req.body;
        
        if (!title || !category || !description) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please enter all required fields'
            });
        }

        if (!req.files) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please upload a thumbnail image'
            });
        }

        if (!req.files.thumbnail) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Thumbnail field is required'
            });
        }

        const thumbnail = req.files.thumbnail;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(thumbnail.mimetype)) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Only JPG, JPEG, and PNG files are allowed'
            });
        }

        if (thumbnail.size > 20000000) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Thumbnail image size should not exceed 2MB'
            });
        }
        
        // Generate unique filename
        const fileName = thumbnail.name;
        const split = fileName.split('.');
        const extension = split[split.length - 1].toLowerCase();

        const newFileName = `${split[0]}-${uuidv4()}.${extension}`;
        
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '../public/uploads/thumbnail');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Move uploaded file
        try {
            await thumbnail.mv(path.join(uploadDir, newFileName));
        } catch (err) {
            return res.status(500).json({
                code: 500,
                status: 'failed',
                error: 'Failed to upload thumbnail',
                details: err.message
            });
        }

        const newPost = new Post({
            title,
            category,
            description,
            thumbnail: newFileName,
            creator: req.user._id
        });

        // Save post to database
        await newPost.save();

        // Update user's post count
        const currentUser = await User.findById(req.user._id);
        const userPostCount = (currentUser.posts || 0) + 1;
        await User.findByIdAndUpdate(req.user._id, { posts: userPostCount });

        res.status(201).json({
            code: 201,
            status: 'success',
            message: 'Post created successfully',
            data: {
                post: {
                    _id: newPost._id,
                    title: newPost.title,
                    category: newPost.category,
                    description: newPost.description,
                    thumbnail: newFileName,
                    creator: newPost.creator,
                    createdAt: newPost.createdAt
                }
            }
        });

    } catch (err) {
        // If error occurs, cleanup any uploaded file
        if (typeof newFileName !== 'undefined') {
            const filePath = path.join(__dirname, '../public/uploads/thumbnail', newFileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        return res.status(500).json({
            code: 500,
            status: 'failed',
            error: 'Internal server error',
            message: err.message
        });
    }
};

module.exports = { createPost };