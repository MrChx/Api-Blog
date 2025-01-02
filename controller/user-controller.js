const User = require("../model/user-model");
const bcypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');   
const {v4 : uuidv4} = require('uuid');

const registerUser = async (req, res, next) => {
    try{
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please enter all fields'
            });
        }

        const newEmail = email.toLowerCase();

        const emailExists = await User.findOne({email: newEmail})
        if(emailExists){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Email already exists'
            });
        }

        if((password.length) < 6){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Password must be at least 6 characters'
            });
        }

        if(password !== password2){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Passwords do not match'
            });
        }

        const salt = await bcypt.genSalt(10);
        const hashedPassword = await bcypt.hash(password, salt);
        const newUser = await User.create({name, email: newEmail, password: hashedPassword});

        res.status(201).json({
            code: 201,
            status: 'success',
            message: 'User registered successfully',
            user: newUser
        }); 
    }catch(err){
        next(err);
    }
};

const loginUser = async (req, res, next) => {
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please enter email and password'
            });
        }

        const newEmail = email.toLowerCase();

        const user = await User.findOne({email: newEmail});
        if (!user){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Invalid credentials, user does not exist'
            });
        }

        const comparePassword = await bcypt.compare(password, user.password);
        if(!comparePassword){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Invalid credentials, password is incorrect'
            });
        }
        
        const {_id, name, email: userEmail} = user;
        const token = jwt.sign({_id, name, userEmail}, process.env.JWT_SECRET_KEY, {expiresIn: '7d'});

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'User logged in successfully',
            data: {
                email: userEmail,
                name: name,
                token: token
            }
        });
    }catch(err){
        next(err);
    }
};

const detailUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                code: 404,
                status: 'failed',
                error: 'User not found',
            });
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'User detail retrieved successfully',
            data: {
                name: user.name,
                email: user.email,
            }
        });
    } catch (err) {
        next(err);
    }
};

const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please upload an image file'
            });
        }

        const { avatar } = req.files;
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(avatar.mimetype)) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'File format not supported. Use JPG, JPEG, or PNG'
            });
        }

        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (avatar.size > maxSize) {
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Image size should not exceed 5MB'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                code: 404,
                status: 'failed',
                error: 'User not found'
            });
        }

        if (user.avatar) {
            const oldAvatarPath = path.join(__dirname, `../uploads/${user.avatar}`);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                } catch (err) {
                    console.error('Error deleting old avatar:', err);
                }
            }
        }

        // Generate new filename
        const fileExt = path.extname(avatar.name);
        const newFileName = `avatar-${user._id}-${Date.now()}${fileExt}`;
        const uploadPath = path.join(__dirname, `../uploads/${newFileName}`);

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        try {
            await avatar.mv(uploadPath);
        } catch (err) {
            return res.status(500).json({
                code: 500,
                status: 'failed',
                error: 'Failed to upload avatar',
                details: err.message
            });
        }

        // Update user avatar in database
        try {
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                { avatar: newFileName },
                { new: true }
            );

            if (!updatedUser) {
                // If update fails, delete uploaded file
                if (fs.existsSync(uploadPath)) {
                    fs.unlinkSync(uploadPath);
                }
                throw new Error('Failed for update info avatar');
            }

            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'Update Avatar Success',
                data: {
                    avatar: newFileName
                }
            });
        } catch (err) {
            // If database update fails, delete uploaded file
            if (fs.existsSync(uploadPath)) {
                fs.unlinkSync(uploadPath);
            }
            throw err;
        }
    } catch (err) {
        next(err);
    }
};

const editUser = async (req, res, next) => {
    try {
        const {name, email, currentPassword, newPassword, newPassword2} = req.body;
        if(!name || !email || !currentPassword || !newPassword || !newPassword2){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Please enter all fields'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                code: 404,
                status: 'failed',
                error: 'User not found'
            });
        }

        const emailExists = await User.findOne({email});
        if(emailExists && (emailExists._id != req.user._id)){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Email already exists'
            });
        }

        const comparePassword = await bcypt.compare(currentPassword, user.password);
        if(!comparePassword){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Current password is incorrect'
            });
        }

        if(newPassword !== newPassword2){
            return res.status(400).json({
                code: 400,
                status: 'failed',
                error: 'Passwords do not match'
            });
        }

        const salt = await bcypt.genSalt(10)
        const hashedPassword = await bcypt.hash(newPassword, salt);
        const newInfo = await User.findByIdAndUpdate(req.user._id, {name, email, password: hashedPassword}, {new: true});

        return res.status(200).json({
            code: 200,
            status: 'success',
            message: 'User updated successfully',
            data: {
                name: newInfo.name,
                email: newInfo.email,
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {registerUser, loginUser, detailUser, changeAvatar, editUser};