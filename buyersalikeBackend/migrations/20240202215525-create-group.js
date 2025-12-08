'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Groups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: () => uuidv4(),         
        primaryKey: true,       
        allowNull: false,        
      },
      creatorUserId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      creatorUserName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      accessType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      about: {
        type: Sequelize.STRING,
        validate: {
          len: {
            args: [0, 1000],
            msg: 'About data exceeds 1000 characters!',
          },
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
      member: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    await queryInterface.dropTable('Groups');
  }
};