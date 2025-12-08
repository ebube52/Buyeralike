const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const models = require('../models'); // Assuming models is your db index
const { createNotification } = require('../utils/notificationService');
const Sequelize = require('sequelize'); // Import Sequelize for literal and fn

// @desc    Create a new forum category
// @route   POST /api/v1/forum-categories
// @access  Private (Admin)
exports.createForumCategory = asyncHandler(async (req, res, next) => {
    const { name, description, icon } = req.body;

    try {
        const forumCategory = await models.ForumCategory.create({
            name,
            description,
            icon,
        });

        await createNotification(
            req.user.id,
            'forum_category_created',
            `Successfully created the forum category: "${forumCategory.name}".`,
            'ForumCategory',
            forumCategory.id
        );

        res.status(201).json({
            success: true,
            data: forumCategory,
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

// @desc    Get all forum categories with post counts
// @route   GET /api/v1/forum-categories
// @access  Public
exports.getForumCategories = asyncHandler(async (req, res, next) => {
    const forumCategories = await models.ForumCategory.findAll({
        attributes: [
            'id',
            'name',
            'slug',
            'description',
            'icon',
            'createdAt',
            'updatedAt',
            [Sequelize.fn('COUNT', Sequelize.col('forumcomments.id')), 'posts'] // Count associated forum comments
        ],
        include: [{
            model: models.ForumComment,
            as: 'forumcomments', // This alias must match the 'as' in your association
            attributes: [], // We only need to count, not retrieve comment data
            where: { parentId: null, deleted: 0 }, // Only count top-level posts that are not deleted
            required: false // Use LEFT JOIN to include categories even if they have no posts
        }],
        group: ['ForumCategory.id'], // Group by category ID to get counts per category
        order: [
            ['name', 'ASC'] // Order categories alphabetically by name
        ]
    });

    // Sequelize's group by returns an array of objects where each object
    // includes the grouped attributes and the count.
    // The 'posts' attribute will be a string, convert it to number if needed on frontend.
    // The structure will be like: [{ id: 1, name: '...', posts: '10' }, ...]

    res.status(200).json({
        success: true,
        count: forumCategories.length,
        data: forumCategories,
    });
});

// @desc    Get single forum category
// @route   GET /api/v1/forum-categories/:id
// @access  Public
exports.getForumCategory = asyncHandler(async (req, res, next) => {
    const forumCategory = await models.ForumCategory.findByPk(req.params.id);

    if (!forumCategory) {
        return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: forumCategory,
    });
});

// @desc    Update forum category
// @route   PUT /api/v1/forum-categories/:id
// @access  Private (Admin)
exports.updateForumCategory = asyncHandler(async (req, res, next) => {
    const { name, description, icon } = req.body;

    let forumCategory = await models.ForumCategory.findByPk(req.params.id);

    if (!forumCategory) {
        return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
    }

    const oldName = forumCategory.name;

    try {
        forumCategory = await forumCategory.update({
            name: name || forumCategory.name,
            description: description || forumCategory.description,
            icon: icon || forumCategory.icon,
        });

        let message = `Updated the forum category: "${forumCategory.name}".`;
        if (name && name !== oldName) {
            message = `Changed the forum category name from "${oldName}" to "${forumCategory.name}" and updated details.`;
        }

        await createNotification(
            req.user.id,
            'forum_category_updated',
            message,
            'ForumCategory',
            forumCategory.id
        );

        res.status(200).json({
            success: true,
            data: forumCategory,
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
exports.deleteForumCategory = asyncHandler(async (req, res, next) => {
    const forumCategory = await models.ForumCategory.findByPk(req.params.id);

    if (!forumCategory) {
        return next(new ErrorResponse(`Forum category not found with id of ${req.params.id}`, 404));
    }

    const categoryName = forumCategory.name;

    await forumCategory.destroy();

    await createNotification(
        req.user.id,
        'forum_category_deleted',
        `Deleted the forum category: "${categoryName}".`,
        'ForumCategory',
        'deleted'
    );

    res.status(200).json({
        success: true,
        data: {},
    });
});
