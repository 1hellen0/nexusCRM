'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Empleado extends Model {
    static associate(models) {
      Empleado.belongsTo(models.Departamento, {
        foreignKey: 'id_departamento',
        as: 'departamento'
      });
      Empleado.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
        as: 'usuario'
      });
      if (models.CampañaMarketing) {
        Empleado.hasMany(models.CampañaMarketing, {
          foreignKey: 'id_empleado_responsable',
          as: 'campanas'
        });
      }
      if (models.Cotizacion) {
        Empleado.hasMany(models.Cotizacion, {
          foreignKey: 'id_empleado',
          as: 'cotizaciones'
        });
      }
      if (models.Contrato) {
        Empleado.hasMany(models.Contrato, {
          foreignKey: 'id_empleado_aprobador',
          as: 'contratosAprobados'
        });
      }
    }
  }

  Empleado.init({
    id_empleado: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    id_departamento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El id_departamento es obligatorio' },
        isInt: { msg: 'El id_departamento debe ser un número entero' }
      }
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: { msg: 'El usuario ya está vinculado a otro empleado' },
      validate: {
        isInt: { msg: 'El id_usuario debe ser un número entero' }
      }
    },
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notNull: { msg: 'El nombre es obligatorio' },
        notEmpty: { msg: 'El nombre no puede estar vacío' },
        len: { args: [1, 80], msg: 'El nombre no puede exceder 80 caracteres' }
      }
    },
    apellido: {
      type: DataTypes.STRING(80),
      allowNull: false,
      validate: {
        notNull: { msg: 'El apellido es obligatorio' },
        notEmpty: { msg: 'El apellido no puede estar vacío' },
        len: { args: [1, 80], msg: 'El apellido no puede exceder 80 caracteres' }
      }
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: { msg: 'El correo electrónico ya está registrado' },
      validate: {
        notNull: { msg: 'El correo electrónico es obligatorio' },
        isEmail: { msg: 'El formato del correo electrónico es inválido' },
        len: { args: [1, 150], msg: 'El correo no puede exceder 150 caracteres' }
      }
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: { args: [0, 20], msg: 'El teléfono no puede exceder 20 caracteres' }
      }
    },
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: { msg: 'El cargo es obligatorio' },
        notEmpty: { msg: 'El cargo no puede estar vacío' },
        len: { args: [1, 100], msg: 'El cargo no puede exceder 100 caracteres' }
      }
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Empleado',
    tableName: 'Empleado',
    timestamps: false
  });

  return Empleado;
};

