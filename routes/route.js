const {Router} = require('express');
const { registerUser } = require('../controller/user-controller');


const router = Router();

router.route('/register').post(registerUser);

module.exports = router