'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pago', {
      id_pago: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_factura: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Factura',
          key: 'id_factura'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      numero_operacion: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true
      },
      fecha_pago: {
        type: Sequelize.DATE,
        allowNull: false
      },
      monto: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      metodo_pago: {
        type: Sequelize.ENUM('Transferencia', 'Tarjeta', 'Cheque', 'Efectivo'),
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Confirmado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Confirmado'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('Pago', ['id_factura'], {
      name: 'idx_pago_id_factura'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pago');
  }
};

