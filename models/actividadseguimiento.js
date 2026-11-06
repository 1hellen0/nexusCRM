'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActividadSeguimiento extends Model {
    static associate(models) {
      ActividadSeguimiento.belongsTo(models.OportunidadComercial, {
        foreignKey: 'id_oportunidad',
        as: 'oportunidad'
      });
    }
  }

  ActividadSeguimiento.init({
    id_actividad: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_oportunidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_oportunidad es obligatorio' },
        isInt: { msg: 'El id_oportunidad debe ser un número entero' }
      }
    },
    tipo: {
      type: DataTypes.ENUM('Llamada', 'Reunion', 'Correo', 'Otro'),
      allowNull: false,
      validate: {
        notNull: { msg: 'El tipo de actividad es obligatorio' },
        isIn: {
          args: [['Llamada', 'Reunion', 'Correo', 'Otro']],
          msg: 'El tipo debe ser Llamada, Reunion, Correo u Otro'
        }
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'La descripción es obligatoria' },
        notEmpty: { msg: 'La descripción no puede estar vacía' }
      }
    },
    fecha_actividad: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: 'La fecha de actividad es obligatoria' },
        isDate: { msg: 'La fecha de actividad debe ser una fecha y hora válida' }
      }
    },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'Completada', 'Cancelada'),
      allowNull: false,
      defaultValue: 'Pendiente',
      validate: {
        isIn: {
          args: [['Pendiente', 'Completada', 'Cancelada']],
          msg: 'El estado debe ser Pendiente, Completada o Cancelada'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'ActividadSeguimiento',
    tableName: 'ActividadSeguimiento',
    timestamps: false
  });

  return ActividadSeguimiento;
};

