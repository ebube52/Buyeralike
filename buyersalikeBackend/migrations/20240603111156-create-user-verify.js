'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserVerifies', {
      id: {
        allowNull: false,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        allowNull: false,
        type: Sequelize.UUID
      },
      verificationFee: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      paymentDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      successful: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      idCardUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      verificationStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'requested', 'approved', 'rejected']],
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('UserVerifies');
  }
};
