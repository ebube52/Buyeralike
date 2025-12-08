const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const { Op } = require('sequelize');
const models = require('../models');
const { sanitizeText } = require('../utils/textSanitizer');


// @desc    confirm Admin
// @route   GET /api/v1/admin
exports.confirmAdmin = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true });  
});

// @desc    Get record
// @route   GET /api/v1/admin/:type
exports.getRecords = asyncHandler(async (req, res, next) => {
  const { records } = req; // Get records from request object

  if (!records) {
    return next(new ErrorResponse('Records not found'));
  }

  const { count, rows } = records;

  // Format the response
  const response = {
    data: rows,
    meta: {
      totalRowCount: count
    }
  };

  res.status(200).json(response);
});

// @desc    Get record by Id
// @route   GET /api/v1/admin/:type/:id
exports.getRecordById = asyncHandler(async (req, res, next) => {
  const type = req.params.type;
  const id = req.params.id;
  let record;

  if (type == "user") {
    record = await models.User.findByPk(id);
  } else if (type == "service") {
    record = await models.Service.findByPk(id);
  } else if (type == "feedbackComment") {
    record = await models.FeedbackComment.findByPk(id);
  } else if (type == "forumComment") {
    record = await models.ForumComment.findByPk(id);
  } else if (type == "group") {
    record = await models.Group.findByPk(id);
  } else if (type == "groupComment") {
    record = await models.GroupComment.findByPk(id);
  }  

  if (!record) {
    return next(new ErrorResponse('Record not found'));
  }

  res.status(200).json({ data: record });
});

// @desc    Update record
// @route   PUT /api/v1/admin/:type/:id
exports.updateRecordById = asyncHandler(async (req, res, next) => {
  const type = req.params.type;
  const id = req.params.id;
  let record;

  if (type === "user") {
    const { locked, role, verified, suspended, suspensionDuration, actionBy } = req.body;
    record = await models.User.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    if (role !== undefined) {
      record.role = role;
      record.roleTime = new Date();
    }
    if (verified !== undefined) {
      record.verified = verified;
      record.verifiedTime = new Date();
    }
    if (suspended !== undefined) {
      record.suspended = suspended;
      record.suspendedBy = actionBy;
      record.suspensionTime = new Date();
    }
    if (suspensionDuration !== undefined) {
      record.suspensionDuration = suspensionDuration;
    }
    await record.save();
  } else if (type === "service") {
    const { locked, actionBy } = req.body;
    record = await models.Service.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    await record.save();
  } else if (type === "feedbackComment") {
    const { fp, locked, actionBy } = req.body;
    record = await models.FeedbackComment.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (fp !== undefined) {
      record.fp = fp;
      record.fpTime = new Date();
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    await record.save();
  } else if (type === "forumComment") {
    const { fp, locked, actionBy } = req.body;
    record = await models.ForumComment.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (fp !== undefined) {
      record.fp = fp;
      record.fpTime = new Date();
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    await record.save();
  } else if (type === "group") {
    const { locked, actionBy } = req.body;
    record = await models.Group.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    await record.save();
  } else if (type === "groupComment") {
    const { fp, locked, actionBy } = req.body;
    record = await models.GroupComment.findByPk(id);
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }
    if (fp !== undefined) {
      record.fp = fp;
      record.fpTime = new Date();
    }
    if (locked !== undefined) {
      record.locked = locked;
      record.lockedBy = actionBy;
      record.lockedTime = new Date();
    }
    await record.save();
  } else {
    return next(new ErrorResponse('Invalid record type'));
  }

  res.status(200).json({ success: true });
});


// @desc    Delete record
// @route   DELETE /api/v1/admin/:type/:id
exports.deleteRecordById = asyncHandler(async (req, res, next) => {
  const type = req.params.type;
  const id = req.params.id;
  let record;
  
  try {
    if (type === "user") {
      record = await models.User.findByPk(id, { include: getAllAssociations(models.User) });
    } else if (type === "service") {
      record = await models.Service.findByPk(id, { include: getAllAssociations(models.Service) });
    } else if (type === "feedbackComment") {
      record = await models.FeedbackComment.findByPk(id, { include: getAllAssociations(models.FeedbackComment) });
    } else if (type === "forumComment") {
      record = await models.ForumComment.findByPk(id, { include: getAllAssociations(models.ForumComment) });
    } else if (type === "group") {
      record = await models.Group.findByPk(id, { include: getAllAssociations(models.Group) });
    } else if (type === "groupComment") {
      record = await models.GroupComment.findByPk(id, { include: getAllAssociations(models.GroupComment) });
    } else {
      return next(new ErrorResponse('Invalid record type'));
    }
  
    if (!record) {
      return next(new ErrorResponse('Record not found'));
    }

    const hasDependents = checkDependents(type, record);

    if (hasDependents) {
      return next(new ErrorResponse('Cannot delete record with dependent records'));
    }

    await record.destroy();

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

function getAllAssociations(model) {
  const associations = Object.values(model.associations);
  return associations.map(association => ({ model: association.target, as: association.as }));
}

function checkDependents(type, record) {
  switch (type) {
    case 'user':
      return (
        record.userPlan ||
        record.priorityUser ||
        record.services ||
        record.forumComments ||
        record.feedbackComments ||
        record.groupComments ||
        record.forumCommentUserReactions ||
        record.feedbackCommentUserReactions ||
        record.groupCommentUserReactions ||
        record.forumCommentReports ||
        record.feedbackCommentReports ||
        record.groupCommentReports ||
        record.serviceReports
      );
    case 'service':
      return (
        record.serviceReports && record.serviceReports.length > 0
      );
    case 'feedbackComment':
      return (
        record.feedbackCommentReports ||
        record.feedbackCommentReplies ||
        record.feedbackCommentUserReactions
      );
    case 'forumComment':
      return (
        record.forumCommentReports ||
        record.forumCommentReplies ||
        record.forumCommentUserReactions ||
        record.forumCommentReportCategories ||
        record.priorityForumComment
      );
    case 'group':
      return (
        record.groupComments ||
        record.groupCommentUserReactions ||
        record.groupCommentReports ||
        record.priorityGroup
      );
    case 'groupComment':
      return (
        record.groupCommentUserReactions ||
        record.groupCommentReports ||
        record.priorityGroupComment ||
        record.groupCommentReplies
      );
    default:
      return false;
  }
}







/*
const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')
const User = require('../models/User')
const ForumCommentUserReaction = require('../models/ForumCommentUserReaction')
const FeedbackCommentUserReaction = require('../models/FeedbackCommentUserReaction')


// @desc    Create user
// @route   POST /api/v1/user
exports.createUser = asyncHandler(async (req, res, next) => {
  const data = await req.body;
  if (data && data.ids) {
    const userIds = data.ids;
    const users = await User.find({ id: { $in: userIds } })
      .select('id country state lga address businessName service username email phoneNumber biodata profilePhoto coverPhoto verified verificationStage video');

    if (!users || users.length === 0) {
      return next(new ErrorResponse('Users not found'))
    }

    res.status(201).json({ success: true, data: users })
  } else if (data && data.forumCommentIds) {
    const forumCommentIds = data.forumCommentIds;
    const forumCommentUserReactions = await ForumCommentUserReaction.find({ commentId: { $in: forumCommentIds } })
      .select('commentId userId liked disliked');

    if (!forumCommentUserReactions) {
      return next(new ErrorResponse('User interactions not found'))
    }

    res.status(201).json({ success: true, data: forumCommentUserReactions })
  } else if (data && data.feedbackCommentIds) {
    const feedbackCommentIds = data.feedbackCommentIds;
    const feedbackCommentUserReactions = await FeedbackCommentUserReaction.find({ commentId: { $in: feedbackCommentIds } })
      .select('commentId userId liked disliked');

    if (!feedbackCommentUserReactions) {
      return next(new ErrorResponse('User interactions not found'))
    }
    res.status(201).json({ success: true, data: feedbackCommentUserReactions })
  }
})

// @desc    Get all users
// @route   GET /api/v1/auth/users
// @access  Private/Admin
/*exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults)
})*

// @desc    Get user
// @route   GET /api/v1/user/:hiDee
exports.getUser = asyncHandler(async (req, res, next) => {
  const username = req.params.hiDee;
  if (username == "all") {
    const users = await User.find()
      .select('id businessName service username profilePhoto verified');

    if (!users) {
      return next(new ErrorResponse('Users not found'))
    }     

    res.status(200).json({ success: true, data: users })    
  } else {
    const user = await User.findOne({ username })
      .select('id country state lga address businessName service username email phoneNumber biodata profilePhoto coverPhoto verified verificationStage video');

    if (!user) {
      return next(new ErrorResponse(`No user with that username of ${username}`))
    }    
    res.status(200).json({ success: true, data: user })    
  }
})

// @desc    Update user
// @route   PUT /api/v1/user/:hiDee
exports.updateUser = asyncHandler(async (req, res, next) => {
  const username = req.params.hiDee;
  const { 
    country, 
    state, 
    lga, 
    address, 
    businessName, 
    service,
    phoneNumber,
    biodata, 
    profilePhoto, 
    coverPhoto, 
    video
  } = await req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return next(new ErrorResponse('User not found'))
  }  

  user.country = country || user.country;
  user.state = state || user.state;
  user.lga = lga || user.lga;
  user.address = address || user.address;
  user.businessName = businessName || user.businessName;
  user.service = service || user.service;
  user.phoneNumber = phoneNumber || user.phoneNumber;    
  user.biodata = biodata || user.biodata;
  user.profilePhoto = profilePhoto || user.profilePhoto;
  user.coverPhoto = coverPhoto || user.coverPhoto;
  user.video = video || user.video;

  const editedUser =  await user.save();
  const updatedUser = await User.findById(editedUser.id)
    .select('id country state lga address businessName service username email phoneNumber biodata profilePhoto coverPhoto verified verificationStage video');   

  res.status(200).json({ success: true, data: updatedUser })
})

// @desc    Delete user
// @route   DELETE /api/v1/auth/user/:hiDee
exports.deleteUser = asyncHandler(async (req, res, next) => {

})




// @desc    Get single user
// @route   GET /api/v1/auth/users/:id
// @access  Private/Admin
/*exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate({
    path: 'subscribers'
  })

  if (!user)
    return next(new ErrorResponse(`No user with that id of ${req.params.id}`))

  res.status(200).json({ success: true, data: user })
})*/

// @desc    Create user
// @route   POST /api/v1/auth/users
// @access  Private/Admin
/*exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body)

  res.status(201).json({ success: true, data: user })
})*/

// @desc    Update user
// @route   PUT /api/v1/auth/users/:id
// @access  Private/Admin
/*exports.updateUser = asyncHandler(async (req, res, next) => {
  req.body.password = ''
  delete req.body.password

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: 'query'
  })

  if (!user)
    return next(new ErrorResponse(`No user with that id of ${req.params.id}`))

  res.status(200).json({ success: true, data: user })
})*/
