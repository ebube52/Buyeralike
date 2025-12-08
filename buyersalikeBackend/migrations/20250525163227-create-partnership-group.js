'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PartnershipGroups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      openingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Openings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      creatorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Unnamed Partnership Group',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          'forming',
          'closed_to_new_partners',
          'document_gathering',
          'approvals_complete',
          'active',
          'on_hold',
          'dispute',
          'completed',
          'cancelled'
        ),
        defaultValue: 'forming',
        allowNull: false,
      },
      maxMembers: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 2,
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
    await queryInterface.dropTable('PartnershipGroups');
  }
};