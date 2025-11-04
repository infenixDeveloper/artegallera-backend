'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'content'
    });

    await queryInterface.addColumn('messages', 'image_name', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'image_url'
    });

    await queryInterface.addColumn('messages', 'message_type', {
      type: Sequelize.ENUM('text', 'image'),
      allowNull: false,
      defaultValue: 'text',
      after: 'image_name'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'image_url');
    await queryInterface.removeColumn('messages', 'image_name');
    await queryInterface.removeColumn('messages', 'message_type');
  }
};

