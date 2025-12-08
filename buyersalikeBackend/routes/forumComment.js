const express = require('express')
const {
  toggleForumPostFP,
  countForumPosts,
  getForumComment,
  getLatestForumComments,
  getForumCommentByUserId,
  createForumComment,
  updateForumComment,
  deleteForumComment,
  getForumStats
} = require('../controllers/forumComment')

const router = express.Router({ mergeParams: true })

const { protect, authorize } = require('../middleware/auth')


router
  .route('/latest').get(getLatestForumComments);

router
  .route('/')
  .post(protect, /*authorize('admin'),*/ createForumComment)

router
  .route('/toggleFP')
  .post(protect, authorize('adminL5'), toggleForumPostFP);

router
  .route('/count')
  .get(countForumPosts)  

router
    .route('/stats')
    .get(getForumStats);  

router
  .route('/:hiDee')
  .get(getForumComment)
  .put(protect, /*authorize('admin'),*/ updateForumComment)
  .delete(protect, /*authorize('admin'),*/ deleteForumComment)

router
  .route('/:post/:hiDee')
  .get(getForumCommentByUserId)  

module.exports = router
