'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pago extends Model {
    static associate(models) {
      Pago.belongsTo(models.Factura, {
        foreignKey: 'id_factura',
        as: 'factura'
      });
    }
  }

  Pago.init({
    id_pago: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_factura: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_factura es obligatorio' },
        isInt: { msg: 'El id_factura debe ser un número entero' }
      }
    },
    numero_operacion: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: { msg: 'El número de operación ya está registrado' },
      validate: {
        notNull: { msg: 'El número de operación es obligatorio' },
        notEmpty: { msg: 'El número de operación no puede estar vacío' },
        len: { args: [1, 60], msg: 'El número de operación no puede exceder 60 caracteres' }
      }
    },
    fecha_pago: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: 'La fecha de pago es obligatoria' },
        isDate: { msg: 'La fecha de pago debe ser una fecha y hora válida' }
      }
    },
    monto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El monto es obligatorio' },
        isDecimal: { msg: 'El monto debe ser un número decimal válido' },
        isGreaterThanZero(value) {
          if (value === null || value === undefined || Number(value) <= 0) {
            throw new Error('El monto debe ser mayor que cero');
          }
        }
      }
    },
    metodo_pago: {
      type: DataTypes.ENUM('Transferencia', 'Tarjeta', 'Cheque', 'Efectivo'),
      allowNull: false,
      validate: {
        notNull: { msg: 'El método de pago es obligatorio' },
        isIn: {
          args: [['Transferencia', 'Tarjeta', 'Cheque', 'Efectivo']],
          msg: 'El método de pago debe ser Transferencia, Tarjeta, Cheque o Efectivo'
        }
      }
    },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'Confirmado', 'Rechazado'),
      allowNull: false,
      defaultValue: 'Confirmado',
      validate: {
        isIn: {
          args: [['Pendiente', 'Confirmado', 'Rechazado']],
          msg: 'El estado debe ser Pendiente, Confirmado o Rechazado'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Pago',
    tableName: 'Pago',
    timestamps: false
  });

  return Pago;
};

