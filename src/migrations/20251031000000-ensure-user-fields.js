'use strict';

/** 
 * Migración segura para asegurar campos en la tabla users
 * Esta migración verifica si los campos existen antes de agregarlos
 * para evitar errores y pérdida de datos
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('users');

    // Agregar passwordshow si no existe
    if (!tableDescription.passwordshow) {
      console.log('📝 Agregando campo passwordshow...');
      await queryInterface.addColumn('users', 'passwordshow', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Campo passwordshow agregado');
    } else {
      console.log('✓ Campo passwordshow ya existe');
    }

    // Agregar is_active_chat si no existe
    if (!tableDescription.is_active_chat) {
      console.log('📝 Agregando campo is_active_chat...');
      await queryInterface.addColumn('users', 'is_active_chat', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      console.log('✅ Campo is_active_chat agregado');
    } else {
      console.log('✓ Campo is_active_chat ya existe');
    }

    // Verificar is_admin (por seguridad)
    if (!tableDescription.is_admin) {
      console.log('📝 Agregando campo is_admin...');
      await queryInterface.addColumn('users', 'is_admin', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('✅ Campo is_admin agregado');
    } else {
      console.log('✓ Campo is_admin ya existe');
    }
  },

  async down(queryInterface, Sequelize) {
    // Solo eliminar si existen (down seguro)
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.passwordshow) {
      await queryInterface.removeColumn('users', 'passwordshow');
    }

    if (tableDescription.is_active_chat) {
      await queryInterface.removeColumn('users', 'is_active_chat');
    }

    if (tableDescription.is_admin) {
      await queryInterface.removeColumn('users', 'is_admin');
    }
  }
};

