'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DetalleFactura extends Model {
    static associate(models) {
      DetalleFactura.belongsTo(models.Factura, {
        foreignKey: 'id_factura',
        as: 'factura'
      });
      DetalleFactura.belongsTo(models.ProductoServicio, {
        foreignKey: 'id_producto',
        as: 'producto'
      });
    }
  }

  DetalleFactura.init({
    id_detalle_factura: {
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
    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_producto es obligatorio' },
        isInt: { msg: 'El id_producto debe ser un número entero' }
      }
    },
    cantidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'La cantidad es obligatoria' },
        isDecimal: { msg: 'La cantidad debe ser un número decimal válido' },
        min: { args: [0.01], msg: 'La cantidad debe ser mayor a 0' }
      }
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El precio unitario es obligatorio' },
        isDecimal: { msg: 'El precio unitario debe ser un número decimal válido' },
        min: { args: [0], msg: 'El precio unitario no puede ser negativo' }
      }
    },
    subtotal_linea: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El subtotal de línea es obligatorio' },
        isDecimal: { msg: 'El subtotal de línea debe ser un número decimal válido' },
        min: { args: [0], msg: 'El subtotal de línea no puede ser negativo' }
      }
    }
  }, {
    sequelize,
    modelName: 'DetalleFactura',
    tableName: 'DetalleFactura',
    timestamps: false
  });

  return DetalleFactura;
};

