const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class FeedbackCommentValidator {
  static async validateFeedbackCommentInput(input, validationSchema) {
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

  static async validateFeedbackCommentModelFields(feedbackCommentModel) {
    try {
      if (!feedbackCommentModel.text) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Text is required.');
      }

      if (feedbackCommentModel.repliesSize === undefined || feedbackCommentModel.repliesSize === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Replies size is required.');
      }

      if (feedbackCommentModel.depth === undefined || feedbackCommentModel.depth === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Depth is required.');
      }

      if (!feedbackCommentModel.userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required.');
      }

      if (!feedbackCommentModel.commentUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Comment user ID is required.');
      }

      if (feedbackCommentModel.likes === undefined || feedbackCommentModel.likes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Likes count is required.');
      }

      if (feedbackCommentModel.dislikes === undefined || feedbackCommentModel.dislikes === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dislikes count is required.');
      }

      // Add more field validations as needed

      return feedbackCommentModel;
    } catch (error) {
      throw error;
    }
  }

  async createFeedbackCommentValidator(req, res, next) {
    const schema = Joi.object({
      text: Joi.string().required(),
      image: Joi.string(),
      parentId: Joi.string().uuid(),
      repliesSize: Joi.number().integer().required(),
      depth: Joi.number().integer().required(),
      userId: Joi.string().uuid().required(),
      commentUserId: Joi.string().uuid().required(),
      likes: Joi.number().integer().required(),
      dislikes: Joi.number().integer().required(),
    });

    try {
      req.body = await FeedbackCommentValidator.validateFeedbackCommentInput(req.body, schema);
      req.body = await FeedbackCommentValidator.validateFeedbackCommentModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = FeedbackCommentValidator;
