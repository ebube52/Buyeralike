const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class GroupCommentValidator {
  static async validateGroupCommentInput(input, validationSchema) {
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

  static async validateGroupCommentModelFields(groupCommentModel) {
    try {
      if (!groupCommentModel.slug) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Slug is required.');
      }

      if (!groupCommentModel.groupId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required.');
      }

      if (!groupCommentModel.groupName) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Group name is required.');
      }

      if (!groupCommentModel.text) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required.');
      }

      if (groupCommentModel.repliesSize === undefined || groupCommentModel.repliesSize === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Replies size is required.');
      }

      if (groupCommentModel.depth === undefined || groupCommentModel.depth === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Depth is required.');
      }

      if (groupCommentModel.fp === undefined || groupCommentModel.fp === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'FP flag is required.');
      }

      if (!groupCommentModel.commentUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Comment user ID is required.');
      }

      if (groupCommentModel.likes === undefined || groupCommentModel.likes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Likes count is required.');
      }

      if (groupCommentModel.dislikes === undefined || groupCommentModel.dislikes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dislikes count is required.');
      }

      // Add more field validations as needed

      return groupCommentModel;
    } catch (error) {
      throw error;
    }
  }

  async createGroupCommentValidator(req, res, next) {
    const schema = Joi.object({
      slug: Joi.string().required().unique(),
      groupId: Joi.string().uuid().required(),
      groupName: Joi.string().required(),
      title: Joi.string(),
      text: Joi.string().required(),
      image: Joi.string(),
      parentId: Joi.string().uuid(),
      repliesSize: Joi.number().integer().required(),
      depth: Joi.number().integer().required(),
      fp: Joi.boolean().required(),
      commentUserId: Joi.string().uuid().required(),
      likes: Joi.number().integer().required(),
      dislikes: Joi.number().integer().required(),
    });

    try {
      req.body = await GroupCommentValidator.validateGroupCommentInput(req.body, schema);
      req.body = await GroupCommentValidator.validateGroupCommentModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = GroupCommentValidator;
