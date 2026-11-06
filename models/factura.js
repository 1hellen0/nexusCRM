'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Factura extends Model {
    static associate(models) {
      Factura.belongsTo(models.EmpresaCliente, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
      Factura.belongsTo(models.Contrato, {
        foreignKey: 'id_contrato',
        as: 'contrato'
      });
      if (models.DetalleFactura) {
        Factura.hasMany(models.DetalleFactura, {
          foreignKey: 'id_factura',
          as: 'detalles'
        });
      }
      if (models.Pago) {
        Factura.hasMany(models.Pago, {
          foreignKey: 'id_factura',
          as: 'pagos'
        });
      }
    }
  }

  Factura.init({
    id_factura: {
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
    id_contrato: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'El id_contrato debe ser un número entero' }
      }
    },
    numero_factura: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: { msg: 'El número de factura ya está registrado' },
      validate: {
        notNull: { msg: 'El número de factura es obligatorio' },
        notEmpty: { msg: 'El número de factura no puede estar vacío' },
        len: { args: [1, 40], msg: 'El número de factura no puede exceder 40 caracteres' }
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
    impuestos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'Los impuestos deben ser un número decimal válido' },
        min: { args: [0], msg: 'Los impuestos no pueden ser negativos' }
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
      type: DataTypes.ENUM('Emitida', 'Pagada_Parcial', 'Pagada_Total', 'Anulada', 'Vencida'),
      allowNull: false,
      defaultValue: 'Emitida',
      validate: {
        isIn: {
          args: [['Emitida', 'Pagada_Parcial', 'Pagada_Total', 'Anulada', 'Vencida']],
          msg: 'El estado debe ser Emitida, Pagada_Parcial, Pagada_Total, Anulada o Vencida'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Factura',
    tableName: 'Factura',
    timestamps: false
  });

  return Factura;
};

