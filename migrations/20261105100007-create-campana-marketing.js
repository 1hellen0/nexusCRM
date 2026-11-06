'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CampañaMarketing', {
      id_campana: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_empleado_responsable: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Empleado',
          key: 'id_empleado'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('Email', 'Webinar', 'Feria', 'Digital', 'Directa'),
        allowNull: false
      },
      presupuesto: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      estado: {
        type: Sequelize.ENUM('Planificada', 'Activa', 'Finalizada', 'Cancelada'),
        allowNull: false,
        defaultValue: 'Planificada'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('CampañaMarketing', ['id_empleado_responsable'], {
      name: 'idx_campana_id_empleado_responsable'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CampañaMarketing');
  }
};

