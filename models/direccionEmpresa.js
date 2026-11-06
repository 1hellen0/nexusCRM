'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DireccionEmpresa extends Model {
    static associate(models) {
      DireccionEmpresa.belongsTo(models.EmpresaCliente, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
    }
  }

  DireccionEmpresa.init({
    id_direccion: {
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
    tipo: {
      type: DataTypes.ENUM('Fiscal', 'Operativa', 'Entrega', 'Matriz'),
      allowNull: false,
      defaultValue: 'Fiscal',
      validate: {
        isIn: {
          args: [['Fiscal', 'Operativa', 'Entrega', 'Matriz']],
          msg: 'El tipo debe ser Fiscal, Operativa, Entrega o Matriz'
        }
      }
    },
    calle: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notNull: { msg: 'La calle es obligatoria' },
        notEmpty: { msg: 'La calle no puede estar vacía' },
        len: { args: [1, 200], msg: 'La calle no puede exceder 200 caracteres' }
      }
    },
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: { msg: 'La ciudad es obligatoria' },
        notEmpty: { msg: 'La ciudad no puede estar vacía' },
        len: { args: [1, 100], msg: 'La ciudad no puede exceder 100 caracteres' }
      }
    },
    estado_provincia: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: { msg: 'El estado o provincia es obligatorio' },
        notEmpty: { msg: 'El estado o provincia no puede estar vacío' },
        len: { args: [1, 100], msg: 'El estado o provincia no puede exceder 100 caracteres' }
      }
    },
    codigo_postal: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: { args: [0, 20], msg: 'El código postal no puede exceder 20 caracteres' }
      }
    },
    pais: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notNull: { msg: 'El país es obligatorio' },
        notEmpty: { msg: 'El país no puede estar vacío' },
        len: { args: [1, 80], msg: 'El país no puede exceder 80 caracteres' }
      }
    }
  }, {
    sequelize,
    modelName: 'DireccionEmpresa',
    tableName: 'DireccionEmpresa',
    timestamps: false
  });

  return DireccionEmpresa;
};

