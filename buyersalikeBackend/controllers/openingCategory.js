// controllers/openingCategory.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models'); // Assuming models is your db index
const { createNotification } = require('../utils/notificationService');

// @desc    Create a new forum category
// @route   POST /api/v1/forum-categories
// @access  Private (Admin)
exports.createOpeningCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  // The slug will be generated automatically by the model hook

  try {
    const openingCategory = await models.OpeningCategory.create({
      name,
      description,
    });

    await createNotification(
      req.user.id,
      'opening_category_created',
      `You've successfully created the opening category: "${openingCategory.name}".`,
      'OpeningCategory',
      openingCategory.id
    );    

    res.status(201).json({
      success: true,
      data: openingCategory,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return next(new ErrorResponse('Forum category with this name or slug already exists.', 400));
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return next(new ErrorResponse(messages.join(', '), 400));
    }
    next(error); // Pass other errors to general error handler
  }
});

// @desc    Get all forum categories
// @route   GET /api/v1/forum-categories
// @access  Public
exports.getForumCategories = asyncHandler(async (req, res, next) => {
  const forumCategories = await models.OpeningCategory.findAll();

  res.status(200).json({
    success: true,
    count: forumCategories.length,
    data: forumCategories,
  });
});

// @desc    Get single forum category
// @route   GET /api/v1/forum-categories/:id
// @access  Public
exports.getOpeningCategory = asyncHandler(async (req, res, next) => {
  const openingCategory = await models.OpeningCategory.findByPk(req.params.id);

  if (!openingCategory) {
    return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: openingCategory,
  });
});

// @desc    Update forum category
// @route   PUT /api/v1/forum-categories/:id
// @access  Private (Admin)
exports.updateOpeningCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  let openingCategory = await models.OpeningCategory.findByPk(req.params.id);

  if (!openingCategory) {
    return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
  }

  // Declare and initialize oldName before the update call
  const oldName = openingCategory.name;

  try {
    // Update the category. The slug will be re-generated if the name changes due to the hook.
    openingCategory = await openingCategory.update({
      name: name || openingCategory.name, // Allow partial updates
      description: description || openingCategory.description,
    });

    let message = `Updated the opening category: "${openingCategory.name}".`;
    if (name && name !== oldName) {
      message = `Changed the opening category name from "${oldName}" to "${openingCategory.name}" and updated details.`;
    }

    // Notify the user who performed the action
    await createNotification(
      req.user.id,
      'opening_category_updated',
      message,
      'OpeningCategory',
      openingCategory.id
    );

    res.status(200).json({
      success: true,
      data: openingCategory,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return next(new ErrorResponse('Forum category with this name or slug already exists.', 400));
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return next(new ErrorResponse(messages.join(', '), 400));
    }
    next(error);
  }
});

// @desc    Delete forum category
// @route   DELETE /api/v1/forum-categories/:id
// @access  Private (Admin)
exports.deleteOpeningCategory = asyncHandler(async (req, res, next) => {
  const openingCategory = await models.OpeningCategory.findByPk(req.params.id);

  if (!openingCategory) {
    return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
  }

  const categoryName = openingCategory.name;

  await openingCategory.destroy();

  await createNotification(
    req.user.id,
    'opening_category_deleted',
    `Deleted the opening category: "${categoryName}".`,
    'OpeningCategory',
    'deleted'
  );  

  res.status(200).json({
    success: true,
    data: {}, // Conventionally return an empty object for successful deletion
  });
});