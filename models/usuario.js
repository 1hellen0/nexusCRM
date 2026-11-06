'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      if (models.Empleado) {
        Usuario.hasOne(models.Empleado, {
          foreignKey: 'id_usuario',
          as: 'empleado'
        });
      }
    }
  }

  Usuario.init({
    id_usuario: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: 'El nombre es obligatorio' },
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [1, 120], msg: 'El nombre no puede exceder 120 caracteres' }
      }
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: { msg: 'El correo electrónico ya está registrado' },
      validate: {
        notNull: { msg: 'El correo electrónico es obligatorio' },
        isEmail: { msg: 'El formato del correo electrónico es inválido' },
        len: { args: [1, 150], msg: 'El correo no puede exceder 150 caracteres' }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notNull: { msg: 'El hash de contraseña es obligatorio' },
        notEmpty: { msg: 'El hash de contraseña no puede estar vacío' }
      }
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'Usuario',
    timestamps: false,
    defaultScope: {
      attributes: {
        exclude: ['password_hash']
      }
    },
    scopes: {
      withPassword: {
        attributes: {
          include: ['password_hash']
        }
      }
    }
  });

  return Usuario;
};

