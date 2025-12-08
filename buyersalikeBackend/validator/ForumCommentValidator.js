const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class ForumCommentValidator {
  static async validateForumCommentInput(input, validationSchema) {
    try {
      const { error, value } = validationSchema.validate(input, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        throw new ApiError(httpStatus.BAD_REQUEST, errorMessage);
      }

      return value;
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
  }

  static async validateForumCommentModelFields(forumCommentModel) {
    try {
      if (!forumCommentModel.slug) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Slug is required.');
      }

      if (!forumCommentModel.text) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required.');
      }

      if (forumCommentModel.repliesSize === undefined || forumCommentModel.repliesSize === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Replies size is required.');
      }

      if (forumCommentModel.depth === undefined || forumCommentModel.depth === null) {
        throw aApiError(httpStatus.BAD_REQUEST, 'Depth is required.');
      }

      if (!forumCommentModel.category) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Category is required.');
      }

      if (forumCommentModel.fp === undefined || forumCommentModel.fp === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'FP flag is required.');
      }

      if (!forumCommentModel.commentUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Comment user ID is required.');
      }

      if (forumCommentModel.likes === undefined || forumCommentModel.likes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Likes count is required.');
      }

      if (forumCommentModel.dislikes === undefined || forumCommentModel.dislikes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dislikes count is required.');
      }

      // Add more field validations as needed

      return forumCommentModel;
    } catch (error) {
      throw error;
    }
  }

  async createForumCommentValidator(req, res, next) {
    const schema = Joi.object({
      slug: Joi.string().required().unique(),
      title: Joi.string(),
      text: Joi.string().required(),
      image: Joi.string(),
      parentId: Joi.string().uuid(),
      repliesSize: Joi.number().integer().required(),
      depth: Joi.number().integer().required(),
      category: Joi.string().required(),
      fp: Joi.boolean().required(),
      commentUserId: Joi.string().uuid().required(),
      likes: Joi.number().integer().required(),
      dislikes: Joi.number().integer().required(),
    });

    try {
      req.body = await ForumCommentValidator.validateForumCommentInput(req.body, schema);
      req.body = await ForumCommentValidator.validateForumCommentModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = ForumCommentValidator;
