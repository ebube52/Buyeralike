'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('KycApplications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4 // Ensure UUIDV4 is used for primary key in migration
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users', // This should match the exact table name of your Users model
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      serviceType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      documentUrls: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true, // Optional field
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true, // Optional field
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true, // Optional field
        references: {
          model: 'Users', // This should match the exact table name of your Users model
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
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
    await queryInterface.dropTable('KycApplications');
    // Important: When dropping the table, you may also need to remove the ENUM type
    // if it's not used by other tables. Sequelize usually handles this if it's only on this table.
    // If you encounter issues on rollback, you might need:
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_KycApplications_status";');
  }
};