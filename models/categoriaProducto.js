'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CategoriaProducto extends Model {
    static associate(models) {
      if (models.ProductoServicio) {
        CategoriaProducto.hasMany(models.ProductoServicio, {
          foreignKey: 'id_categoria',
          as: 'productosServicios'
        });
      }
    }
  }

  CategoriaProducto.init({
    id_categoria: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: { msg: 'El nombre de la categoría ya está registrado' },
      validate: {
        notNull: { msg: 'El nombre es obligatorio' },
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [1, 80], msg: 'El nombre no puede exceder 80 caracteres' }
      }
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: { args: [0, 255], msg: 'La descripción no puede exceder 255 caracteres' }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'CategoriaProducto',
    tableName: 'CategoriaProducto',
    timestamps: false
  });

  return CategoriaProducto;
};

