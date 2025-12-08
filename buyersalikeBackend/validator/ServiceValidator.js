const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class ServiceValidator {
  static async validateServiceInput(input, validationSchema) {
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

  static async validateServiceModelFields(serviceModel) {
    try {
      if (!serviceModel.slug) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Slug is required.');
      }

      if (!serviceModel.userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required.');
      }

      if (!serviceModel.username) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Username is required.');
      }

      if (!serviceModel.category) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Category is required.');
      }

      if (!serviceModel.serviceDescription) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Service description is required.');
      }

      if (!serviceModel.charge) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Charge is required.');
      }

      if (!serviceModel.chargeDuration) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Charge duration is required.');
      }

      if (!serviceModel.name) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Name is required.');
      }

      if (!serviceModel.type) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Type is required.');
      }

      if (!serviceModel.url) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'URL is required.');
      }

      // Add more field validations as needed

      return serviceModel;
    } catch (error) {
      throw error;
    }
  }

  async createServiceValidator(req, res, next) {
    const schema = Joi.object({
      slug: Joi.string().required().unique(),
      userId: Joi.string().uuid().required(),
      username: Joi.string().required(),
      category: Joi.string().required(),
      serviceDescription: Joi.string().required(),
      charge: Joi.string().required(),
      chargeDuration: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().required(),
      url: Joi.string().required(),
    });

    try {
      req.body = await ServiceValidator.validateServiceInput(req.body, schema);
      req.body = await ServiceValidator.validateServiceModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // Additional validators for other routes can be added here

  // ...

}

module.exports = ServiceValidator;
