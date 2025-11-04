const { users } = require("../db");

const getUsers = async (req, res) => {
  let result = {};
  try {
    const usersData = await users.findAll();
    result = {
      success: true,
      message: "Operacion realizada con exito",
      data: usersData
    }
    return res.json(result);
  } catch (error) {
    result = {
      success: false,
      message: "Error",
      error: error.message
    }
    return res.status(500).json(result);
  }
}

const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await users.findOne({ where: { id } });

    if (user) {
      return res.status(200).json({
        success: true,
        message: "Operación realizada con éxito",
        data: user,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};


const updateUser = async (req, res) => {
  const user = req.body;
  console.log(user);
  let result = {};

  if (!user.id) {
    return res.status(400).json({
      success: false,
      message: "El ID de usuario es requerido"
    });
  }

  try {
    const [updatedRows] = await users.update(user, {
      where: {
        id: user.id
      }
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado o datos sin cambios"
      });
    }

    result = {
      success: true,
      message: "Datos actualizados con éxito",
      data: updatedRows,
    };

    return res.json(result);
  } catch (error) {
    result = {
      success: false,
      message: "Error al actualizar los datos",
      data: error.message,
    };

    return res.status(500).json(result);
  }
};

const addBalance = async (req, res) => {
  const { id, balance } = req.body;

  try {
    const user = await users.findOne({ where: { id: id } })

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const newBalance = user.initial_balance + balance;

    const response = await users.update(
      { initial_balance: newBalance },
      { where: { id: id } }
    );

    res.status(200).json({ success: true, message: "Saldo actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el Saldo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const withdrawBalance = async (req, res) => {
  const { id, balance } = req.body;

  try {
    const user = await users.findOne({ where: { id: id } })

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const newBalance = user.initial_balance - balance;

    const response = await users.update(
      { initial_balance: newBalance },
      { where: { id: id } }
    );

    res.status(200).json({ success: true, message: "Saldo actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el Saldo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const getTotalAmount = async (req, res) => {
  try {
    // suma el saldo inicial de todos los usuarios con estatus is_active = true
    const totalAmount = await users.sum('initial_balance', { where: { is_active: true } });
    // const totalAmount = await users.sum('initial_balance');
    return res.json({ success: true, total: totalAmount });
  } catch (error) {
    console.error("Error al obtener el monto total:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

const deleteUser = async (req, res) => {
  let result = {}
  const { id } = req.params;

  try {
    const response = await users.update({ is_active: false }, { where: { id } });

    res.status(200).json(result = { success: true, message: "Usuario Deshabilidato con éxito" });

  } catch (error) {
    console.error("Error al actualizar el usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// Obtener estado del chat de un usuario (con caché Redis)
const getUserChatStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // Validar que el ID sea válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario inválido"
      });
    }

    // Intentar obtener del caché Redis primero
    let cachedStatus = null;
    try {
      const { messageCache } = require("../config/redis");
      const cacheKey = `user:chat-status:${id}`;
      const cached = await messageCache.getMessages(cacheKey);
      
      if (cached) {
        console.log(`📦 [CACHE] Estado de chat obtenido del caché para usuario ${id}`);
        return res.status(200).json({
          success: true,
          data: cached,
          cached: true
        });
      }
    } catch (redisError) {
      console.warn("⚠️ Redis no disponible, obteniendo de BD:", redisError.message);
    }

    // Si no está en caché, obtener de la base de datos
    const user = await users.findOne({ 
      where: { id: parseInt(id) },
      attributes: ['id', 'username', 'is_active_chat', 'is_admin']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      is_active_chat: user.is_active_chat,
      is_admin: user.is_admin
    };

    // Guardar en caché Redis (TTL: 3 segundos)
    try {
      const { messageCache } = require("../config/redis");
      const cacheKey = `user:chat-status:${id}`;
      await messageCache.setMessages(cacheKey, userData, 3);
      console.log(`✅ Estado de chat cacheado para usuario ${id}`);
    } catch (redisError) {
      console.warn("⚠️ No se pudo cachear en Redis:", redisError.message);
    }

    return res.status(200).json({
      success: true,
      data: userData,
      cached: false
    });

  } catch (error) {
    console.error("Error al obtener estado del chat:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message
    });
  }
};

// Actualizar estado del chat de un usuario
const updateUserChatStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active_chat } = req.body;

  try {
    // Validar que el ID sea válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "ID de usuario inválido"
      });
    }

    // Validar que is_active_chat sea un boolean
    if (typeof is_active_chat !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "is_active_chat debe ser un valor booleano"
      });
    }

    // Buscar el usuario
    const user = await users.findOne({ where: { id: parseInt(id) } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // Prevenir que se bloquee a administradores
    if (user.is_admin === true && !is_active_chat) {
      return res.status(403).json({
        success: false,
        message: "No se puede bloquear el chat de un administrador"
      });
    }

    // Actualizar el estado del chat
    await users.update(
      { is_active_chat },
      { where: { id: parseInt(id) } }
    );

    // Obtener el usuario actualizado
    const updatedUser = await users.findOne({ where: { id: parseInt(id) } });

    console.log(`✅ Estado de chat actualizado para usuario ${id}: ${is_active_chat ? 'Activo' : 'Bloqueado'}`);

    // Invalidar caché de Redis para este usuario
    try {
      const { messageCache } = require("../config/redis");
      const cacheKey = `user:chat-status:${id}`;
      await messageCache.invalidateMessages([cacheKey]);
      console.log(`🗑️ Caché invalidado para usuario ${id}`);
    } catch (redisError) {
      console.warn("⚠️ No se pudo invalidar caché de Redis:", redisError.message);
    }

    // Emitir evento por Socket.IO para notificar al usuario en tiempo real
    try {
      if (global.io) {
        // Emitir a todas las salas (el usuario podría estar en cualquiera)
        global.io.emit('user:chatStatusChanged', {
          userId: parseInt(id),
          username: user.username,
          is_active_chat: is_active_chat
        });
        console.log(`📢 [SOCKET] Emitiendo cambio de estado de chat para usuario ${id}`);
      }
    } catch (socketError) {
      console.error('❌ Error al emitir evento por socket:', socketError);
      // No fallar la petición si falla el socket
    }

    return res.status(200).json({
      success: true,
      message: `Usuario ${is_active_chat ? 'desbloqueado' : 'bloqueado'} exitosamente`,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        is_active_chat: updatedUser.is_active_chat
      }
    });

  } catch (error) {
    console.error("Error al actualizar estado del chat:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message
    });
  }
};

// FUNCION PARA EXPORTAR LOS USUARIOS DESDE EL BACKEND A UN ARCHIVO EXCEL
const exportUsersToExcel = async (req, res) => {
  try {
    const usersData = await users.findAll();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Balance', key: 'initial_balance', width: 15 },
      { header: 'Status', key: 'is_active', width: 15 },
    ];

    usersData.forEach(user => {
      worksheet.addRow({ id: user.id, username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, initial_balance: user.initial_balance, is_active: user.is_active });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Error al exportar los usuarios:', error);
    res.status(500).send('Error al exportar los usuarios');
  }
}




module.exports = { getUsers, updateUser, addBalance, withdrawBalance, deleteUser, getUserById, getTotalAmount, exportUsersToExcel, updateUserChatStatus, getUserChatStatus };

