'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DetalleCotizacion extends Model {
    static associate(models) {
      DetalleCotizacion.belongsTo(models.Cotizacion, {
        foreignKey: 'id_cotizacion',
        as: 'cotizacion'
      });
      DetalleCotizacion.belongsTo(models.ProductoServicio, {
        foreignKey: 'id_producto',
        as: 'producto'
      });
    }
  }

  DetalleCotizacion.init({
    id_detalle_cotizacion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_cotizacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_cotizacion es obligatorio' },
        isInt: { msg: 'El id_cotizacion debe ser un número entero' }
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
    precio_unitario_pactado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El precio unitario pactado es obligatorio' },
        isDecimal: { msg: 'El precio unitario debe ser un número decimal válido' },
        min: { args: [0], msg: 'El precio unitario pactado no puede ser negativo' }
      }
    },
    descuento_porcentaje: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'El porcentaje de descuento debe ser un número decimal válido' },
        min: { args: [0], msg: 'El porcentaje de descuento no puede ser negativo' },
        max: { args: [100], msg: 'El porcentaje de descuento no puede ser superior a 100' }
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
    modelName: 'DetalleCotizacion',
    tableName: 'DetalleCotizacion',
    timestamps: false
  });

  return DetalleCotizacion;
};

