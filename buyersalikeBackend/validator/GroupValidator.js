const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class GroupValidator {
  static async validateGroupInput(input, validationSchema) {
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

  static async validateGroupModelFields(groupModel) {
    try {
      if (!groupModel.creatorUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Creator user ID is required.');
      }

      if (!groupModel.creatorUserName) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Creator user name is required.');
      }

      if (!groupModel.accessType) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Access type is required.');
      }

      if (!groupModel.name) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Group name is required.');
      }

      if (groupModel.about && groupModel.about.length > 1000) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'About data exceeds 1000 characters.');
      }

      // Add more field validations as needed

      return groupModel;
    } catch (error) {
      throw error;
    }
  }

  async createGroupValidator(req, res, next) {
    const schema = Joi.object({
      creatorUserId: Joi.string().uuid().required(),
      creatorUserName: Joi.string().required(),
      accessType: Joi.string().required(),
      name: Joi.string().required().unique(),
      about: Joi.string().max(1000),
      profilePhoto: Joi.string(),
      coverPhoto: Joi.string(),
      member: Joi.number().required(),
    });

    try {
      req.body = await GroupValidator.validateGroupInput(req.body, schema);
      req.body = await GroupValidator.validateGroupModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }



}

module.exports = GroupValidator;
