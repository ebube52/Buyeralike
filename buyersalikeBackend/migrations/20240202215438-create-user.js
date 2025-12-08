'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      },
      country: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 20],
        },
      },
      state: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 20],
        },
      },
      lga: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 50],
        },
      },
      address: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 50],
        },
      },
      businessName: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 30],
        },
        unique: true,
      },
      service: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 30],
        },
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          len: [5, 15],
          isAlphanumeric: true,
        },
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          len: [0, 50],
        },
      },
      phoneNumber: {
        type: Sequelize.STRING,
        validate: {
          is: /^\d{0,14}$/,
        },
      },
      role: {
        type: Sequelize.ENUM('user', 'adminL1', 'adminL2', 'adminL3', 'adminL4', 'adminL5'),
        defaultValue: 'user',
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [8, 50],
        },
      },
      resetPasswordToken: Sequelize.STRING,
      resetPasswordExpire: Sequelize.DATE,
      biodata: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 300],
        },
      },
      profilePhoto: {
        type: Sequelize.STRING,
        defaultValue: 'profilePhoto.png',
      },
      coverPhoto: {
        type: Sequelize.STRING,
        defaultValue: 'coverPhoto.png',
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verificationStage: {
        type: Sequelize.INTEGER,
        validate: {
          max: 1,
        },
      },
      video: {
        type: Sequelize.STRING,
        defaultValue: 'no-photo.jpg',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};