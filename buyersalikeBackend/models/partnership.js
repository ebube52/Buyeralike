'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Partnership extends Model {
    static associate(models) {
      Partnership.belongsTo(models.User, { foreignKey: 'userId', as: 'partner' });
      Partnership.belongsTo(models.Opening, { foreignKey: 'openingId', as: 'openingParticipated' });
      Partnership.belongsTo(models.PartnershipGroup, { foreignKey: 'partnershipGroupId', as: 'groupMembership' });
    }
  }

  Partnership.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    openingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    partnershipGroupId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'interested',
        'pending_group_join',
        'accepted_into_group',
        'declined_by_group',
        'withdrawn_interest',
        'left_group',
        'group_completed',
        'group_cancelled'
      ),
      allowNull: false,
      defaultValue: 'interested',
    },
    roleInGroup: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Partnership',
    tableName: 'Partnerships',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'openingId', 'partnershipGroupId'],
        where: {
          status: ['interested', 'pending_group_join', 'accepted_into_group'],
        },
        name: 'unique_partnership_per_user_opening_group',
      },
      {
        unique: true,
        fields: ['userId', 'openingId'],
        where: {
          partnershipGroupId: null,
          status: 'interested',
        },
        name: 'unique_general_interest_per_user_opening',
      },
    ],
  });

  return Partnership;
};
