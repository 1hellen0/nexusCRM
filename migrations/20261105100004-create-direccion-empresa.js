'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DireccionEmpresa', {
      id_direccion: {
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
      tipo: {
        type: Sequelize.ENUM('Fiscal', 'Operativa', 'Entrega', 'Matriz'),
        allowNull: false,
        defaultValue: 'Fiscal'
      },
      calle: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      ciudad: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      estado_provincia: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      codigo_postal: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      pais: {
        type: Sequelize.STRING(80),
        allowNull: false
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('DireccionEmpresa', ['id_empresa'], {
      name: 'idx_direccion_empresa_id_empresa'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DireccionEmpresa');
  }
};

