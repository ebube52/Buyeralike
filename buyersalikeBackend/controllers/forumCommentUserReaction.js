const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
//const { ForumComment } = require('../models/ForumComment')
//const { ForumCommentUserReaction } = require('../models/ForumCommentUserReaction')
const models = require('../models');
const { createNotification } = require('../utils/notificationService');

// @desc    Create forumCommentUserReaction
// @route   POST /api/v1/forumCommentUserReaction
exports.createForumCommentUserReaction = asyncHandler(async (req, res, next) => {
  const { commentId, userId, liked, disliked } = req.body;

  const newForumCommentUserReaction = await models.ForumCommentUserReaction.create({
    commentId,
    userId,
    liked,
    disliked
  });

  const likesCount = await models.ForumCommentUserReaction.count({ where: { commentId, liked: true } });
  const dislikesCount = await models.ForumCommentUserReaction.count({ where: { commentId, disliked: true } });

  const comment = await models.ForumComment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Comment not found'));
  }

  comment.likes = likesCount;
  comment.dislikes = dislikesCount;

  await comment.save();

  const addedForumCommentUserReaction = await models.ForumCommentUserReaction.findByPk(newForumCommentUserReaction.id, {
    attributes: ['id', 'commentId', 'userId', 'liked', 'disliked']
  });

  const reactionType = liked ? 'liked' : 'disliked';
  const notificationMessage = `Forum post "${comment.title}" was ${reactionType} by a user.`;
  await createNotification(
    userId,
    `forum_post_${reactionType}`,
    notificationMessage,
    'ForumComment',
    commentId
  ); 

  res.status(200).json({ success: true, data: addedForumCommentUserReaction });
});

// @desc    Get forumCommentUserReaction
// @route   GET /api/v1/forumCommentUserReaction/:hiDee
exports.getForumCommentUserReaction = asyncHandler(async (req, res, next) => {
  const forumCommentUserReactionId = req.params.hiDee;

  const forumCommentUserReaction = await models.ForumCommentUserReaction.findByPk(forumCommentUserReactionId, {
    attributes: ['id', 'commentId', 'userId', 'liked', 'disliked']
  });

  if (!forumCommentUserReaction) {
    return next(new ErrorResponse('Forum comment user interaction not found'));
  }

  res.status(200).json({ success: true, data: forumCommentUserReaction });
});

// @desc    Update forumCommentUserReaction
// @route   PUT /api/v1/forumCommentUserReaction/:hiDee
exports.updateForumCommentUserReaction = asyncHandler(async (req, res, next) => {
  const { commentId, userId, liked, disliked } = req.body;

  const forumCommentUserReaction = await models.ForumCommentUserReaction.findOne({ where: { commentId, userId } });
  if (!forumCommentUserReaction) {
    return next(new ErrorResponse('Forum comment user interaction not found'));
  }

  forumCommentUserReaction.liked = liked;
  forumCommentUserReaction.disliked = disliked;

  await forumCommentUserReaction.save();

  const likesCount = await models.ForumCommentUserReaction.count({ where: { commentId, liked: true } });
  const dislikesCount = await models.ForumCommentUserReaction.count({ where: { commentId, disliked: true } });

  const comment = await models.ForumComment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Comment not found'));
  }

  comment.likes = likesCount;
  comment.dislikes = dislikesCount;

  await comment.save();

  const editedForumCommentUserReaction = await models.ForumCommentUserReaction.findByPk(forumCommentUserReaction.id, {
    attributes: ['id', 'commentId', 'userId', 'liked', 'disliked']
  });

  let notificationMessage;
  if (liked) {
    notificationMessage = `Forum post "${comment.text.substring(0, 50)}" was liked.`;
  } else if (disliked) {
    notificationMessage = `oFrum post "${comment.text.substring(0, 50)}" was disliked.`;
  }
  if (notificationMessage) {
    await createNotification(
      userId,
      'forum_post_reaction_updated',
      notificationMessage,
      'ForumComment',
      commentId
    );
  }

  res.status(200).json({ success: true, data: editedForumCommentUserReaction });
});

// @desc    Delete forumCommentUserReaction
// @route   DELETE /api/v1/auth/forumCommentUserReaction/:hiDee
exports.deleteForumCommentUserReaction = asyncHandler(async (req, res, next) => {
  const forumCommentUserReactionId = req.params.hiDee;
  const { commentId, userId, liked, disliked } = req.body;

  const forumCommentUserReaction = await models.ForumCommentUserReaction.findOne({ where: { commentId, userId } });
  if (!forumCommentUserReaction) {
    return next(new ErrorResponse('Forum comment user interaction not found'));
  }

  const comment = await models.ForumComment.findByPk(commentId);
  if (!comment) {
    return next(new ErrorResponse('Comment not found'));
  }

  if (!liked && !disliked) {
    await forumCommentUserReaction.destroy();

    const likesCount = await models.ForumCommentUserReaction.count({ where: { commentId, liked: true } });
    const dislikesCount = await models.ForumCommentUserReaction.count({ where: { commentId, disliked: true } });

    comment.likes = likesCount;
    comment.dislikes = dislikesCount;
  }

  await comment.save();

  const notificationMessage = `User removed their reaction from forum post "${comment.title}".`;
  await createNotification(
    userId,
    'forum_post_reaction_removed',
    notificationMessage,
    'ForumComment',
    commentId
  );
  res.status(200).json({ success: true });
});