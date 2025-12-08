const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../helper/ApiError');

class UserValidator {
  static async validateUserInput(input, validationSchema) {
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

  static async validateUserModelFields(userModel) {
    try {
      if (userModel.country && !Joi.string().max(20).validate(userModel.country).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid country format.');
      }

      if (userModel.state && !Joi.string().max(20).validate(userModel.state).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid state format.');
      }

      if (userModel.lga && !Joi.string().max(50).validate(userModel.lga).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid LGA format.');
      }

      if (userModel.address && !Joi.string().max(50).validate(userModel.address).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid address format.');
      }

      if (userModel.businessName && !Joi.string().max(30).validate(userModel.businessName).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid business name format.');
      }

      if (userModel.service && !Joi.string().max(30).validate(userModel.service).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid service format.');
      }

      if (userModel.username && (userModel.username.length < 5 || userModel.username.length > 15)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Username must be between 5 and 15 characters.');
      }

      if (userModel.email && !Joi.string().email().validate(userModel.email).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format.');
      }

      if (userModel.phoneNumber && !Joi.string().pattern(/^\d{0,14}$/).validate(userModel.phoneNumber).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid phone number format.');
      }

      if (userModel.role && !Joi.string().valid('user', 'adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5').validate(userModel.role).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role.');
      }

      if (userModel.password && !Joi.string().min(8).max(50).validate(userModel.password).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid password format.');
      }

      if (userModel.biodata && !Joi.string().max(300).validate(userModel.biodata).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Biodata exceeds 300 characters.');
      }

      if (userModel.verificationStage && !Joi.number().max(1).validate(userModel.verificationStage).error) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid verification stage.');
      }

      // Add more field validations as needed

      return userModel;
    } catch (error) {
      throw error;
    }
  }

  async userCreateValidator(req, res, next) {
    const schema = Joi.object({
      country: Joi.string().max(20),
      state: Joi.string().max(20),
      lga: Joi.string().max(50),
      address: Joi.string().max(50),
      businessName: Joi.string().max(30),
      service: Joi.string().max(30),
      username: Joi.string().alphanum().min(5).max(15).required(),
      email: Joi.string().email().required(),
      phoneNumber: Joi.string().pattern(/^\d{0,14}$/),
      role: Joi.string().valid('user', 'adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5').default('user'),
      password: Joi.string().min(8).max(50).required(),
      resetPasswordToken: Joi.string(),
      resetPasswordExpire: Joi.date(),
      biodata: Joi.string().max(300),
      profilePhoto: Joi.string(),
      coverPhoto: Joi.string(),
      verified: Joi.boolean().default(false),
      verificationStage: Joi.number().max(1),
      video: Joi.string(),
    });

    try {
      req.body = await UserValidator.validateUserInput(req.body, schema);
      req.body = await UserValidator.validateUserModelFields(req.body);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  async userLoginValidator(req, res, next) {
      // create schema object
      const schema = Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required(),
      });

      // schema options
      const options = {
          abortEarly: false, // include all errors
          allowUnknown: true, // ignore unknown props
          stripUnknown: true, // remove unknown props
      };

      // validate request body against schema
      const { error, value } = schema.validate(req.body, options);

      if (error) {
          // on fail return comma separated errors
          const errorMessage = error.details
              .map((details) => {
                  return details.message;
              })
              .join(', ');
          next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
      } else {
          // on success replace req.body with validated value and trigger next middleware function
          req.body = value;
          return next();
      }
  }

  async checkEmailValidator(req, res, next) {
      // create schema object
      const schema = Joi.object({
          email: Joi.string().email().required(),
      });

      // schema options
      const options = {
          abortEarly: false, // include all errors
          allowUnknown: true, // ignore unknown props
          stripUnknown: true, // remove unknown props
      };

      // validate request body against schema
      const { error, value } = schema.validate(req.body, options);

      if (error) {
          // on fail return comma separated errors
          const errorMessage = error.details
              .map((details) => {
                  return details.message;
              })
              .join(', ');
          next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
      } else {
          // on success replace req.body with validated value and trigger next middleware function
          req.body = value;
          return next();
      }
  }

  async changePasswordValidator(req, res, next) {
      // create schema object
      const schema = Joi.object({
          old_password: Joi.string().required(),
          password: Joi.string().min(6).required(),
          confirm_password: Joi.string().min(6).required(),
      });

      // schema options
      const options = {
          abortEarly: false, // include all errors
          allowUnknown: true, // ignore unknown props
          stripUnknown: true, // remove unknown props
      };

      // validate request body against schema
      const { error, value } = schema.validate(req.body, options);

      if (error) {
          // on fail return comma separated errors
          const errorMessage = error.details
              .map((details) => {
                  return details.message;
              })
              .join(', ');
          next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
      } else {
          // on success replace req.body with validated value and trigger next middleware function
          req.body = value;
          return next();
      }
  }

}

module.exports = UserValidator;
