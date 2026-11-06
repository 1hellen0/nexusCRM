'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contacto extends Model {
    static associate(models) {
      Contacto.belongsTo(models.EmpresaCliente, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
      Contacto.hasMany(models.OportunidadComercial, {
        foreignKey: 'id_contacto',
        as: 'oportunidades'
      });
    }
  }

  Contacto.init({
    id_contacto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_empresa es obligatorio' },
        isInt: { msg: 'El id_empresa debe ser un número entero' }
      }
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: 'El nombre del contacto es obligatorio' },
        notEmpty: { msg: 'El nombre del contacto no puede estar vacío' },
        len: { args: [1, 120], msg: 'El nombre no puede exceder 120 caracteres' }
      }
    },
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: { args: [0, 100], msg: 'El cargo no puede exceder 100 caracteres' }
      }
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notNull: { msg: 'El correo electrónico es obligatorio' },
        isEmail: { msg: 'El formato del correo electrónico es inválido' },
        len: { args: [1, 150], msg: 'El correo no puede exceder 150 caracteres' }
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: { args: [0, 20], msg: 'El teléfono no puede exceder 20 caracteres' }
      }
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Contacto',
    tableName: 'Contacto',
    timestamps: false
  });

  return Contacto;
};

