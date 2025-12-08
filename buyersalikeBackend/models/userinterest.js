'use strict';
module.exports = (sequelize, DataTypes) => {
    const UserInterest = sequelize.define('UserInterest', {
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
        },
        interestId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
        },
    }, {
        timestamps: false,
    });

    return UserInterest;
};
