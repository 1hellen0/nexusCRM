'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Factura', {
      id_factura: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'EmpresaCliente',
          key: 'id_empresa'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      id_contrato: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Contrato',
          key: 'id_contrato'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      numero_factura: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
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
      impuestos: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('Emitida', 'Pagada_Parcial', 'Pagada_Total', 'Anulada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Emitida'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('Factura', ['id_empresa'], {
      name: 'idx_factura_id_empresa'
    });

    await queryInterface.addIndex('Factura', ['id_contrato'], {
      name: 'idx_factura_id_contrato'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Factura');
  }
};

