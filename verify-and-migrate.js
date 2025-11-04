/**
 * Script para verificar y aplicar migraciones de forma segura
 * 
 * Este script verifica si los campos existen en la tabla users
 * y los agrega si no están presentes, sin perder datos existentes.
 */

require("dotenv").config();
const { QueryInterface } = require('sequelize');
const { conn } = require("./src/db.js");

async function verifyAndMigrate() {
  try {
    console.log("🔍 Verificando estructura de la tabla users...\n");

    const queryInterface = conn.getQueryInterface();
    
    // Obtener la descripción actual de la tabla
    const tableDescription = await queryInterface.describeTable('users');
    
    console.log("📋 Campos actuales en la tabla users:");
    console.log(Object.keys(tableDescription).join(", "));
    console.log("\n");

    let changesApplied = false;

    // Verificar campo passwordshow
    if (!tableDescription.passwordshow) {
      console.log("⚠️  Campo 'passwordshow' no encontrado. Agregando...");
      await queryInterface.addColumn('users', 'passwordshow', {
        type: conn.Sequelize.STRING,
        allowNull: true
      });
      console.log("✅ Campo 'passwordshow' agregado exitosamente\n");
      changesApplied = true;
    } else {
      console.log("✅ Campo 'passwordshow' ya existe\n");
    }

    // Verificar campo is_active_chat
    if (!tableDescription.is_active_chat) {
      console.log("⚠️  Campo 'is_active_chat' no encontrado. Agregando...");
      await queryInterface.addColumn('users', 'is_active_chat', {
        type: conn.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      console.log("✅ Campo 'is_active_chat' agregado exitosamente\n");
      changesApplied = true;
    } else {
      console.log("✅ Campo 'is_active_chat' ya existe\n");
    }

    // Verificar campo is_admin (por si acaso)
    if (!tableDescription.is_admin) {
      console.log("⚠️  Campo 'is_admin' no encontrado. Agregando...");
      await queryInterface.addColumn('users', 'is_admin', {
        type: conn.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log("✅ Campo 'is_admin' agregado exitosamente\n");
      changesApplied = true;
    } else {
      console.log("✅ Campo 'is_admin' ya existe\n");
    }

    if (changesApplied) {
      console.log("🎉 Migraciones aplicadas exitosamente. Los datos existentes se conservaron.");
    } else {
      console.log("✨ Todos los campos están presentes. No se requieren cambios.");
    }

    // Mostrar estructura final
    const finalDescription = await queryInterface.describeTable('users');
    console.log("\n📊 Estructura final de la tabla users:");
    console.log("=====================================");
    Object.keys(finalDescription).forEach(field => {
      const info = finalDescription[field];
      console.log(`- ${field}: ${info.type} ${info.allowNull ? '(nullable)' : '(required)'} ${info.defaultValue ? `[default: ${info.defaultValue}]` : ''}`);
    });

    console.log("\n✅ Verificación completada");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error durante la verificación/migración:");
    console.error(error);
    process.exit(1);
  }
}

// Conectar a la base de datos y ejecutar
conn.authenticate()
  .then(() => {
    console.log("✅ Conexión a la base de datos establecida\n");
    return verifyAndMigrate();
  })
  .catch(err => {
    console.error("❌ Error al conectar a la base de datos:", err);
    process.exit(1);
  });

