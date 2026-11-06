'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductoServicio extends Model {
    static associate(models) {
      ProductoServicio.belongsTo(models.CategoriaProducto, {
        foreignKey: 'id_categoria',
        as: 'categoria'
      });
      if (models.DetalleCotizacion) {
        ProductoServicio.hasMany(models.DetalleCotizacion, {
          foreignKey: 'id_producto',
          as: 'detallesCotizacion'
        });
      }
      if (models.DetalleFactura) {
        ProductoServicio.hasMany(models.DetalleFactura, {
          foreignKey: 'id_producto',
          as: 'detallesFactura'
        });
      }
    }
  }

  ProductoServicio.init({
    id_producto: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_categoria es obligatorio' },
        isInt: { msg: 'El id_categoria debe ser un número entero' }
      }
    },
    codigo_sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { msg: 'El código SKU ya está registrado' },
      validate: {
        notNull: { msg: 'El código SKU es obligatorio' },
        notEmpty: { msg: 'El código SKU no puede estar vacío' },
        len: { args: [1, 50], msg: 'El código SKU no puede exceder 50 caracteres' }
      }
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notNull: { msg: 'El nombre es obligatorio' },
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [1, 150], msg: 'El nombre no puede exceder 150 caracteres' }
      }
    },
    tipo: {
      type: DataTypes.ENUM('Producto', 'Servicio'),
      allowNull: false,
      validate: {
        notNull: { msg: 'El tipo es obligatorio' },
        isIn: {
          args: [['Producto', 'Servicio']],
          msg: 'El tipo debe ser Producto o Servicio'
        }
      }
    },
    precio_unitario: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El precio unitario es obligatorio' },
        isDecimal: { msg: 'El precio unitario debe ser un número decimal válido' },
        min: {
          args: [0],
          msg: 'El precio unitario no puede ser negativo'
        }
      }
    },
    moneda: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        notNull: { msg: 'La moneda es obligatoria' },
        len: { args: [3, 3], msg: 'La moneda debe ser un código de 3 caracteres (p. ej. USD, MXN)' }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'ProductoServicio',
    tableName: 'ProductoServicio',
    timestamps: false
  });

  return ProductoServicio;
};

