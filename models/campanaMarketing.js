'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CampañaMarketing extends Model {
    static associate(models) {
      CampañaMarketing.belongsTo(models.Empleado, {
        foreignKey: 'id_empleado_responsable',
        as: 'responsable'
      });
      if (models.OportunidadComercial) {
        CampañaMarketing.hasMany(models.OportunidadComercial, {
          foreignKey: 'id_campana',
          as: 'oportunidades'
        });
      }
    }
  }

  CampañaMarketing.init({
    id_campana: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_empleado_responsable: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_empleado_responsable es obligatorio' },
        isInt: { msg: 'El id_empleado_responsable debe ser un número entero' }
      }
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: 'El nombre de la campaña es obligatorio' },
        notEmpty: { msg: 'El nombre de la campaña no puede estar vacío' },
        len: { args: [1, 120], msg: 'El nombre no puede exceder 120 caracteres' }
      }
    },
    tipo: {
      type: DataTypes.ENUM('Email', 'Webinar', 'Feria', 'Digital', 'Directa'),
      allowNull: false,
      validate: {
        notNull: { msg: 'El tipo de campaña es obligatorio' },
        isIn: {
          args: [['Email', 'Webinar', 'Feria', 'Digital', 'Directa']],
          msg: 'El tipo debe ser Email, Webinar, Feria, Digital o Directa'
        }
      }
    },
    presupuesto: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        isDecimal: { msg: 'El presupuesto debe ser un número decimal válido' },
        min: {
          args: [0],
          msg: 'El presupuesto no puede ser negativo'
        }
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
    estado: {
      type: DataTypes.ENUM('Planificada', 'Activa', 'Finalizada', 'Cancelada'),
      allowNull: false,
      defaultValue: 'Planificada',
      validate: {
        isIn: {
          args: [['Planificada', 'Activa', 'Finalizada', 'Cancelada']],
          msg: 'El estado debe ser Planificada, Activa, Finalizada o Cancelada'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'CampañaMarketing',
    tableName: 'CampañaMarketing',
    timestamps: false
  });

  return CampañaMarketing;
};

