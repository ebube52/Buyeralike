'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PartnershipGroup extends Model {
    static associate(models) {
      PartnershipGroup.belongsTo(models.Opening, { foreignKey: 'openingId', as: 'opening' });
      PartnershipGroup.belongsTo(models.User, { foreignKey: 'creatorId', as: 'groupCreator' });
      PartnershipGroup.hasMany(models.Partnership, { foreignKey: 'partnershipGroupId', as: 'memberships' });
    }
  }

  PartnershipGroup.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    openingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Unnamed Partnership Group',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
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
      allowNull: false,
      defaultValue: 'forming',
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 2,
      },
    },
  }, {
    sequelize,
    modelName: 'PartnershipGroup',
    tableName: 'PartnershipGroups',
    timestamps: true,
  });

  return PartnershipGroup;
};
