const express = require('express')
const {
  getForumCommentUserReaction,
  createForumCommentUserReaction,
  updateForumCommentUserReaction,
  deleteForumCommentUserReaction
} = require('../controllers/forumCommentUserReaction')

const router = express.Router({ mergeParams: true })

const { protect, authorize } = require('../middleware/auth')

router
  .route('/')
  .post(protect, /*authorize('admin'),*/ createForumCommentUserReaction)

router
  .route('/:hiDee')
  .get(getForumCommentUserReaction)
  .put(protect, /*authorize('admin'),*/ updateForumCommentUserReaction)
  .delete(protect, /*authorize('admin'),*/ deleteForumCommentUserReaction)

module.exports = router
