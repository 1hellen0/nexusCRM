'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Empleado', {
      id_empleado: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_departamento: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Departamento',
          key: 'id_departamento'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      apellido: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      correo: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      telefono: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      cargo: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('Empleado', ['id_departamento'], {
      name: 'idx_empleado_id_departamento'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Empleado');
  }
};

