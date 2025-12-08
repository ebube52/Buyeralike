const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class GroupCommentUserReactionValidator {
  static async validateGroupCommentUserReactionInput(input, validationSchema) {
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

  static async validateGroupCommentUserReactionModelFields(groupCommentUserReactionModel) {
    try {
      if (!groupCommentUserReactionModel.groupId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Group ID is required.');
      }

      if (!groupCommentUserReactionModel.userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required.');
      }

      if (!groupCommentUserReactionModel.commentId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Comment ID is required.');
      }

      if (groupCommentUserReactionModel.liked === undefined || groupCommentUserReactionModel.liked === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Liked field is required.');
      }

      if (groupCommentUserReactionModel.disliked === undefined || groupCommentUserReactionModel.disliked === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Disliked field is required.');
      }

      // Add more field validations as needed

      return groupCommentUserReactionModel;
    } catch (error) {
      throw error;
    }
  }

  async createGroupCommentUserReactionValidator(req, res, next) {
    const schema = Joi.object({
      groupId: Joi.string().uuid().required(),
      userId: Joi.string().uuid().required(),
      commentId: Joi.string().uuid().required(),
      liked: Joi.boolean().required(),
      disliked: Joi.boolean().required(),
    });

    try {
      req.body = await GroupCommentUserReactionValidator.validateGroupCommentUserReactionInput(req.body, schema);
      req.body = await GroupCommentUserReactionValidator.validateGroupCommentUserReactionModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = GroupCommentUserReactionValidator;
