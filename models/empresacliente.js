'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmpresaCliente extends Model {
    static associate(models) {
      EmpresaCliente.hasMany(models.Contacto, {
        foreignKey: 'id_empresa',
        as: 'contactos'
      });
      EmpresaCliente.hasMany(models.OportunidadComercial, {
        foreignKey: 'id_empresa',
        as: 'oportunidades'
      });
      if (models.DireccionEmpresa) {
        EmpresaCliente.hasMany(models.DireccionEmpresa, {
          foreignKey: 'id_empresa',
          as: 'direcciones'
        });
      }
      if (models.SectorEmpresarial) {
        EmpresaCliente.belongsTo(models.SectorEmpresarial, {
          foreignKey: 'id_sector',
          as: 'sectorEmpresarial'
        });
      }
      if (models.Contrato) {
        EmpresaCliente.hasMany(models.Contrato, {
          foreignKey: 'id_empresa',
          as: 'contratos'
        });
      }
      if (models.Factura) {
        EmpresaCliente.hasMany(models.Factura, {
          foreignKey: 'id_empresa',
          as: 'facturas'
        });
      }
    }
  }

  EmpresaCliente.init({
    id_empresa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_sector: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'El id_sector debe ser un número entero' }
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
    sector: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: { msg: 'El sector es obligatorio' },
        notEmpty: { msg: 'El sector no puede estar vacío' },
        len: { args: [1, 100], msg: 'El sector no puede exceder 100 caracteres' }
      }
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: { msg: 'El formato del correo electrónico es inválido' },
        len: { args: [0, 150], msg: 'El correo no puede exceder 150 caracteres' }
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: { args: [0, 20], msg: 'El teléfono no puede exceder 20 caracteres' }
      }
    },
    estado: {
      type: DataTypes.ENUM('Prospecto', 'Activo', 'Inactivo'),
      allowNull: false,
      defaultValue: 'Prospecto',
      validate: {
        isIn: {
          args: [['Prospecto', 'Activo', 'Inactivo']],
          msg: 'El estado debe ser Prospecto, Activo o Inactivo'
        }
      }
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'EmpresaCliente',
    tableName: 'EmpresaCliente',
    timestamps: false
  });

  return EmpresaCliente;
};

