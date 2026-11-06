'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Cotizacion', {
      id_cotizacion: {
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
      id_empleado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Empleado',
          key: 'id_empleado'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      numero_cotizacion: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      fecha_emision: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_vencimiento: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Borrador'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('Cotizacion', ['id_oportunidad'], {
      name: 'idx_cotizacion_id_oportunidad'
    });

    await queryInterface.addIndex('Cotizacion', ['id_empleado'], {
      name: 'idx_cotizacion_id_empleado'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Cotizacion');
  }
};

