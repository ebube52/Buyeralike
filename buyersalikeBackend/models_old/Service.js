const { Model, Sequelize } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    static associate(models) {
      Service.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  Service.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },      
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      serviceDescription: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      charge: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      chargeDuration: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Service',
      timestamps: true,
    }
  );

  return Service;
};


/*
const mongoose = require('mongoose')

const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const ServiceSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      uniqueCaseInsensitive: true      
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },   
    category: {
      type: String,
      required: true,
    },
    serviceDescription: {
      type: String,
      required: true,
    },   
    charge: {
      type: String,
      required: true,
    },        
    chargeDuration: {
      type: String,
      required: true,
    },    
    name: {
      type: String,
      required: true,
    },        
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    }   
  },
  { timestamps: true }
)

ServiceSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model('Service', ServiceSchema)
*/