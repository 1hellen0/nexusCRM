'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Contacto', {
      id_contacto: {
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
      nombre: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      cargo: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      correo: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      telefono: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      fecha_registro: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Clave única compuesta requerida para validar relación en OportunidadComercial
    await queryInterface.addConstraint('Contacto', {
      fields: ['id_contacto', 'id_empresa'],
      type: 'unique',
      name: 'uq_contacto_empresa'
    });

    // Índice secundario para optimización de búsquedas por empresa
    await queryInterface.addIndex('Contacto', ['id_empresa'], {
      name: 'idx_contacto_id_empresa'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Contacto');
  }
};

