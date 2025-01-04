const {Router} = require('express');
const { registerUser, loginUser, detailUser, changeAvatar, editUser } = require('../controller/user-controller');
const protectedMiddleware = require('../middleware/auth-middleware');
const { createPost } = require('../controller/post-controller');


const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/user/:id').get(detailUser);
router.route('/change-avatar').post(protectedMiddleware, changeAvatar);
router.route('/edit/user').patch(protectedMiddleware, editUser);

router.route('/create-post').post(protectedMiddleware, createPost);

module.exports = router