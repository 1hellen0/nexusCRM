'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('OportunidadComercial', {
      id_oportunidad: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_empresa: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      id_contacto: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      titulo: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      valor_estimado: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      etapa: {
        type: Sequelize.ENUM('Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida'),
        allowNull: false,
        defaultValue: 'Nueva'
      },
      fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      fecha_cierre_estimada: {
        type: Sequelize.DATEONLY,
        allowNull: true
      }
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Índice compuesto sobre los campos foráneos
    await queryInterface.addIndex('OportunidadComercial', ['id_contacto', 'id_empresa'], {
      name: 'idx_oportunidad_contacto_empresa'
    });

    // Clave foránea compuesta que asegura que el contacto pertenece a la misma empresa
    await queryInterface.addConstraint('OportunidadComercial', {
      fields: ['id_contacto', 'id_empresa'],
      type: 'foreign key',
      name: 'fk_oportunidad_contacto_empresa',
      references: {
        table: 'Contacto',
        fields: ['id_contacto', 'id_empresa']
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Restricción CHECK para impedir importes comerciales negativos
    await queryInterface.addConstraint('OportunidadComercial', {
      fields: ['valor_estimado'],
      type: 'check',
      where: {
        valor_estimado: {
          [Sequelize.Op.gte]: 0
        }
      },
      name: 'chk_oportunidad_valor_positivo'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('OportunidadComercial');
  }
};

