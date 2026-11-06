'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cotizacion extends Model {
    static associate(models) {
      Cotizacion.belongsTo(models.OportunidadComercial, {
        foreignKey: 'id_oportunidad',
        as: 'oportunidad'
      });
      Cotizacion.belongsTo(models.Empleado, {
        foreignKey: 'id_empleado',
        as: 'empleado'
      });
      if (models.DetalleCotizacion) {
        Cotizacion.hasMany(models.DetalleCotizacion, {
          foreignKey: 'id_cotizacion',
          as: 'detalles'
        });
      }
      if (models.Contrato) {
        Cotizacion.hasOne(models.Contrato, {
          foreignKey: 'id_cotizacion',
          as: 'contrato'
        });
      }
    }
  }

  Cotizacion.init({
    id_cotizacion: {
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
    id_empleado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_empleado es obligatorio' },
        isInt: { msg: 'El id_empleado debe ser un número entero' }
      }
    },
    numero_cotizacion: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: { msg: 'El número de cotización ya está registrado' },
      validate: {
        notNull: { msg: 'El número de cotización es obligatorio' },
        notEmpty: { msg: 'El número de cotización no puede estar vacío' },
        len: { args: [1, 40], msg: 'El número de cotización no puede exceder 40 caracteres' }
      }
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        isInt: { msg: 'La versión debe ser un número entero' },
        min: { args: [1], msg: 'La versión debe ser al menos 1' }
      }
    },
    fecha_emision: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'La fecha de emisión es obligatoria' },
        isDate: { msg: 'La fecha de emisión debe ser una fecha válida (YYYY-MM-DD)' }
      }
    },
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'La fecha de vencimiento es obligatoria' },
        isDate: { msg: 'La fecha de vencimiento debe ser una fecha válida (YYYY-MM-DD)' }
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El subtotal es obligatorio' },
        isDecimal: { msg: 'El subtotal debe ser un número decimal válido' },
        min: { args: [0], msg: 'El subtotal no puede ser negativo' }
      }
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El total es obligatorio' },
        isDecimal: { msg: 'El total debe ser un número decimal válido' },
        min: { args: [0], msg: 'El total no puede ser negativo' }
      }
    },
    estado: {
      type: DataTypes.ENUM('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'),
      allowNull: false,
      defaultValue: 'Borrador',
      validate: {
        isIn: {
          args: [['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida']],
          msg: 'El estado debe ser Borrador, Enviada, Aprobada, Rechazada o Vencida'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Cotizacion',
    tableName: 'Cotizacion',
    timestamps: false
  });

  return Cotizacion;
};

