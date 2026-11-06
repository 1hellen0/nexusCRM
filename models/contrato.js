'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contrato extends Model {
    static associate(models) {
      Contrato.belongsTo(models.EmpresaCliente, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
      Contrato.belongsTo(models.Cotizacion, {
        foreignKey: 'id_cotizacion',
        as: 'cotizacion'
      });
      Contrato.belongsTo(models.Empleado, {
        foreignKey: 'id_empleado_aprobador',
        as: 'aprobador'
      });
      if (models.Factura) {
        Contrato.hasMany(models.Factura, {
          foreignKey: 'id_contrato',
          as: 'facturas'
        });
      }
    }
  }

  Contrato.init({
    id_contrato: {
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
    id_cotizacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: { msg: 'La cotización ya está vinculada a otro contrato' },
      validate: {
        isInt: { msg: 'El id_cotizacion debe ser un número entero' }
      }
    },
    id_empleado_aprobador: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_empleado_aprobador es obligatorio' },
        isInt: { msg: 'El id_empleado_aprobador debe ser un número entero' }
      }
    },
    numero_contrato: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: { msg: 'El número de contrato ya está registrado' },
      validate: {
        notNull: { msg: 'El número de contrato es obligatorio' },
        notEmpty: { msg: 'El número de contrato no puede estar vacío' },
        len: { args: [1, 40], msg: 'El número de contrato no puede exceder 40 caracteres' }
      }
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'La fecha de inicio es obligatoria' },
        isDate: { msg: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' }
      }
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: { msg: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' }
      }
    },
    monto_acordado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El monto acordado es obligatorio' },
        isDecimal: { msg: 'El monto acordado debe ser un número decimal válido' },
        min: { args: [0], msg: 'El monto acordado no puede ser negativo' }
      }
    },
    estado: {
      type: DataTypes.ENUM('Borrador', 'Vigente', 'Renovado', 'Finalizado', 'Cancelado'),
      allowNull: false,
      defaultValue: 'Borrador',
      validate: {
        isIn: {
          args: [['Borrador', 'Vigente', 'Renovado', 'Finalizado', 'Cancelado']],
          msg: 'El estado debe ser Borrador, Vigente, Renovado, Finalizado o Cancelado'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Contrato',
    tableName: 'Contrato',
    timestamps: false
  });

  return Contrato;
};

