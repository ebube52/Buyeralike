
//const bcrypt = require('bcrypt');
//const jwt = require('jsonwebtoken');
const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsToMany(models.Group, { through: 'UserGroup', foreignKey: 'userId' });
      User.hasMany(models.Service, { foreignKey: 'userId', as: 'services' });
      User.hasMany(models.ForumComment, { foreignKey: 'commentUserId', as: 'forumComments' });
      User.hasMany(models.FeedbackComment, { foreignKey: 'commentUserId', as: 'feedbackComments' });
      User.hasMany(models.GroupComment, { foreignKey: 'commentUserId', as: 'groupComments' });
      User.hasMany(models.ForumCommentUserReaction, { foreignKey: 'userId', as: 'forumCommentUserReactions' });  
      User.hasMany(models.FeedbackCommentUserReaction, { foreignKey: 'userId', as: 'feedbackCommentUserReactions' });      
      User.hasMany(models.GroupCommentUserReaction, { foreignKey: 'userId', as: 'groupCommentUserReactions' });      
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },         
      country: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 20],
        },
      },
      state: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 20],
        },
      },
      lga: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 50],
        },
      },
      address: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 50],
        },
      },
      businessName: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 30],
        },
        unique: true,
      },
      service: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 30],
        },
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          len: [5, 15],
          isAlphanumeric: true,
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          len: [0, 50],
        },
      },
      phoneNumber: {
        type: DataTypes.STRING,
        validate: {
          is: /^\d{0,14}$/,
        },
      },
      role: {
        type: DataTypes.ENUM('user', 'adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5'),
        defaultValue: 'user',
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [8, 50],
        },
      },
      resetPasswordToken: DataTypes.STRING,
      resetPasswordExpire: DataTypes.DATE,
      biodata: {
        type: DataTypes.STRING,
        validate: {
          len: [0, 300],
        },
      },
      profilePhoto: {
        type: DataTypes.STRING,
        defaultValue: 'profilePhoto.png',
      },
      coverPhoto: {
        type: DataTypes.STRING,
        defaultValue: 'coverPhoto.png',
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verificationStage: {
        type: DataTypes.INTEGER,
        validate: {
          max: 1,
        },
      },
      video: {
        type: DataTypes.STRING,
        defaultValue: 'no-photo.jpg',
      },
    },
    {
      sequelize,
      modelName: 'User',
      timestamps: true,
    }
  );

  /*User.addHook('beforeSave', async (user) => {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  User.prototype.getSignedJwtToken = function () {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });
  };

  User.prototype.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken;
  };*/

  return User;
};






/*
const crypto = require('crypto')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const UserSchema = new Schema(
  {
    country: {
      type: String,
      maxlength: [20, 'Must not be more than twenty characters long']
    },
    state: {
      type: String,
      maxlength: [20, 'Must not be more than twenty characters long']
    },
    lga: {
      type: String,
      maxlength: [50, 'Must not be more than fifty characters long']
    },
    address: {
      type: String,
      maxlength: [50, 'Must not be more than fifty characters long']
    },
    businessName: {
      type: String,
      maxlength: [30, 'Must not be more than thirty characters long'],  
      unique: true,
      uniqueCaseInsensitive: true      
    },
    service: {
      type: String,
      maxlength: [30, 'Must not be more than thirty characters long']
    },
    username: {
      type: String,
      unique: true,
      uniqueCaseInsensitive: true,
      required: [true, 'Please add a username'],
      minlength: [5, 'Must not be less than five characters long'],
      maxlength: [15, 'Must not be more than fifteen characters long'],
      validate: [
        {
          validator: function(v) {
            return /^[a-zA-Z0-9_]+$/.test(v);
          },
          message: props => `${props.value} is not a valid username!`
        }
      ]
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      uniqueCaseInsensitive: true,
      maxlength: [50, 'Must not be more than fifty characters long'],
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{0,14}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      }
    },    
    role: {
      type: String,
      enum: ['user', 'adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [8, 'Must be at least eight characters long'],
      select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    biodata: {
      type: String,
      validate: {
        validator: function(v) {
          const wordCount = v.trim().length;
          return wordCount <= 300; 
        },
        message: props => `Biodata exceeds 300 characters!`
      }
    },
    profilePhoto: { 
      type: String,
      default: 'profilePhoto.png'
    },
    coverPhoto: { 
      type: String,
      default: 'coverPhoto.png'
    },
    verified: { 
      type: Boolean, 
      default: false 
    },
    verificationStage: {
      type: Number,
      maxlength: 1
    },
    video: { 
      type: String,
      default: 'no-photo.jpg'
    }    
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true }
)

/*UserSchema.index({ channelName: 'text' })

UserSchema.virtual('subscribers', {
  ref: 'Subscription',
  localField: '_id',
  foreignField: 'channelId',
  justOne: false,
  count: true,
  match: { userId: this._id }
})
UserSchema.virtual('videos', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'userId',
  justOne: false,
  count: true
})*

UserSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

/*UserSchema.pre('find', function () {
  this.populate({ path: 'subscribers' })
})*

// Ecrypt Password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next()
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  })
}

UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000

  return resetToken
}

module.exports = mongoose.model('User', UserSchema)
*/