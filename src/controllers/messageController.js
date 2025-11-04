const { messages, users, events } = require("../db");
const { messageCache } = require("../config/redis");

// Crear un nuevo mensaje
const createMessage = async (req, res) => {
  try {
    const { content, event_id, user_id, message_type } = req.body;
    const imageFile = req.file;

    // Validar user_id
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id es requerido'
      });
    }

    // Determinar el tipo de mensaje
    let finalMessageType = message_type || 'text';
    let sanitizedContent = null;
    let imageUrl = null;
    let imageName = null;

    // Si hay un archivo de imagen
    if (imageFile) {
      finalMessageType = 'image';
      imageUrl = `/uploads/chat-images/${imageFile.filename}`;
      imageName = imageFile.originalname;
      // El contenido es opcional para mensajes con imagen
      sanitizedContent = content ? (typeof content === 'string' ? content.trim() : String(content).trim()) : null;
    } else {
      // Para mensajes de texto, el contenido es obligatorio
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Contenido es requerido para mensajes de texto'
        });
      }

      // Validar y sanitizar el contenido
      sanitizedContent = typeof content === 'string' ? content.trim() : String(content).trim();
      
      if (!sanitizedContent || sanitizedContent.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje no puede estar vacío'
        });
      }

      // Validar longitud máxima del contenido (5000 caracteres)
      if (sanitizedContent.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'El contenido del mensaje no puede exceder 5000 caracteres'
        });
      }
    }

    // Validar que el usuario exista
    const user = await users.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'El usuario especificado no existe'
      });
    }

    // Validar que el usuario esté activo
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'El usuario está inactivo y no puede enviar mensajes'
      });
    }

    // Validar que el evento exista (si se proporciona event_id)
    if (event_id) {
      const event = await events.findByPk(event_id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'El evento especificado no existe'
        });
      }
    }

    // Crear el mensaje
    const message = await messages.create({
      content: sanitizedContent,
      image_url: imageUrl,
      image_name: imageName,
      message_type: finalMessageType,
      event_id: event_id || null, // Permitir null si no hay evento
      user_id
    });

    // Incluir información del usuario
    const messageWithUser = await messages.findByPk(message.id, {
      include: [{
        model: users,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name']
      }]
    });

    // Verificar que el usuario se cargó correctamente
    if (!messageWithUser) {
      return res.status(500).json({
        success: false,
        message: 'Error al recuperar el mensaje creado'
      });
    }

    // Obtener el usuario asociado (puede estar en diferentes propiedades según Sequelize)
    const associatedUser = messageWithUser.user || messageWithUser.users || 
                          (messageWithUser.dataValues && messageWithUser.dataValues.user) ||
                          null;

    // Si no se encontró el usuario en la asociación, obtenerlo directamente
    let userData = associatedUser;
    if (!userData) {
      console.warn(`⚠️ Usuario no encontrado en asociación para user_id ${user_id}, obteniéndolo directamente`);
      userData = await users.findByPk(user_id, {
        attributes: ['id', 'username', 'email', 'first_name', 'last_name']
      });
    }

    // Formatear username
    const username = userData?.username || 
                     userData?.email || 
                     (userData?.first_name && userData?.last_name 
                       ? `${userData.first_name} ${userData.last_name}` 
                       : "Usuario");

    console.log(`👤 Usuario del mensaje - user_id: ${user_id}, username: ${username}, datos:`, userData);

    // Emitir mensaje por socket.io en tiempo real al servidor de chat
    // Usar socket.io-client para conectarse como cliente al servidor de socket
    try {
      const socketIOClient = require("socket.io-client");
      const chatSocketUrl = process.env.CHAT_SOCKET_URL || "http://localhost:3001";
      
      const room = event_id ? String(event_id) : "general";
      
      // Formatear mensaje para socket (incluir ID para indicar que ya está guardado)
      const socketMessageData = {
        id: messageWithUser.id, // Incluir ID para que el servidor de socket solo lo emita sin guardarlo
        username: username, // Usar el username obtenido correctamente
        message: messageWithUser.content,
        message_type: messageWithUser.message_type,
        image_url: messageWithUser.image_url,
        image_name: messageWithUser.image_name,
        user_id: messageWithUser.user_id,
        event_id: messageWithUser.event_id,
        timestamp: messageWithUser.createdAt.getTime(),
        createdAt: messageWithUser.createdAt
      };

      console.log(`📤 Enviando mensaje por socket - username: ${username}, user_id: ${user_id}, room: ${room}`);

      // Crear conexión temporal para emitir el mensaje
      const chatSocket = socketIOClient(chatSocketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: false
      });

      chatSocket.on("connect", () => {
        // Emitir el mensaje en el formato que espera el servidor de socket
        // El servidor detectará que tiene ID y solo lo emitirá sin guardarlo
        chatSocket.emit("message", room, socketMessageData);
        console.log(`✅ Mensaje emitido por socket a la sala ${room} desde API REST`);
        
        // Desconectar después de emitir
        setTimeout(() => {
          chatSocket.disconnect();
        }, 500);
      });

      chatSocket.on("connect_error", (error) => {
        console.warn("⚠️ No se pudo conectar al servidor de socket para emitir mensaje:", error.message);
        chatSocket.disconnect();
      });

      // Timeout de seguridad para desconectar si no se conecta en 2 segundos
      setTimeout(() => {
        if (chatSocket.connected) {
          chatSocket.disconnect();
        }
      }, 2000);
    } catch (error) {
      console.error("❌ Error al emitir mensaje por socket:", error.message);
    }

    // Invalidar caché de mensajes después de crear uno nuevo
    if (event_id) {
      // Invalidar caché del evento específico
      await messageCache.invalidateEvent(event_id);
      console.log(`🔄 Caché invalidado para evento ${event_id}`);
    } else {
      // Invalidar caché de mensajes generales
      await messageCache.invalidateGeneral();
      console.log('🔄 Caché invalidado para mensajes generales');
    }

    // Asegurar que la respuesta incluya el usuario correcto
    const responseData = {
      ...messageWithUser.toJSON(),
      user: userData ? {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name
      } : null
    };

    res.status(201).json({
      success: true,
      message: 'Mensaje creado exitosamente',
      data: responseData
    });

  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener mensajes (con caché Redis)
const getMessages = async (req, res) => {
  try {
    const { event_id, limit = 50, offset = 0 } = req.query;

    // Validar límites
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100); // Entre 1 y 100
    const offsetNum = Math.max(parseInt(offset) || 0, 0); // Mínimo 0

    // Construir key del caché
    const cacheKey = event_id 
      ? `messages:event:${event_id}:limit:${limitNum}:offset:${offsetNum}`
      : `messages:general:limit:${limitNum}:offset:${offsetNum}`;

    // Intentar obtener del caché
    const cachedData = await messageCache.getMessages(cacheKey);
    if (cachedData) {
      console.log(`📦 [CACHE] Mensajes obtenidos del caché: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        message: 'Mensajes obtenidos exitosamente (caché)',
        data: cachedData,
        cached: true
      });
    }

    // Si no está en caché, obtener de la BD
    console.log(`🗄️ [DB] Mensajes obtenidos de la base de datos: ${cacheKey}`);
    
    // Construir filtros
    const where = {};
    if (event_id) {
      where.event_id = event_id;
    }

    // Obtener mensajes
    const messagesList = await messages.findAll({
      where,
      include: [{
        model: users,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active_chat']
      }],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum
    });

    // Guardar en caché (TTL: 5 segundos)
    await messageCache.setMessages(cacheKey, messagesList, 5);

    res.status(200).json({
      success: true,
      message: 'Mensajes obtenidos exitosamente',
      data: messagesList,
      cached: false
    });

  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener mensajes por evento (con caché Redis)
const getMessagesByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Validar que el eventoId sea un número válido
    const eventIdNum = parseInt(eventId);
    if (isNaN(eventIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del evento debe ser un número válido'
      });
    }

    // Validar límites
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    // Construir key del caché
    const cacheKey = `messages:event:${eventIdNum}:limit:${limitNum}:offset:${offsetNum}`;

    // Intentar obtener del caché
    const cachedData = await messageCache.getMessages(cacheKey);
    if (cachedData) {
      console.log(`📦 [CACHE] Mensajes del evento obtenidos del caché: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        message: 'Mensajes del evento obtenidos exitosamente (caché)',
        data: cachedData,
        cached: true
      });
    }

    // Si no está en caché, obtener de la BD
    console.log(`🗄️ [DB] Mensajes del evento obtenidos de la base de datos: ${cacheKey}`);

    const messagesList = await messages.findAll({
      where: { event_id: eventIdNum },
      include: [{
        model: users,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active_chat']
      }],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum
    });

    // Guardar en caché (TTL: 5 segundos)
    await messageCache.setMessages(cacheKey, messagesList, 5);

    res.status(200).json({
      success: true,
      message: 'Mensajes del evento obtenidos exitosamente',
      data: messagesList,
      cached: false
    });

  } catch (error) {
    console.error('Error al obtener mensajes del evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener mensajes generales (sin evento) (con caché Redis)
const getGeneralMessages = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Validar límites
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    // Construir key del caché
    const cacheKey = `messages:general:limit:${limitNum}:offset:${offsetNum}`;

    // Intentar obtener del caché
    const cachedData = await messageCache.getMessages(cacheKey);
    if (cachedData) {
      console.log(`📦 [CACHE] Mensajes generales obtenidos del caché: ${cacheKey}`);
      return res.status(200).json({
        success: true,
        message: 'Mensajes generales obtenidos exitosamente (caché)',
        data: cachedData,
        cached: true
      });
    }

    // Si no está en caché, obtener de la BD
    console.log(`🗄️ [DB] Mensajes generales obtenidos de la base de datos: ${cacheKey}`);

    const messagesList = await messages.findAll({
      where: { event_id: null },
      include: [{
        model: users,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_active_chat']
      }],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum
    });

    // Guardar en caché (TTL: 5 segundos)
    await messageCache.setMessages(cacheKey, messagesList, 5);

    res.status(200).json({
      success: true,
      message: 'Mensajes generales obtenidos exitosamente',
      data: messagesList,
      cached: false
    });

  } catch (error) {
    console.error('Error al obtener mensajes generales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar un mensaje por ID
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Validar que el messageId sea un número válido
    const messageIdNum = parseInt(messageId);
    if (isNaN(messageIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del mensaje debe ser un número válido'
      });
    }

    // Buscar el mensaje para verificar que existe
    const message = await messages.findByPk(messageIdNum);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'El mensaje especificado no existe'
      });
    }

    // Guardar event_id antes de eliminar para invalidar caché
    const eventId = message.event_id;

    // Eliminar el mensaje
    await message.destroy();

    // Invalidar caché de mensajes después de eliminar
    if (eventId) {
      // Invalidar caché del evento específico
      await messageCache.invalidateEvent(eventId);
      console.log(`🔄 Caché invalidado para evento ${eventId}`);
    } else {
      // Invalidar caché de mensajes generales
      await messageCache.invalidateGeneral();
      console.log('🔄 Caché invalidado para mensajes generales');
    }

    // Emitir evento por socket para notificar eliminación en tiempo real
    try {
      const socketIOClient = require("socket.io-client");
      const chatSocketUrl = process.env.CHAT_SOCKET_URL || "http://localhost:3001";
      
      const room = eventId ? String(eventId) : "general";
      
      // Crear conexión temporal para emitir el evento de eliminación
      const chatSocket = socketIOClient(chatSocketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: false
      });

      chatSocket.on("connect", () => {
        // Emitir evento de eliminación de mensaje
        chatSocket.emit("messageDeleted", room, { messageId: messageIdNum });
        console.log(`✅ Evento de eliminación emitido por socket para mensaje ${messageIdNum} en sala ${room}`);
        
        // Desconectar después de emitir
        setTimeout(() => {
          chatSocket.disconnect();
        }, 500);
      });

      chatSocket.on("connect_error", (error) => {
        console.warn("⚠️ No se pudo conectar al servidor de socket para emitir evento de eliminación:", error.message);
        chatSocket.disconnect();
      });

      // Timeout de seguridad
      setTimeout(() => {
        if (chatSocket.connected) {
          chatSocket.disconnect();
        }
      }, 2000);
    } catch (error) {
      console.error("❌ Error al emitir evento de eliminación por socket:", error.message);
    }

    res.status(200).json({
      success: true,
      message: 'Mensaje eliminado exitosamente',
      data: { id: messageIdNum }
    });

  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar múltiples mensajes por IDs
const deleteMultipleMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;

    // Validar que messageIds sea un array
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messageIds debe ser un array no vacío'
      });
    }

    // Validar que todos los IDs sean números válidos
    const validIds = messageIds.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron IDs válidos'
      });
    }

    // Buscar los mensajes para verificar que existen y obtener sus event_ids
    const messagesToDelete = await messages.findAll({
      where: {
        id: validIds
      }
    });

    if (messagesToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron mensajes con los IDs proporcionados'
      });
    }

    // Obtener los event_ids únicos para invalidar caché
    const eventIds = new Set();
    let hasGeneralMessages = false;
    
    messagesToDelete.forEach(msg => {
      if (msg.event_id) {
        eventIds.add(msg.event_id);
      } else {
        hasGeneralMessages = true;
      }
    });

    // Eliminar los mensajes
    const deletedCount = await messages.destroy({
      where: {
        id: validIds
      }
    });

    // Invalidar caché para cada evento único
    for (const eventId of eventIds) {
      await messageCache.invalidateEvent(eventId);
      console.log(`🔄 Caché invalidado para evento ${eventId}`);
    }

    // Invalidar caché de mensajes generales si hay alguno
    if (hasGeneralMessages) {
      await messageCache.invalidateGeneral();
      console.log('🔄 Caché invalidado para mensajes generales');
    }

    // Emitir eventos por socket para notificar eliminaciones en tiempo real
    try {
      const socketIOClient = require("socket.io-client");
      const chatSocketUrl = process.env.CHAT_SOCKET_URL || "http://localhost:3001";
      
      // Agrupar mensajes por sala
      const messagesByRoom = {};
      messagesToDelete.forEach(msg => {
        const room = msg.event_id ? String(msg.event_id) : "general";
        if (!messagesByRoom[room]) {
          messagesByRoom[room] = [];
        }
        messagesByRoom[room].push(msg.id);
      });

      // Emitir eventos para cada sala
      Object.keys(messagesByRoom).forEach(room => {
        const chatSocket = socketIOClient(chatSocketUrl, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: false
        });

        chatSocket.on("connect", () => {
          // Emitir evento de eliminación múltiple
          chatSocket.emit("messagesDeleted", room, { messageIds: messagesByRoom[room] });
          console.log(`✅ Evento de eliminación múltiple emitido por socket para sala ${room}:`, messagesByRoom[room]);
          
          // Desconectar después de emitir
          setTimeout(() => {
            chatSocket.disconnect();
          }, 500);
        });

        chatSocket.on("connect_error", (error) => {
          console.warn("⚠️ No se pudo conectar al servidor de socket:", error.message);
          chatSocket.disconnect();
        });

        // Timeout de seguridad
        setTimeout(() => {
          if (chatSocket.connected) {
            chatSocket.disconnect();
          }
        }, 2000);
      });
    } catch (error) {
      console.error("❌ Error al emitir eventos de eliminación por socket:", error.message);
    }

    res.status(200).json({
      success: true,
      message: `${deletedCount} mensaje(s) eliminado(s) exitosamente`,
      data: { 
        deletedCount,
        deletedIds: messagesToDelete.map(msg => msg.id)
      }
    });

  } catch (error) {
    console.error('Error al eliminar múltiples mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  createMessage,
  getMessages,
  getMessagesByEvent,
  getGeneralMessages,
  deleteMessage,
  deleteMultipleMessages
};
