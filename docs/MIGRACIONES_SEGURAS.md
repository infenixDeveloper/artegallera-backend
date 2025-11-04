# 🔒 Guía de Migraciones Seguras

## 📋 Tabla de Contenidos
- [Problema Resuelto](#problema-resuelto)
- [Scripts Disponibles](#scripts-disponibles)
- [Uso Recomendado](#uso-recomendado)
- [Verificación de Campos](#verificación-de-campos)
- [Solución de Problemas](#solución-de-problemas)

---

## ❗ Problema Resuelto

Al actualizar el código o ejecutar migraciones, los campos `passwordshow` e `is_active_chat` se estaban perdiendo de la base de datos, causando errores y pérdida de datos.

### Campos Críticos:
- `passwordshow` (STRING, nullable)
- `is_active_chat` (BOOLEAN, default: true)
- `is_admin` (BOOLEAN, default: false)

---

## 🛠️ Scripts Disponibles

### 1. Verificar y Migrar (Recomendado)
```bash
npm run verify-db
```

**¿Qué hace?**
- ✅ Verifica si los campos existen en la tabla `users`
- ✅ Agrega campos faltantes SIN eliminar datos existentes
- ✅ Muestra la estructura completa de la tabla
- ✅ Es **100% seguro** - no borra nada

**Cuándo usarlo:**
- Después de actualizar el código del repositorio
- Si encuentras errores relacionados con campos faltantes
- Como verificación de rutina antes de desplegar

---

### 2. Ejecutar Migraciones Oficiales
```bash
npm run migrate
```

**¿Qué hace?**
- Ejecuta todas las migraciones pendientes de Sequelize
- Registra en la tabla `SequelizeMeta` qué migraciones se han ejecutado

**Cuándo usarlo:**
- En un nuevo entorno de desarrollo
- Después de crear nuevas migraciones
- Cuando el equipo crea nuevas tablas o campos

---

### 3. Ver Estado de Migraciones
```bash
npm run migrate:status
```

**¿Qué hace?**
- Muestra qué migraciones están aplicadas
- Muestra qué migraciones están pendientes

**Salida ejemplo:**
```
up   20241103025641-create-users.js
up   20251031000000-ensure-user-fields.js
down 20251101000000-add-new-feature.js
```

---

### 4. Revertir Última Migración
```bash
npm run migrate:undo
```

**⚠️ CUIDADO:** Solo úsalo si sabes lo que haces. Puede eliminar datos.

---

## 🎯 Uso Recomendado

### Escenario 1: Actualización de Código desde Git

```bash
# 1. Actualizar código
git pull origin main

# 2. Instalar dependencias (si hay cambios)
npm install

# 3. Verificar base de datos (IMPORTANTE)
npm run verify-db

# 4. Iniciar servidor
npm start
```

---

### Escenario 2: Nuevo Desarrollador en el Equipo

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd artegallera-backend

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar todas las migraciones
npm run migrate

# 5. Verificar que todo esté correcto
npm run verify-db

# 6. Iniciar servidor
npm start
```

---

### Escenario 3: Error de "Campo no existe"

Si ves errores como:
```
column "passwordshow" does not exist
column "is_active_chat" does not exist
```

**Solución rápida:**
```bash
npm run verify-db
```

Este comando agregará los campos faltantes automáticamente.

---

## 🔍 Verificación de Campos

### ¿Cómo verificar manualmente?

**Opción 1: Usar el script**
```bash
npm run verify-db
```

**Opción 2: SQL directo (PostgreSQL)**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**Opción 3: Desde psql**
```bash
psql -U postgres -d artegallera
\d users
```

---

## 📊 Estructura Esperada de la Tabla Users

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | INTEGER | NO | autoincrement |
| username | VARCHAR | NO | - |
| password | VARCHAR | NO | - |
| email | VARCHAR | NO | - |
| first_name | VARCHAR | NO | - |
| last_name | VARCHAR | NO | - |
| is_active | BOOLEAN | NO | true |
| is_admin | BOOLEAN | NO | false |
| initial_balance | INTEGER | NO | 0 |
| image | TEXT | YES | NULL |
| **passwordshow** | VARCHAR | YES | NULL |
| **is_active_chat** | BOOLEAN | NO | true |
| createdAt | TIMESTAMP | NO | NOW() |
| updatedAt | TIMESTAMP | NO | NOW() |

---

## 🐛 Solución de Problemas

### Problema 1: "Migration already executed"

**Causa:** La migración ya se ejecutó anteriormente.

**Solución:**
```bash
# Usar el script de verificación en su lugar
npm run verify-db
```

---

### Problema 2: Los campos se siguen borrando

**Causa posible:** Hay un `sync({ force: true })` en el código.

**Verificar:**
```bash
# Buscar en el código
grep -r "sync.*force.*true" .
```

**Solución:** Cambiar a `sync({ force: false })` o usar solo migraciones.

---

### Problema 3: Error de conexión a la base de datos

**Verificar .env:**
```env
DB_USER=postgres
DB_PASSWORD=tu_password
DB_DATABASE=artegallera
DB_HOST=localhost
DB_PORT=5432
```

**Probar conexión:**
```bash
psql -U postgres -d artegallera -c "SELECT 1;"
```

---

### Problema 4: Migraciones no se registran

**Verificar tabla SequelizeMeta:**
```sql
SELECT * FROM "SequelizeMeta";
```

Si no existe, crearla:
```bash
npm run migrate
```

---

## 📝 Crear Nuevas Migraciones

### Template para migración segura:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('nombre_tabla');

    // Verificar si el campo existe antes de agregarlo
    if (!tableDescription.nuevo_campo) {
      await queryInterface.addColumn('nombre_tabla', 'nuevo_campo', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('nombre_tabla');
    
    if (tableDescription.nuevo_campo) {
      await queryInterface.removeColumn('nombre_tabla', 'nuevo_campo');
    }
  }
};
```

---

## ✅ Checklist de Mantenimiento

Ejecutar periódicamente:

- [ ] `npm run migrate:status` - Ver estado de migraciones
- [ ] `npm run verify-db` - Verificar estructura de BD
- [ ] Backup de base de datos antes de cambios importantes
- [ ] Probar en desarrollo antes de producción

---

## 📞 Soporte

Si encuentras problemas no documentados aquí:

1. Ejecuta `npm run verify-db` y guarda la salida
2. Verifica los logs del servidor
3. Consulta con el equipo de desarrollo

---

## 🔐 Seguridad

**Recordatorios importantes:**

- ✅ `npm run verify-db` es **100% seguro** - no borra datos
- ⚠️ `npm run migrate:undo` puede **borrar datos**
- ⚠️ NUNCA uses `sync({ force: true })` en producción
- ✅ Siempre haz backup antes de modificar estructura de BD

---

## 📅 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 31/10/2025 | 1.0 | Creación del sistema de migraciones seguras |
| 31/10/2025 | 1.1 | Agregado script verify-db |
| 31/10/2025 | 1.2 | Migración consolidada ensure-user-fields |

---

## 🎉 ¡Listo!

Ahora tienes todas las herramientas para mantener tu base de datos actualizada sin perder datos. 🚀

