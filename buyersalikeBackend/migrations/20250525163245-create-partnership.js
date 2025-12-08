// migrations/xxxxxxxxxxxxxx-create-partnership.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Partnerships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      openingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Openings', // Make sure this matches your Opening model's table name
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      partnershipGroupId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'PartnershipGroups', // Make sure this matches your PartnershipGroup model's table name
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM(
          'interested',
          'pending_group_join',
          'accepted_into_group',
          'declined_by_group',
          'withdrawn_interest',
          'left_group',
          'group_completed',
          'group_cancelled'
        ),
        defaultValue: 'interested',
        allowNull: false,
      },
      roleInGroup: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    }).then(() => {
      // Add the unique indexes after table creation
      return Promise.all([
        queryInterface.addConstraint('Partnerships', {
          fields: ['userId', 'openingId', 'partnershipGroupId'],
          type: 'unique',
          name: 'unique_partnership_per_user_opening_group',
          where: {
            status: ['interested', 'pending_group_join', 'accepted_into_group'],
          },
        }),
        queryInterface.addConstraint('Partnerships', {
          fields: ['userId', 'openingId'],
          type: 'unique',
          name: 'unique_general_interest_per_user_opening',
          where: {
            partnershipGroupId: null,
            status: 'interested',
          },
        }),
      ]);
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Partnerships');
  }
};