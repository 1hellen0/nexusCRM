'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ActividadSeguimiento', {
      id_actividad: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_oportunidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'OportunidadComercial',
          key: 'id_oportunidad'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      tipo: {
        type: Sequelize.ENUM('Llamada', 'Reunion', 'Correo', 'Otro'),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      fecha_actividad: {
        type: Sequelize.DATE,
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Completada', 'Cancelada'),
        allowNull: false,
        defaultValue: 'Pendiente'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Índice secundario para optimización de consultas por oportunidad
    await queryInterface.addIndex('ActividadSeguimiento', ['id_oportunidad'], {
      name: 'idx_actividad_id_oportunidad'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ActividadSeguimiento');
  }
};

