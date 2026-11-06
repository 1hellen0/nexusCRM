'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Contrato', {
      id_contrato: {
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
      id_cotizacion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        references: {
          model: 'Cotizacion',
          key: 'id_cotizacion'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      },
      id_empleado_aprobador: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Empleado',
          key: 'id_empleado'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      numero_contrato: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      monto_acordado: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('Borrador', 'Vigente', 'Renovado', 'Finalizado', 'Cancelado'),
        allowNull: false,
        defaultValue: 'Borrador'
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    await queryInterface.addIndex('Contrato', ['id_empresa'], {
      name: 'idx_contrato_id_empresa'
    });

    await queryInterface.addIndex('Contrato', ['id_empleado_aprobador'], {
      name: 'idx_contrato_id_empleado_aprobador'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Contrato');
  }
};

