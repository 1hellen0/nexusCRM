'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('EmpresaCliente', 'id_sector', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addConstraint('EmpresaCliente', {
      fields: ['id_sector'],
      type: 'foreign key',
      name: 'fk_empresa_cliente_sector',
      references: {
        table: 'SectorEmpresarial',
        field: 'id_sector'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addIndex('EmpresaCliente', ['id_sector'], {
      name: 'idx_empresa_cliente_id_sector'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('EmpresaCliente', 'fk_empresa_cliente_sector');
    await queryInterface.removeIndex('EmpresaCliente', 'idx_empresa_cliente_id_sector');
    await queryInterface.removeColumn('EmpresaCliente', 'id_sector');
  }
};

