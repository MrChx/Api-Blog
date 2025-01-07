const {Router} = require('express');
const { registerUser, loginUser, detailUser, changeAvatar, editUser, logoutUser } = require('../controller/user-controller');
const protectedMiddleware = require('../middleware/auth-middleware');
const { createPost, getPosts, getPostId, getPostByCategory, getUserPost, updatePost, deletePost } = require('../controller/post-controller');
const { createArticle } = require('../controller/article-controller');


const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/user/:id').get(detailUser);
router.route('/change-avatar').post(protectedMiddleware, changeAvatar);
router.route('/edit/user').patch(protectedMiddleware, editUser);
router.route('/logout').delete(protectedMiddleware, logoutUser);

router.route('/create-post').post(protectedMiddleware, createPost);
router.route('/posts').get(getPosts);
router.route('/post/:postId').get(getPostId);
router.route('/post/category/:category').get(getPostByCategory);
router.route('/post/user/:creator').get(getUserPost);
router.route('/update-post/:postId').patch(protectedMiddleware, updatePost);
router.route('/delete-post/:postId').delete(protectedMiddleware, deletePost);

router.route('/create-article').post(protectedMiddleware, createArticle);

module.exports = router