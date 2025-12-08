const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class FeedbackCommentUserReactionValidator {
  static async validateFeedbackCommentUserReactionInput(input, validationSchema) {
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

  static async validateFeedbackCommentUserReactionModelFields(feedbackCommentUserReactionModel) {
    try {
      if (!feedbackCommentUserReactionModel.userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required.');
      }

      if (!feedbackCommentUserReactionModel.commentId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Comment ID is required.');
      }

      if (feedbackCommentUserReactionModel.liked === undefined || feedbackCommentUserReactionModel.liked === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Liked field is required.');
      }

      if (feedbackCommentUserReactionModel.disliked === undefined || feedbackCommentUserReactionModel.disliked === null) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Disliked field is required.');
      }

      // Add more field validations as needed

      return feedbackCommentUserReactionModel;
    } catch (error) {
      throw error;
    }
  }

  async createFeedbackCommentUserReactionValidator(req, res, next) {
    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      commentId: Joi.string().uuid().required(),
      liked: Joi.boolean().required(),
      disliked: Joi.boolean().required(),
    });

    try {
      req.body = await FeedbackCommentUserReactionValidator.validateFeedbackCommentUserReactionInput(req.body, schema);
      req.body = await FeedbackCommentUserReactionValidator.validateFeedbackCommentUserReactionModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = FeedbackCommentUserReactionValidator;
