'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Departamento extends Model {
    static associate(models) {
      if (models.Empleado) {
        Departamento.hasMany(models.Empleado, {
          foreignKey: 'id_departamento',
          as: 'empleados'
        });
      }
    }
  }

  Departamento.init({
    id_departamento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: { msg: 'El código de departamento ya está registrado' },
      validate: {
        notNull: { msg: 'El código es obligatorio' },
        notEmpty: { msg: 'El código no puede estar vacío' },
        len: { args: [1, 20], msg: 'El código no puede exceder 20 caracteres' }
      }
    },
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: { msg: 'El nombre del departamento ya está registrado' },
      validate: {
        notNull: { msg: 'El nombre es obligatorio' },
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [1, 80], msg: 'El nombre no puede exceder 80 caracteres' }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Departamento',
    tableName: 'Departamento',
    timestamps: false
  });

  return Departamento;
};

