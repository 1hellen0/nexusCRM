'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProductoServicio', {
      id_producto: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_categoria: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'CategoriaProducto',
          key: 'id_categoria'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      codigo_sku: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      nombre: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('Producto', 'Servicio'),
        allowNull: false
      },
      precio_unitario: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      moneda: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
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

    await queryInterface.addIndex('ProductoServicio', ['id_categoria'], {
      name: 'idx_producto_servicio_id_categoria'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ProductoServicio');
  }
};

