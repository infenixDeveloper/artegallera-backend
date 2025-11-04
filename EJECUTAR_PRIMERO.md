# ⚡ EJECUTAR PRIMERO - Solución Rápida

## 🚨 Si tienes errores de campos faltantes

### Ejecuta este comando:

```bash
cd artegallera-backend
npm run verify-db
```

## ✅ Eso es todo

El script:
- ✅ Verifica si existen `passwordshow`, `is_active_chat` e `is_admin`
- ✅ Los agrega si faltan (SIN borrar datos existentes)
- ✅ Muestra el resultado de la verificación
- ✅ Es 100% seguro

## 📋 Salida esperada:

```
🔍 Verificando estructura de la tabla users...

✅ Campo 'passwordshow' ya existe
✅ Campo 'is_active_chat' ya existe  
✅ Campo 'is_admin' ya existe

✨ Todos los campos están presentes. No se requieren cambios.

📊 Estructura final de la tabla users:
=====================================
- id: INTEGER (required)
- username: VARCHAR(255) (required)
- password: VARCHAR(255) (required)
- email: VARCHAR(255) (required)
- passwordshow: VARCHAR(255) (nullable)
- is_active_chat: BOOLEAN (required) [default: true]
- is_admin: BOOLEAN (required) [default: false]
...

✅ Verificación completada
```

## 🔧 Si necesitas más información

Lee el archivo: `MIGRACIONES_SEGURAS.md`

## 🎯 En resumen

**Antes de iniciar el servidor, ejecuta:**
```bash
npm run verify-db
```

**Luego inicia normalmente:**
```bash
npm start
```

¡Listo! 🚀

