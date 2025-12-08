'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const {
  Model, Sequelize
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.ForumComment, { foreignKey: 'commentUserId', as: 'forumComments' });
      User.hasMany(models.ForumCommentUserReaction, { foreignKey: 'userId', as: 'forumCommentUserReactions' });  
      User.hasOne(models.PriorityUser, { foreignKey: 'userId', as: 'priorityUser' });     
      User.hasMany(models.UserVerify, { foreignKey: 'userId', as: 'verifications' }); 
      User.hasMany(models.PageVisit, { foreignKey: 'userId', as: 'pageVisits' });
      User.belongsToMany(models.Interest, { through: 'UserInterests' });
      User.hasMany(models.Message, { foreignKey: 'from_user_id', as: 'sentMessages' });
      User.hasMany(models.Message, { foreignKey: 'to_user_id', as: 'receivedMessages' });
      User.hasMany(models.Connection, { as: 'sentConnections', foreignKey: 'requesterId' });
      User.hasMany(models.Connection, { as: 'receivedConnections', foreignKey: 'receiverId' });
      User.hasMany(models.Connection, { as: 'outgoingRequests', foreignKey: 'requesterId' }); 
      User.hasMany(models.Connection, { as: 'incomingRequests', foreignKey: 'receiverId' });      
      User.hasMany(models.Opening, { foreignKey: 'userId', as: 'createdOpenings' });
      User.hasMany(models.PartnershipGroup, { foreignKey: 'creatorId', as: 'createdPartnershipGroups' });
      User.hasMany(models.Partnership, { foreignKey: 'userId', as: 'partnerships' });  
      User.hasMany(models.Notification, { foreignKey: 'userId', as: 'notifications' })        
      User.belongsTo(models.Profession, { foreignKey: 'professionId', as: 'profession' });
      User.hasMany(models.KycApplication, { as: 'kycApplications', foreignKey: 'userId' });
      User.hasMany(models.KycApplication, { as: 'reviewedKycApplications', foreignKey: 'reviewedBy' });      
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,         
      primaryKey: true,       
      allowNull: false,        
    },    
    country: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 20]
      },
    },
    state: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 20]      
      },
    },
    lga: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 50]       
      },
    },
    address: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 100]       
      },
    },
    businessName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        len: [0, 30],
        notContainsTapwint(value) {
          if (value && value.toLowerCase().includes('tapwint')) {
            throw new Error('Business name cannot contain "tapwint"');
          }
        },
      },
    },
    service: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 40]       
      },
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        len: [5, 15],
        isAlphanumeric: {
          args: true,
          msg: 'Username must contain only letters and numbers',
        },
        customValidator(value) {
          if (value.includes('.')) {
            throw new Error('Username cannot contain dots');
          }
        },
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
      /*validate: {
        len: [8, 50],
      },*/
    },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpire: DataTypes.DATE,
    biodata: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 300],
        isValidText(value) {
          const strings = value.split(' ');
  
          for (const str of strings) {
            if (str.length > 50) {
              throw new Error('Each string in the text must not exceed 50 characters.');
            }
          }
        },        
      },
    },
    profilePhoto: {
      type: DataTypes.STRING,
      defaultValue: 'profilePhoto.png',
      validate: {
        len: [0, 200]       
      },
    },
    coverPhoto: {
      type: DataTypes.STRING,
      defaultValue: 'coverPhoto.png',
      validate: {
        len: [0, 200]       
      },      
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
      validate: {
        len: [0, 200]       
      },      
    },
    usernames: {
      type: DataTypes.STRING,
    },
    suspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    suspensionDuration: {
      type: DataTypes.INTEGER,
    },        
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },  
    plan: {
      type: DataTypes.STRING,
      defaultValue: 'basic',
      validate: {
        len: [0, 10]       
      },       
    },        
    suspensionTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },   
    lockedTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },   
    planTime: {
      allowNull: false,
      type:  DataTypes.DATE
    }, 
    verifiedTime: {
      allowNull: false,
      type:  DataTypes.DATE
    }, 
    roleTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },      
    suspendedBy: {
      type: DataTypes.UUID,
    },
    lockedBy: {
      type: DataTypes.UUID,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },  
    deleteTime: {
      allowNull: false,
      type:  DataTypes.DATE
    },  
    deletedBy: {
      type: DataTypes.UUID,
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },      
    phoneNumberStatus: {
      type: DataTypes.STRING,
      defaultValue: 'Private',
      allowNull: false,
      validate: {
        len: [0, 20]
      }
    },   
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 50], 
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 50],
      }
    },
    additionalName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 50],
      }
    },
    birthday: {
      type: DataTypes.DATEONLY, 
      allowNull: true,
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100], 
      }
    },
    maritalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['single', 'married', 'divorced', 'widowed','']],
      }
    },  
    professionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },       
    otp: {
      type: DataTypes.STRING,
      allowNull: true, // Will be set only when an OTP is sent
    },
    otpExpires: {
      type: DataTypes.DATE,
      allowNull: true, // Stores the expiration time of the OTP
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },    
    isPayingMember: { // New field
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    membershipExpires: { // New field: Stores when the current membership expires
        type: DataTypes.DATE,
        allowNull: true,
    },    
  }, {
    sequelize,
    modelName: 'User',
  });

  User.addHook('beforeSave', async (user) => {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  User.prototype.getSignedJwtToken = function () {
    let expiresIn = process.env.JWT_EXPIRE;
    let secret = process.env.JWT_SECRET;

    if (this.role.includes('admin')) {
      expiresIn = process.env.JWT_EXPIRE_ADMIN;
      secret = process.env.JWT_SECRET_ADMIN;
    }

    return jwt.sign({ id: this.id }, secret, {
      expiresIn: expiresIn,
    });
  };

  User.prototype.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken;
  };

  User.prototype.getOtp = function () {
      const otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
      const otpString = otp.toString().padStart(6, '0');

      this.otp = crypto.createHash('sha256').update(otpString).digest('hex'); // THIS LINE HASHS IT
      this.otpExpires = Date.now() + 10 * 60 * 1000;

      return otpString; // This should be the return value
  };

  return User;
};