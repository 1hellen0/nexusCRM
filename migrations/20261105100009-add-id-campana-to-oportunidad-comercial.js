'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OportunidadComercial', 'id_campana', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addConstraint('OportunidadComercial', {
      fields: ['id_campana'],
      type: 'foreign key',
      name: 'fk_oportunidad_campana',
      references: {
        table: 'CampañaMarketing',
        field: 'id_campana'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addIndex('OportunidadComercial', ['id_campana'], {
      name: 'idx_oportunidad_id_campana'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('OportunidadComercial', 'fk_oportunidad_campana');
    await queryInterface.removeIndex('OportunidadComercial', 'idx_oportunidad_id_campana');
    await queryInterface.removeColumn('OportunidadComercial', 'id_campana');
  }
};

