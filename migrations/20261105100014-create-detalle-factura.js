'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DetalleFactura', {
      id_detalle_factura: {
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
      precio_unitario: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
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

    await queryInterface.addIndex('DetalleFactura', ['id_factura'], {
      name: 'idx_detalle_factura_id_factura'
    });

    await queryInterface.addIndex('DetalleFactura', ['id_producto'], {
      name: 'idx_detalle_factura_id_producto'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DetalleFactura');
  }
};

