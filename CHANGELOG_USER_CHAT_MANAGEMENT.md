# Changelog - Sistema de Gestión de Usuarios en Chat

## Fecha: 2025-10-31

## 🎯 Funcionalidad Implementada

### Sistema de Bloqueo/Desbloqueo de Chat en Tiempo Real

Se ha implementado un sistema completo que permite al administrador bloquear y desbloquear usuarios del chat en tiempo real, con notificación instantánea mediante Socket.IO.

---

## 📝 Cambios Realizados

### Frontend - Chat del Administrador

#### 1. **Nuevo componente: `UserManagementModal.jsx`**
**Ubicación**: `artegallera-admin/src/components/Chat/UserManagementModal.jsx`

**Características:**
- Modal de Material-UI con diseño profesional
- Muestra información del usuario (username, ID, estado actual)
- Botones para bloquear/desbloquear según el estado actual
- Feedback visual con colores (rojo para bloqueado, verde para activo)
- Indicadores de carga durante la petición
- Mensajes de éxito y error
- Cierre automático después de completar la acción

**Funciones:**
```javascript
handleToggleChatStatus() // Cambia el estado del usuario
onUserUpdated()          // Callback para actualizar el estado local
```

#### 2. **Componente modificado: `MessageItem.jsx`**
**Ubicación**: `artegallera-admin/src/components/Chat/MessageItem.jsx`

**Nuevas props:**
- `userId`: ID del usuario que envió el mensaje
- `isAdmin`: Boolean que indica si el mensaje es del propio administrador
- `onUserClick`: Callback cuando se hace click en el nombre

**Cambios:**
```javascript
// Nombre de usuario ahora es clickeable (excepto admins)
<Typography 
  onClick={handleUsernameClick}
  sx={{ 
    cursor: isClickable ? 'pointer' : 'default',
    '&:hover': { textDecoration: 'underline' }
  }}
>
  {username}:
</Typography>
```

**Tooltip:** Muestra "Click para gestionar usuario" al pasar el mouse

#### 3. **Componente modificado: `Chat.jsx` (Admin)**
**Ubicación**: `artegallera-admin/src/components/Chat/Chat.jsx`

**Nuevos estados:**
```javascript
const [isAdmin, setIsAdmin] = useState(false);
const [userModalOpen, setUserModalOpen] = useState(false);
const [selectedUser, setSelectedUser] = useState(null);
```

**Nuevas funciones:**
```javascript
handleUserClick(userId, username)    // Abre modal con datos del usuario
handleUserUpdated(updatedUser)       // Actualiza el estado tras cambio
```

**Detección de administrador:**
```javascript
// Detectar si es administrador (rol_id 1 o 2)
const adminRoleIds = [1, 2];
setIsAdmin(adminRoleIds.includes(user?.rol_id));
```

**Renderizado de mensajes:**
```javascript
<MessageItem 
  key={msgData.id}
  message={msgData.message}
  username={msgData.username}
  userId={msgData.user_id}
  isAdmin={msgData.user_id === userId}  // Deshabilita click en propios mensajes
  onUserClick={handleUserClick}
/>
```

---

### Backend - API y Socket.IO

#### 1. **Nuevo endpoint: `PATCH /users/:id/chat-status`**
**Ubicación**: `artegallera-backend/src/controllers/userController.js`

**Función:** `updateUserChatStatus`

**Request:**
```json
PATCH /users/123/chat-status
Content-Type: application/json

{
  "is_active_chat": false
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "message": "Usuario bloqueado exitosamente",
  "data": {
    "id": 123,
    "username": "usuario123",
    "is_active_chat": false
  }
}
```

**Validaciones:**
- ✅ ID de usuario válido
- ✅ Usuario existe en la base de datos
- ✅ `is_active_chat` es un boolean
- ✅ No se puede bloquear a administradores (rol_id 1 o 2)

**Protección de administradores:**
```javascript
if (adminRoleIds.includes(user.rol_id) && !is_active_chat) {
  return res.status(403).json({
    success: false,
    message: "No se puede bloquear el chat de un administrador"
  });
}
```

**Evento Socket.IO emitido:**
```javascript
global.io.emit('user:chatStatusChanged', {
  userId: parseInt(id),
  username: user.username,
  is_active_chat: is_active_chat
});
```

#### 2. **Nueva ruta en router**
**Ubicación**: `artegallera-backend/src/routers/user.js`

```javascript
router.patch("/:id/chat-status", updateUserChatStatus);
```

---

### Frontend - Chat de la Landing

#### Componente modificado: `Chat.jsx` (Landing)
**Ubicación**: `artegallera-landing/src/components/Chat/Chat.jsx`

**Nuevo listener de Socket.IO:**
```javascript
socket.on("user:chatStatusChanged", (data) => {
  console.log("📢 [LANDING] Cambio de estado de chat recibido:", data);
  
  // Si el usuario actual es el afectado, actualizar su estado
  if (data.userId === userId) {
    setIsActiveChat(data.is_active_chat);
    
    // Actualizar cookie del usuario
    const userData = Cookies.get("data");
    const user = JSON.parse(userData);
    user.is_active_chat = data.is_active_chat;
    Cookies.set("data", JSON.stringify(user), { expires: 7 });
  }
});
```

**Actualización automática:**
- El estado local se actualiza inmediatamente
- La cookie del usuario se actualiza
- El input de mensaje se deshabilita automáticamente
- Aparece mensaje de advertencia visual

---

## 🔄 Flujo Completo del Sistema

### Escenario: Administrador bloquea a un usuario

```
1. 👨‍💼 ADMIN: Ve mensajes en el chat
   └─> Click en nombre de usuario "Juan123"

2. 🖼️ MODAL: Se abre con información del usuario
   ├─> Username: Juan123
   ├─> Estado actual: 🟢 Activo
   └─> Botón: "Bloquear Usuario"

3. 👨‍💼 ADMIN: Click en "Bloquear Usuario"
   └─> Loading spinner aparece

4. 📡 API REQUEST: PATCH /users/123/chat-status
   Body: { is_active_chat: false }

5. 🗄️ DATABASE: Actualiza users.is_active_chat = false
   WHERE id = 123

6. 📢 SOCKET.IO: Emite evento global
   global.io.emit('user:chatStatusChanged', {
     userId: 123,
     username: "Juan123",
     is_active_chat: false
   })

7. 📱 LANDING (Juan123): Recibe evento por socket
   ├─> Actualiza estado local: setIsActiveChat(false)
   ├─> Actualiza cookie del usuario
   ├─> Input de mensaje se deshabilita
   └─> Aparece mensaje rojo: "Bloqueado..."

8. ✅ ADMIN: Ve mensaje de éxito
   └─> Modal se cierra automáticamente

9. 🚫 LANDING (Juan123): NO puede enviar mensajes
   ├─> Input deshabilitado
   ├─> Placeholder: "No tienes permiso para chatear"
   └─> Botón de enviar deshabilitado
```

---

## 🎨 Interfaz de Usuario

### Admin - Vista del Chat

**Mensajes normales:**
```
┌─────────────────────────────────┐
│ [Juan123]: Hola, cómo están?   │ <- Hover muestra tooltip
│ [Maria]: Todo bien!             │    "Click para gestionar usuario"
│ [Admin]: Bienvenidos            │ <- NO clickeable (propio mensaje)
└─────────────────────────────────┘
```

**Modal de gestión:**
```
┌──────────────────────────────────┐
│ 🔴 Gestión de Usuario            │
├──────────────────────────────────┤
│ Usuario: Juan123                 │
│ ID: 123                          │
│                                  │
│ ┌──────────────────────────────┐│
│ │ Estado actual: 🟢 Activo     ││
│ └──────────────────────────────┘│
│                                  │
│ ¿Deseas bloquear a Juan123?     │
│                                  │
│ ℹ️ El usuario será notificado   │
│    automáticamente...            │
│                                  │
│  [Cancelar]  [🔴 Bloquear]      │
└──────────────────────────────────┘
```

### Landing - Usuario bloqueado

**Antes del bloqueo:**
```
┌─────────────────────────────────┐
│ Mensajes...                     │
│                                 │
├─────────────────────────────────┤
│ [Escribe un mensaje...     ] 😊│
│                              🚀 │
└─────────────────────────────────┘
```

**Después del bloqueo (instantáneo):**
```
┌─────────────────────────────────┐
│ Mensajes...                     │
│                                 │
├─────────────────────────────────┤
│ ⚠️ Bloqueado, contactar admin   │
│ [No tienes permiso...      ] 😊│
│                              🚫 │
└─────────────────────────────────┘
```

---

## 🔒 Seguridad y Validaciones

### Protección de administradores

**Backend:**
```javascript
// No se puede bloquear a admins (rol_id 1 o 2)
const adminRoleIds = [1, 2];
if (adminRoleIds.includes(user.rol_id) && !is_active_chat) {
  return res.status(403).json({
    success: false,
    message: "No se puede bloquear el chat de un administrador"
  });
}
```

**Frontend:**
```javascript
// El propio mensaje del admin no es clickeable
const isUserAdmin = msgData.user_id === userId;
<MessageItem 
  isAdmin={isUserAdmin}  // Deshabilita el click
/>
```

### Validaciones del endpoint

1. **ID válido:**
   ```javascript
   if (!id || isNaN(parseInt(id))) {
     return res.status(400).json({
       message: "ID de usuario inválido"
     });
   }
   ```

2. **Tipo de dato correcto:**
   ```javascript
   if (typeof is_active_chat !== 'boolean') {
     return res.status(400).json({
       message: "is_active_chat debe ser un valor booleano"
     });
   }
   ```

3. **Usuario existe:**
   ```javascript
   const user = await users.findOne({ where: { id } });
   if (!user) {
     return res.status(404).json({
       message: "Usuario no encontrado"
     });
   }
   ```

---

## 📊 Base de Datos

### Tabla: `users`

**Campo actualizado:**
```sql
is_active_chat BOOLEAN NOT NULL DEFAULT true
```

**Valores:**
- `true` (1) = Usuario puede enviar mensajes
- `false` (0) = Usuario bloqueado del chat

**Modelo Sequelize:**
```javascript
is_active_chat: {
  allowNull: false,
  type: DataTypes.BOOLEAN,
  defaultValue: true
}
```

---

## 🧪 Testing

### Probar el sistema completo

#### 1. **Abrir 2 navegadores:**
```
Navegador 1: Admin    (http://localhost:5173/admin)
Navegador 2: Usuario  (http://localhost:5174)
```

#### 2. **Ambos entran al chat:**
```
Usuario escribe: "Hola desde landing"
Admin ve el mensaje
```

#### 3. **Admin bloquea al usuario:**
```
Admin: Click en "Usuario123"
Admin: Click en "Bloquear Usuario"
```

#### 4. **Verificar en navegador del usuario:**
```
✅ Mensaje rojo aparece inmediatamente
✅ Input deshabilitado
✅ Botón de enviar deshabilitado
✅ No puede escribir más mensajes
```

#### 5. **Admin desbloquea al usuario:**
```
Admin: Click en "Usuario123" nuevamente
Admin: Click en "Desbloquear Usuario"
```

#### 6. **Verificar en navegador del usuario:**
```
✅ Mensaje rojo desaparece
✅ Input habilitado
✅ Botón de enviar habilitado
✅ Puede escribir nuevamente
```

---

## 📝 Logs del Sistema

### Backend

**Al bloquear:**
```
✅ Estado de chat actualizado para usuario 123: Bloqueado
📢 [SOCKET] Emitiendo cambio de estado de chat para usuario 123
```

**Al desbloquear:**
```
✅ Estado de chat actualizado para usuario 123: Activo
📢 [SOCKET] Emitiendo cambio de estado de chat para usuario 123
```

### Admin

**Al hacer click en usuario:**
```
👤 [ADMIN] Click en usuario: 123 Juan123
```

**Al actualizar:**
```
✅ [ADMIN] Usuario actualizado: {user_id: 123, is_active_chat: false}
```

### Landing

**Al recibir evento:**
```
📢 [LANDING] Cambio de estado de chat recibido: {userId: 123, is_active_chat: false}
🔔 [LANDING] Tu estado de chat ha cambiado: Bloqueado
```

---

## 🚀 Características Destacadas

### ✅ Tiempo Real
- Notificación **instantánea** por Socket.IO
- Sin necesidad de recargar la página
- Actualización automática de UI

### ✅ UX Intuitiva
- Click directo en nombres de usuario
- Tooltip informativo al pasar mouse
- Modal con información clara
- Feedback visual inmediato

### ✅ Seguridad
- Administradores protegidos
- Validaciones exhaustivas en backend
- No se puede bloquear a uno mismo
- Manejo de errores robusto

### ✅ Sincronización
- Cookie del usuario actualizada
- Estado local actualizado
- Base de datos actualizada
- Todos los clientes notificados

---

## 🔧 API Endpoints

### Actualizar estado de chat

```
PATCH /users/:id/chat-status
```

**Headers:**
```
Content-Type: application/json
```

**Path Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| id | integer | ID del usuario a modificar |

**Body:**
```json
{
  "is_active_chat": true | false
}
```

**Respuestas:**

**200 OK:**
```json
{
  "success": true,
  "message": "Usuario bloqueado exitosamente",
  "data": {
    "id": 123,
    "username": "usuario123",
    "is_active_chat": false
  }
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "ID de usuario inválido"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "No se puede bloquear el chat de un administrador"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error interno del servidor",
  "error": "mensaje de error"
}
```

---

## 🎯 Casos de Uso

### 1. Moderación de contenido
```
Usuario envía spam → Admin lo bloquea → Usuario no puede seguir enviando
```

### 2. Comportamiento inapropiado
```
Usuario envía insultos → Admin lo bloquea temporalmente
Después de advertencia → Admin lo desbloquea
```

### 3. Protección durante transmisión
```
Transmisión en vivo iniciada → Usuarios pueden comentar
Usuario problemático → Admin lo bloquea sin interrumpir transmisión
Otros usuarios → Siguen comentando normalmente
```

---

## 📚 Archivos Modificados/Creados

### Nuevos archivos:
- ✅ `artegallera-admin/src/components/Chat/UserManagementModal.jsx`

### Archivos modificados:
- ✅ `artegallera-admin/src/components/Chat/MessageItem.jsx`
- ✅ `artegallera-admin/src/components/Chat/Chat.jsx`
- ✅ `artegallera-landing/src/components/Chat/Chat.jsx`
- ✅ `artegallera-backend/src/controllers/userController.js`
- ✅ `artegallera-backend/src/routers/user.js`

---

## 🎉 Resultado Final

El sistema está completamente funcional y permite:

✅ **Administrador puede:**
- Ver todos los mensajes del chat
- Hacer click en cualquier nombre de usuario (excepto el propio)
- Bloquear/desbloquear usuarios con un click
- Ver feedback inmediato de la acción

✅ **Usuario bloqueado:**
- Es notificado instantáneamente
- No puede enviar más mensajes
- Ve mensaje de advertencia claro
- Input deshabilitado automáticamente

✅ **Sistema:**
- Cambios en tiempo real vía Socket.IO
- Sincronización entre admin y usuarios
- Protección de administradores
- Base de datos actualizada correctamente
- Cookies actualizadas automáticamente

**¡El sistema de gestión de usuarios en chat está listo para producción!** 🚀

