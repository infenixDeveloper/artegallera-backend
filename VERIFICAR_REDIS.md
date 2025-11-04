# Verificación y Solución de Problemas de Redis

## Estado Actual

El código del backend ya está configurado para usar Redis como caché de mensajes. Sin embargo, Redis debe estar instalado y ejecutándose en el sistema.

## Verificar si Redis está instalado y ejecutándose

### Opción 1: Verificar en Windows

1. Abrir **Símbolo del sistema** (no PowerShell) como administrador
2. Ejecutar:
```cmd
redis-cli ping
```

Si Redis está ejecutándose, debería responder `PONG`.

### Opción 2: Verificar proceso en ejecución

1. Abrir **Administrador de tareas** (Ctrl + Shift + Esc)
2. Buscar proceso `redis-server.exe`

## ¿Qué pasa si Redis NO está instalado?

**¡No te preocupes!** El backend está configurado para funcionar con o sin Redis:

- **Con Redis:** Las consultas de mensajes se almacenan en caché por 5 segundos, mejorando el rendimiento
- **Sin Redis:** El backend funciona normalmente obteniendo los mensajes directamente de la base de datos PostgreSQL

Los logs del backend te indicarán el estado:
```
✅ Redis conectado correctamente
✅ Redis listo para usar
```

O si no está disponible:
```
❌ Error al conectar con Redis
⚠️ La aplicación continuará sin caché Redis
```

## Instalar Redis en Windows (Opcional)

### Opción 1: Usando Memurai (Recomendado para Windows)

1. Descargar Memurai desde: https://www.memurai.com/
2. Instalar siguiendo las instrucciones
3. Verificar que el servicio esté ejecutándose

### Opción 2: Usando WSL (Windows Subsystem for Linux)

1. Instalar WSL2
2. Dentro de WSL:
```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Opción 3: Usando Docker

```bash
docker run -d -p 6379:6379 redis:latest
```

## Verificar que el Backend está funcionando correctamente

### Logs a observar en la consola del backend:

#### Carga de mensajes CON caché Redis:
```
✅ [CACHE] Mensajes del evento obtenidos del caché: messages:event:1:limit:100:offset:0
```

#### Carga de mensajes SIN caché (desde DB):
```
🗄️ [DB] Mensajes del evento obtenidos de la base de datos: messages:event:1:limit:100:offset:0
```

### Logs a observar en la consola del ADMIN/LANDING:

```
📥 [ADMIN] loadMessagesFromAPI llamado con eventId: 1 isInitialLoad: true
🌐 [ADMIN] Realizando petición API...
📡 [ADMIN] GET /messages/event/1
✅ [ADMIN] Respuesta de la API: {success: true, messageCount: 15, cached: true}
📝 [ADMIN] 15 mensajes formateados
🔄 [ADMIN] Carga inicial - reemplazando todos los mensajes
```

Y cada 3 segundos:
```
🔄 [ADMIN] Iniciando sincronización automática cada 3 segundos para eventId: 1
```

## Configuración de Variables de Entorno (si usas Redis)

Editar `.env` en el backend:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Resumen

1. **Redis es opcional** - el backend funciona sin él
2. **Redis mejora el rendimiento** - reduce la carga a la base de datos
3. **Los logs te dirán** - si Redis está funcionando o no
4. **La sincronización de 3 segundos** - funciona con o sin Redis, obtiene mensajes de la API

## Problema Resuelto

Los cambios realizados aseguran que:

✅ El historial de mensajes se carga según el evento activo  
✅ La sincronización automática funciona cada 3 segundos  
✅ Redis se usa automáticamente si está disponible  
✅ El backend funciona normalmente sin Redis  
✅ Los logs detallados ayudan a identificar problemas

