# Configuración de Redis para ArteGallera

## ¿Por qué Redis?

Redis se ha implementado para mejorar el rendimiento del sistema de chat en tiempo real:

- **Caché de mensajes**: Reduce la carga en la base de datos PostgreSQL
- **Menor latencia**: Respuestas más rápidas en las peticiones de historial de chat
- **Escalabilidad**: Soporta múltiples usuarios simultáneos sin degradar el rendimiento
- **TTL inteligente**: Los mensajes se cachean por 5 segundos, perfecto para el polling de 3 segundos

## Instalación de Redis

### Windows (Laragon)

1. **Descargar Redis para Windows**:
   - Descargar desde: https://github.com/tporadowski/redis/releases
   - Última versión recomendada: Redis-x64-5.0.14.1.msi

2. **Instalar Redis**:
   - Ejecutar el instalador `.msi`
   - Marcar la opción "Add Redis to PATH"
   - Dejar el puerto por defecto: 6379

3. **Verificar instalación**:
   ```bash
   redis-cli --version
   ```

4. **Iniciar Redis**:
   ```bash
   redis-server
   ```
   - Redis quedará ejecutándose en `localhost:6379`

### Linux/Ubuntu

```bash
# Actualizar repositorios
sudo apt update

# Instalar Redis
sudo apt install redis-server -y

# Iniciar el servicio
sudo systemctl start redis-server

# Habilitar Redis para que inicie automáticamente
sudo systemctl enable redis-server

# Verificar estado
sudo systemctl status redis-server
```

### macOS

```bash
# Instalar con Homebrew
brew install redis

# Iniciar Redis
brew services start redis

# Verificar instalación
redis-cli ping
# Debe responder: PONG
```

## Configuración en ArteGallera Backend

### Variables de entorno (opcional)

Añadir al archivo `.env` del backend:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Nota**: Si Redis está en localhost sin contraseña (desarrollo), no es necesario configurar estas variables.

## Verificar que Redis está funcionando

1. **Abrir redis-cli**:
   ```bash
   redis-cli
   ```

2. **Probar conexión**:
   ```bash
   127.0.0.1:6379> ping
   PONG
   ```

3. **Ver keys del caché de mensajes**:
   ```bash
   127.0.0.1:6379> keys messages:*
   ```

4. **Ver contenido de una key**:
   ```bash
   127.0.0.1:6379> get "messages:general:limit:100:offset:0"
   ```

5. **Monitorear en tiempo real**:
   ```bash
   127.0.0.1:6379> monitor
   ```
   - Esto mostrará todos los comandos que se ejecutan en Redis

## Instalar dependencias del backend

```bash
cd artegallera-backend
pnpm install
```

Esto instalará automáticamente la dependencia `redis: ^4.7.0`.

## Funcionamiento del caché

### Estrategia de caché

1. **Obtención de mensajes**:
   - Primera petición → Base de datos PostgreSQL
   - Se guarda en Redis con TTL de 5 segundos
   - Siguientes peticiones (dentro de 5 segundos) → Redis (mucho más rápido)

2. **Invalidación del caché**:
   - Al crear un nuevo mensaje → Se invalida el caché relacionado
   - Garantiza que los usuarios vean mensajes actualizados

3. **Keys del caché**:
   - Mensajes de evento: `messages:event:{eventId}:limit:{limit}:offset:{offset}`
   - Mensajes generales: `messages:general:limit:{limit}:offset:{offset}`

### Logs de caché

En la consola del backend verás:

- `✅ Cache HIT` - Mensaje obtenido del caché (rápido)
- `❌ Cache MISS` - No estaba en caché, se obtiene de BD
- `🔄 Caché invalidado` - Se eliminó el caché por nuevo mensaje
- `📦 [CACHE]` - Respuesta desde Redis
- `🗄️ [DB]` - Respuesta desde PostgreSQL

## Comandos útiles de Redis

### Limpiar todo el caché

```bash
redis-cli FLUSHALL
```

### Ver estadísticas

```bash
redis-cli INFO stats
```

### Ver memoria usada

```bash
redis-cli INFO memory
```

### Detener Redis (Windows)

```bash
redis-cli shutdown
```

### Detener Redis (Linux/macOS)

```bash
sudo systemctl stop redis-server  # Linux
brew services stop redis          # macOS
```

## Troubleshooting

### Error: "ECONNREFUSED" al conectar

**Problema**: Redis no está ejecutándose.

**Solución**:
```bash
# Windows
redis-server

# Linux
sudo systemctl start redis-server

# macOS
brew services start redis
```

### La aplicación funciona sin Redis

**Comportamiento esperado**: Si Redis no está disponible, la aplicación continuará funcionando normalmente, pero sin caché. Verás warnings en la consola:

```
⚠️ Redis no está conectado, saltando caché
```

### Verificar si Redis está escuchando

```bash
# Windows/Linux/macOS
netstat -an | grep 6379
```

Deberías ver:
```
TCP    127.0.0.1:6379    0.0.0.0:0    LISTENING
```

## Monitoreo y rendimiento

### Ver rendimiento del caché

Después de usar el chat por un tiempo, ejecuta:

```bash
redis-cli INFO stats
```

Busca:
- `keyspace_hits` - Número de veces que se encontró el dato en caché
- `keyspace_misses` - Número de veces que NO se encontró en caché

**Hit rate** = keyspace_hits / (keyspace_hits + keyspace_misses) × 100%

Un hit rate > 80% es excelente para este caso de uso.

## Beneficios observables

### Antes (sin Redis)
- Cada sincronización (cada 3 segundos) consulta PostgreSQL
- ~50-100ms por consulta
- Carga constante en la base de datos

### Después (con Redis)
- Primera consulta: PostgreSQL (~50-100ms)
- Siguientes consultas (5 segundos): Redis (~1-5ms)
- **90-95% reducción en latencia**
- **90% reducción en carga de base de datos**

## Producción

Para producción, considera:

1. **Redis con contraseña**:
   ```bash
   redis-cli CONFIG SET requirepass "tu_password_segura"
   ```

2. **Redis en servidor dedicado**:
   - Actualizar `REDIS_HOST` en `.env`
   - Configurar firewall para permitir puerto 6379

3. **Persistencia**:
   - Redis por defecto guarda snapshots en disco
   - Para chat en vivo, esto es opcional

4. **Redis Cluster** (opcional para alta disponibilidad):
   - Solo necesario si tienes miles de usuarios simultáneos

