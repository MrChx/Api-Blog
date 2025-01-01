const User = require("../model/user-model");
const bcypt = require('bcryptjs');

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
}

module.exports = {registerUser}