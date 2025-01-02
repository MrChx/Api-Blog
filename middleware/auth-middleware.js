const jwt = require('jsonwebtoken');
const User = require('../model/user-model');

const protectedMiddleware = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } 
        else if (req?.cookies?.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                code: 401,
                status: 'failed',
                error: 'Dont have access - Token not found'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            
            if (!decoded._id) {
                return res.status(401).json({
                    code: 401,
                    status: 'failed',
                    error: 'Invalid token - ID not found'
                });
            }

            const user = await User.findById(decoded._id).select('-password');

            if (!user) {
                return res.status(401).json({
                    code: 401,
                    status: 'failed',
                    error: 'User not found'
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.log('Token verification error:', error.message);
            return res.status(401).json({
                code: 401,
                status: 'failed',
                error: 'Token is invalid or expired'
            });
        }
    } catch (error) {
        console.log('Server error:', error.message);
        return res.status(500).json({
            code: 500,
            status: 'failed',
            error: `Server error in authentication: ${error.message}`
        });
    }
};

module.exports = protectedMiddleware;