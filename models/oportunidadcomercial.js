'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OportunidadComercial extends Model {
    static associate(models) {
      OportunidadComercial.belongsTo(models.EmpresaCliente, {
        foreignKey: 'id_empresa',
        as: 'empresa'
      });
      OportunidadComercial.belongsTo(models.Contacto, {
        foreignKey: 'id_contacto',
        as: 'contacto'
      });
      OportunidadComercial.hasMany(models.ActividadSeguimiento, {
        foreignKey: 'id_oportunidad',
        as: 'actividades'
      });
      if (models.CampañaMarketing) {
        OportunidadComercial.belongsTo(models.CampañaMarketing, {
          foreignKey: 'id_campana',
          as: 'campana'
        });
      }
      if (models.Cotizacion) {
        OportunidadComercial.hasMany(models.Cotizacion, {
          foreignKey: 'id_oportunidad',
          as: 'cotizaciones'
        });
      }
    }
  }

  OportunidadComercial.init({
    id_oportunidad: {
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
    id_contacto: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_contacto es obligatorio' },
        isInt: { msg: 'El id_contacto debe ser un número entero' }
      }
    },
    id_campana: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: 'El id_campana debe ser un número entero' }
      }
    },
    titulo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notNull: { msg: 'El título de la oportunidad es obligatorio' },
        notEmpty: { msg: 'El título no puede estar vacío' },
        len: { args: [1, 150], msg: 'El título no puede exceder 150 caracteres' }
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    valor_estimado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El valor estimado es obligatorio' },
        isDecimal: { msg: 'El valor estimado debe ser un número decimal válido' },
        min: {
          args: [0],
          msg: 'El valor estimado no puede ser negativo'
        }
      }
    },
    etapa: {
      type: DataTypes.ENUM('Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida'),
      allowNull: false,
      defaultValue: 'Nueva',
      validate: {
        isIn: {
          args: [['Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida']],
          msg: 'La etapa debe ser Nueva, Contactada, Propuesta, Negociacion, Ganada o Perdida'
        }
      }
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    fecha_cierre_estimada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: { msg: 'La fecha de cierre estimada debe ser una fecha válida (YYYY-MM-DD)' }
      }
    }
  }, {
    sequelize,
    modelName: 'OportunidadComercial',
    tableName: 'OportunidadComercial',
    timestamps: false
  });

  return OportunidadComercial;
};

