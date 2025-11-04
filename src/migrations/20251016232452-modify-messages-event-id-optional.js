'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Hacer event_id opcional para permitir mensajes sin evento activo
    await queryInterface.changeColumn('messages', 'event_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'events',
        key: 'id',
        onDelete: 'CASCADE'
      }
    });
  },

  async down (queryInterface, Sequelize) {
    // Revertir el cambio, hacer event_id obligatorio nuevamente
    await queryInterface.changeColumn('messages', 'event_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id',
        onDelete: 'CASCADE'
      }
    });
  }
};
