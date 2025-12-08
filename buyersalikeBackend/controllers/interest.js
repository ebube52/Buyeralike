const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('');
const DOMPurify = require('dompurify')(window);
const { sanitizeText } = require('../utils/textSanitizer');
const { createNotification } = require('../utils/notificationService');

// @desc    Create Interest
// @route   POST /api/v1/interest
exports.createInterest = asyncHandler(async (req, res, next) => {
  let { name, image, description } = req.body;

  name = sanitizeText(DOMPurify.sanitize(name));
  description = description ? sanitizeText(DOMPurify.sanitize(description)) : null;
  image = image ? DOMPurify.sanitize(image) : null;

  // Check for duplicate name (case-insensitive)
  const existingInterest = await models.Interest.findOne({
    where: models.Sequelize.where(
      models.Sequelize.fn('lower', models.Sequelize.col('name')),
      name.toLowerCase()
    ),
  });

  if (existingInterest) {
    return next(new ErrorResponse('Interest with this name already exists', 400));
  }

  const interest = await models.Interest.create({ name, image, description });

  // Link interest to creator
  await models.UserInterest.create({
    userId: req.user.id,
    interestId: interest.id,
  });

  await createNotification(
    req.user.id,
    'interest_created',
    `Successfully created the interest "${interest.name}". It is now pending approval.`,
    'Interest',
    interest.id
  );  

  res.status(201).json({ success: true, data: interest });
});


// @desc    Get All Interests (Approved for non-admins + their own)
// @route   GET /api/v1/interest
// @access  Admin or Protected
exports.getInterests = asyncHandler(async (req, res, next) => {
  let whereCondition = {};

  if (req.user.role.includes('admin')) {
    // Admin sees all
  } else {
    // Regular users: approved or their own interests
    whereCondition = {
      [models.Sequelize.Op.or]: [
        { status: 'approved' },
        { '$Users.id$': req.user.id },
      ],
    };
  }

  const interests = await models.Interest.findAll({
    where: whereCondition,
    attributes: {
      include: [
        [
          models.Sequelize.literal(`(
            SELECT COUNT(*)
            FROM UserInterests AS ui
            WHERE ui.interestId = Interest.id
          )`),
          'userCount'
        ]
      ]
    },
    include: [
      {
        model: models.User,
        through: { attributes: [] },
        as: 'Users',
        required: false,
        where: req.user && !(req.user.role.includes('admin'))
          ? { id: req.user.id }
          : undefined,
      }
    ],
    distinct: true,
  });

  res.status(200).json({
    success: true,
    count: interests.length,
    data: interests
  });
});

// @desc    Get Interests of a particular user with user count for each interest
// @route   GET /api/v1/interest/user/:userId
exports.getUserInterests = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  const isSelf = req.user && req.user.id === userId;
  const isAdmin = req.user.role.includes('admin');

  const user = await models.User.findByPk(userId, {
    include: [
      {
        model: models.Interest,
        where: isAdmin || isSelf ? {} : { status: 'approved' },
        through: { attributes: [] },
        required: false,  // <-- Add this line!
        attributes: {
          include: [
            [
              models.Sequelize.literal(`(
                SELECT COUNT(*)
                FROM \`UserInterests\` AS ui
                WHERE ui.\`interestId\` = \`Interests\`.\`id\`
              )`),
              'userCount'
            ]
          ]
        }
      }
    ]
    
  });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    count: user.Interests.length,
    data: user.Interests
  });
});

// @desc    Get Single Interest with user count
// @route   GET /api/v1/interest/:id
// @access  Protected
exports.getInterest = asyncHandler(async (req, res, next) => {
  const interestId = req.params.id;
  const isAdmin = req.user.role.includes('admin');

  const interest = await models.Interest.findByPk(interestId, {
    attributes: {
      include: [
        [
          models.Sequelize.literal(`(
            SELECT COUNT(*)
            FROM "UserInterests" AS ui
            WHERE ui."interestId" = "Interest"."id"
          )`),
          'userCount'
        ]
      ]
    }
  });

  if (!interest) {
    return next(new ErrorResponse('Interest not found', 404));
  }

  // Non-admin users can only see approved interests or interests they created
  if (!isAdmin) {
    const isCreator = await models.UserInterest.findOne({
      where: { userId: req.user.id, interestId: interestId }
    });

    if (interest.status !== 'approved' && !isCreator) {
      return next(new ErrorResponse('Not authorized to view this interest', 403));
    }
  }

  res.status(200).json({ success: true, data: interest });
});

// @desc    Update Interest (Admin only - can update status and statusMessage)
// @route   PUT /api/v1/interest/:id
// @access  Admin
exports.updateInterest = asyncHandler(async (req, res, next) => {
  let { name, image, description, status, statusMessage } = req.body;

  name = name ? sanitizeText(DOMPurify.sanitize(name)) : null;
  description = description ? sanitizeText(DOMPurify.sanitize(description)) : null;
  // image = image ? DOMPurify.sanitize(image) : null;
  statusMessage = statusMessage ? sanitizeText(DOMPurify.sanitize(statusMessage)) : null;

  const interest = await models.Interest.findByPk(req.params.id);
  if (!interest) {
    return next(new ErrorResponse('Interest not found', 404));
  }

  const oldStatus = interest.status;

  // Check for name uniqueness (case-insensitive) only if name is changing
  if (name && name.toLowerCase() !== interest.name.toLowerCase()) {
    const existing = await models.Interest.findOne({
      where: {
        id: { [models.Sequelize.Op.ne]: interest.id }, // exclude current interest
        [models.Sequelize.Op.and]: models.Sequelize.where(
          models.Sequelize.fn('lower', models.Sequelize.col('name')),
          name.toLowerCase()
        ),
      },
    });

    if (existing) {
      return next(new ErrorResponse('Another interest with this name already exists', 400));
    }
  }

  // Perform update
  if (name) interest.name = name;
  if (image) interest.image = image;
  if (description) interest.description = description;
  if (status) interest.status = status;
  if (statusMessage) interest.statusMessage = statusMessage;

  await interest.save();

  // Find the original creator to notify them about any update
  const userInterestCreator = await models.UserInterest.findOne({
    where: { interestId: interest.id },
    include: [{
      model: models.User,
      attributes: ['id']
    }]
  });

  if (userInterestCreator && userInterestCreator.User) {
    const creatorUserId = userInterestCreator.User.id;
    let notificationMessage;
    let notificationType = 'interest_updated';

    if (status && status !== oldStatus) {
      if (status === 'approved') {
        notificationMessage = `Interest "${interest.name}" has been approved.`;
        notificationType = 'interest_status_approved';
      } else if (status === 'rejected') {
        notificationMessage = `Interest "${interest.name}" has been rejected. Reason: ${statusMessage || 'No reason provided.'}`;
        notificationType = 'interest_status_rejected';
      } else if (status === 'pending_approval') {
        notificationMessage = `Status of your interest "${interest.name}" is now pending approval.`;
        notificationType = 'interest_status_pending';
      }
    } else {
      notificationMessage = `Interest "${interest.name}" has been updated.`;
    }

    if (notificationMessage) {
      await createNotification(
        creatorUserId,
        notificationType,
        notificationMessage,
        'Interest',
        interest.id
      );
    }
  }  

  res.status(200).json({ success: true, data: interest });
});

// @desc    Delete Interest
// @route   DELETE /api/v1/interest/:id
// @access  Admin
exports.deleteInterest = asyncHandler(async (req, res, next) => {
  const interest = await models.Interest.findByPk(req.params.id);
  if (!interest) {
    return next(new ErrorResponse('Interest not found', 404));
  }

  // Find the original creator to notify them
  const userInterestCreator = await models.UserInterest.findOne({
    where: { interestId: interest.id },
    include: [{
      model: models.User,
      attributes: ['id']
    }]
  });

  const interestName = interest.name; // Store name before deletion  

  await models.UserInterest.destroy({ where: { interestId: interest.id } }); // Remove associations
  await interest.destroy();

  if (userInterestCreator && userInterestCreator.User) {
    const creatorUserId = userInterestCreator.User.id;
    await createNotification(
      creatorUserId,
      'interest_deleted',
      `Interest "${interestName}" has been deleted.`,
      'Interest',
      'deleted'
    );
  }

  res.status(200).json({ success: true, data: {} });
});

// @desc    Add Interest to a User
// @route   POST /api/v1/interest/:id/add
// @access  Protected
exports.addInterestToUser = asyncHandler(async (req, res, next) => {
  const interest = await models.Interest.findByPk(req.params.id);
  if (!interest) {
    return next(new ErrorResponse('Interest not found', 404));
  }

  const existing = await models.UserInterest.findOne({
    where: {
      userId: req.user.id,
      interestId: interest.id,
    },
  });

  if (existing) {
    return next(new ErrorResponse('Interest already added to user', 400));
  }

  await models.UserInterest.create({
    userId: req.user.id,
    interestId: interest.id,
  });

  await createNotification(
    req.user.id,
    'interest_added_to_profile',
    `Added "${interest.name}" to interests of "${req.user.username}".`,
    'Interest',
    interest.id
  );  

  res.status(200).json({ success: true, message: 'Interest added to user' });
});

// @desc    Remove Interest from a User
// @route   DELETE /api/v1/interest/:id/remove
// @access  Protected
exports.removeInterestFromUser = asyncHandler(async (req, res, next) => {
  const interest = await models.Interest.findByPk(req.params.id);
  const removed = await models.UserInterest.destroy({
    where: {
      userId: req.user.id,
      interestId: req.params.id,
    },
  });

  if (!removed) {
    return next(new ErrorResponse('Interest not found for this user', 404));
  }

  if (interest) { // Check if interest was found initially
    await createNotification(
      req.user.id,
      'interest_removed_from_profile',
      `Removed "${interest.name}" from interests of "${req.user.username}".`,
      'Interest',
      interest.id // Still pass the ID even if it's no longer associated with the user
    );
  }  

  res.status(200).json({ success: true, message: 'Interest removed from user' });
});