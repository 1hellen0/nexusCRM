'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleCotizacion', {
      id_detalle_cotizacion: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_cotizacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cotizacion',
          key: 'id_cotizacion'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      id_producto: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProductoServicio',
          key: 'id_producto'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      cantidad: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      precio_unitario_pactado: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      descuento_porcentaje: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      subtotal_linea: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('DetalleCotizacion', ['id_cotizacion'], {
      name: 'idx_detalle_cotizacion_id_cotizacion'
    });

    await queryInterface.addIndex('DetalleCotizacion', ['id_producto'], {
      name: 'idx_detalle_cotizacion_id_producto'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DetalleCotizacion');
  }
};

