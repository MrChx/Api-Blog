const {Router} = require('express');
const { registerUser, loginUser, detailUser, changeAvatar } = require('../controller/user-controller');
const protectedMiddleware = require('../middleware/auth-middleware');


const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/user/:id').get(detailUser);
router.route('/change-avatar').post(protectedMiddleware, changeAvatar);

module.exports = router