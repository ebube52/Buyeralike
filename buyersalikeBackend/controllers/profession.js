// controllers/profession.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models'); // Assuming models is your db index
const { createNotification } = require('../utils/notificationService');

// @desc    Create a new profession
// @route   POST /api/v1/professions
// @access  Private (Admin)
exports.createProfession = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  // The slug will be generated automatically by the model hook

  try {
    const profession = await models.Profession.create({
      name,
      description,
    });

    await createNotification(
      req.user.id,
      'profession_created',
      `Successfully created the profession: "${profession.name}".`,
      'Profession',
      profession.id
    );

    res.status(201).json({
      success: true,
      data: profession,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return next(new ErrorResponse('Profession with this name or slug already exists.', 400));
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return next(new ErrorResponse(messages.join(', '), 400));
    }
    next(error); // Pass other errors to general error handler
  }
});

// @desc    Get all professions
// @route   GET /api/v1/professions
// @access  Public
exports.getProfessions = asyncHandler(async (req, res, next) => {
  const professions = await models.Profession.findAll();

  res.status(200).json({
    success: true,
    count: professions.length,
    data: professions,
  });
});

// @desc    Get single profession
// @route   GET /api/v1/professions/:id
// @access  Public
exports.getProfession = asyncHandler(async (req, res, next) => {
  const profession = await models.Profession.findByPk(req.params.id);

  if (!profession) {
    return next(new ErrorResponse(`Profession not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: profession,
  });
});

// @desc    Update profession
// @route   PUT /api/v1/professions/:id
// @access  Private (Admin)
exports.updateProfession = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  let profession = await models.Profession.findByPk(req.params.id);

  if (!profession) {
    return next(new ErrorResponse(`Profession not found with id of ${req.params.id}`, 404));
  }

  const oldName = profession.name;

  try {
    // Update the profession. The slug will be re-generated if the name changes due to the hook.
    profession = await profession.update({
      name: name || profession.name, // Allow partial updates
      description: description || profession.description,
    });

    let message = `Updated the profession: "${profession.name}".`;
    if (name && name !== oldName) {
      message = `Changed the profession name from "${oldName}" to "${profession.name}" and updated details.`;
    }    

    await createNotification(
      req.user.id,
      'profession_updated',
      message,
      'Profession',
      profession.id
    );

    res.status(200).json({
      success: true,
      data: profession,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return next(new ErrorResponse('Profession with this name or slug already exists.', 400));
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return next(new ErrorResponse(messages.join(', '), 400));
    }
    next(error);
  }
});

// @desc    Delete profession
// @route   DELETE /api/v1/professions/:id
// @access  Private (Admin)
exports.deleteProfession = asyncHandler(async (req, res, next) => {
  const profession = await models.Profession.findByPk(req.params.id);

  if (!profession) {
    return next(new ErrorResponse(`Profession not found with id of ${req.params.id}`, 404));
  }

  const professionName = profession.name;

  await profession.destroy();

  await createNotification(
    req.user.id,
    'profession_deleted',
    `Deleted the profession: "${professionName}".`,
    'Profession',
    'deleted'
  );  

  res.status(200).json({
    success: true,
    data: {}, // Conventionally return an empty object for successful deletion
  });
});