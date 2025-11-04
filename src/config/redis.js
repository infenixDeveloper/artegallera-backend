const redis = require('redis');

// Crear cliente de Redis
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Configuración opcional para desarrollo local sin contraseña
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Demasiados intentos de reconexión');
        return new Error('Demasiados intentos de reconexión a Redis');
      }
      // Reintentar cada 500ms
      return Math.min(retries * 50, 500);
    }
  }
});

// Manejar errores de conexión
redisClient.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis conectado correctamente');
});

redisClient.on('ready', () => {
  console.log('✅ Redis listo para usar');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconectando...');
});

// Conectar al iniciar
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Error al conectar con Redis:', error);
    console.warn('⚠️ La aplicación continuará sin caché Redis');
  }
})();

// Funciones helper para el caché de mensajes
const messageCache = {
  // Obtener mensajes del caché
  getMessages: async (key) => {
    try {
      if (!redisClient.isOpen) {
        console.warn('⚠️ Redis no está conectado, saltando caché');
        return null;
      }
      const data = await redisClient.get(key);
      if (data) {
        console.log(`✅ Cache HIT para key: ${key}`);
        return JSON.parse(data);
      }
      console.log(`❌ Cache MISS para key: ${key}`);
      return null;
    } catch (error) {
      console.error('❌ Error al obtener del caché:', error);
      return null;
    }
  },

  // Guardar mensajes en el caché (con TTL de 5 segundos)
  setMessages: async (key, data, ttl = 5) => {
    try {
      if (!redisClient.isOpen) {
        console.warn('⚠️ Redis no está conectado, saltando caché');
        return false;
      }
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      console.log(`✅ Cache SET para key: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('❌ Error al guardar en caché:', error);
      return false;
    }
  },

  // Invalidar caché de mensajes
  invalidateMessages: async (patterns = []) => {
    try {
      if (!redisClient.isOpen) {
        console.warn('⚠️ Redis no está conectado, saltando invalidación');
        return false;
      }

      // Si no hay patrones específicos, invalidar todos los mensajes
      if (patterns.length === 0) {
        patterns = ['messages:*'];
      }

      let deletedCount = 0;
      for (const pattern of patterns) {
        // Buscar todas las keys que coincidan con el patrón
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(keys);
          deletedCount += keys.length;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`✅ Cache INVALIDADO: ${deletedCount} key(s) eliminadas`);
      }
      return true;
    } catch (error) {
      console.error('❌ Error al invalidar caché:', error);
      return false;
    }
  },

  // Invalidar caché de un evento específico
  invalidateEvent: async (eventId) => {
    try {
      const patterns = [
        `messages:event:${eventId}:*`,
        'messages:general:*'
      ];
      return await messageCache.invalidateMessages(patterns);
    } catch (error) {
      console.error('❌ Error al invalidar caché del evento:', error);
      return false;
    }
  },

  // Invalidar caché de mensajes generales
  invalidateGeneral: async () => {
    try {
      const patterns = ['messages:general:*'];
      return await messageCache.invalidateMessages(patterns);
    } catch (error) {
      console.error('❌ Error al invalidar caché general:', error);
      return false;
    }
  }
};

// Cerrar conexión cuando el proceso termina
process.on('SIGINT', async () => {
  console.log('🔌 Cerrando conexión de Redis...');
  try {
    await redisClient.quit();
    console.log('✅ Redis desconectado correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar Redis:', error);
  }
  process.exit(0);
});

module.exports = {
  redisClient,
  messageCache
};

