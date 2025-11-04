# 📝 Changelog: Funcionalidad de Eliminación de Mensajes del Chat

## 📅 Fecha
31 de Octubre, 2025

## ✨ Nueva Funcionalidad Implementada
Se ha implementado la funcionalidad completa para que los administradores puedan **seleccionar y eliminar mensajes del chat** desde el panel de administración (artegallera-admin), similar a la funcionalidad existente de bloquear/desbloquear usuarios.

---

## 🎯 Objetivos Cumplidos

1. ✅ Permitir a los administradores activar un "modo de selección" en el chat
2. ✅ Seleccionar uno o múltiples mensajes mediante checkboxes
3. ✅ Eliminar mensajes seleccionados con confirmación
4. ✅ Sincronización en tiempo real mediante Socket.IO
5. ✅ Invalidación automática de caché Redis
6. ✅ Notificaciones visuales de éxito/error

---

## 🔧 Cambios Implementados

### 1. Backend API (artegallera-backend)

#### 1.1. Controlador de Mensajes (`src/controllers/messageController.js`)

**Nuevas Funciones Agregadas:**

##### `deleteMessage(req, res)`
- Elimina un mensaje individual por ID
- Valida que el mensaje existe antes de eliminar
- Invalida caché de Redis (por evento o general)
- Emite evento `messageDeleted` por Socket.IO para sincronización en tiempo real
- Endpoint: `DELETE /messages/:messageId`

##### `deleteMultipleMessages(req, res)`
- Elimina múltiples mensajes en una sola operación
- Recibe un array de IDs de mensajes
- Agrupa mensajes por sala (event_id) para emitir eventos correctamente
- Invalida caché para todos los eventos afectados
- Emite evento `messagesDeleted` por Socket.IO
- Endpoint: `POST /messages/delete-multiple`

**Código de Ejemplo:**
```javascript
// Eliminar un mensaje
const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const message = await messages.findByPk(messageIdNum);
  await message.destroy();
  
  // Invalidar caché
  if (eventId) {
    await messageCache.invalidateEvent(eventId);
  } else {
    await messageCache.invalidateGeneral();
  }
  
  // Emitir por socket
  chatSocket.emit("messageDeleted", room, { messageId: messageIdNum });
};
```

#### 1.2. Rutas de Mensajes (`src/routers/messages.js`)

**Nuevas Rutas Agregadas:**
```javascript
// Eliminar un mensaje por ID
router.delete('/:messageId', messageController.deleteMessage);

// Eliminar múltiples mensajes por IDs
router.post('/delete-multiple', messageController.deleteMultipleMessages);
```

---

### 2. Servidor de Socket.IO

#### 2.1. Backend Principal (`artegallera-backend/index.js`)

**Nuevos Listeners Agregados:**
```javascript
// Listener para eliminación de un mensaje
socket.on("messageDeleted", (room, data) => {
  console.log(`🗑️ [SOCKET] Mensaje ${data.messageId} eliminado en sala ${room}`);
  io.to(room).emit("messageDeleted", data);
});

// Listener para eliminación de múltiples mensajes
socket.on("messagesDeleted", (room, data) => {
  console.log(`🗑️ [SOCKET] Múltiples mensajes eliminados en sala ${room}:`, data.messageIds);
  io.to(room).emit("messagesDeleted", data);
});
```

#### 2.2. Servidor de Chat (`artegallera-chat/src/websocket.js`)

**Nuevos Listeners Agregados:**
Los mismos listeners agregados al servidor principal para garantizar que ambos servidores (puerto 3001 y 3002) manejen correctamente los eventos de eliminación.

---

### 3. Frontend Admin (artegallera-admin)

#### 3.1. Componente MessageItem (`src/components/Chat/MessageItem.jsx`)

**Nuevas Props Agregadas:**
- `messageId`: ID del mensaje para identificación
- `selectionMode`: Booleano que indica si el modo de selección está activo
- `isSelected`: Booleano que indica si el mensaje está seleccionado
- `onSelect`: Callback para manejar la selección del mensaje

**Nuevas Características:**
- Checkbox de selección que aparece cuando `selectionMode` es `true`
- Fondo azul claro cuando un mensaje está seleccionado
- Animación suave de transición

**Código de Ejemplo:**
```jsx
{selectionMode && (
  <Checkbox
    checked={isSelected}
    onChange={handleCheckboxChange}
    size="small"
    sx={{
      padding: 0,
      color: '#666',
      '&.Mui-checked': {
        color: '#2196f3',
      }
    }}
  />
)}
```

#### 3.2. Componente Chat (`src/components/Chat/Chat.jsx`)

**Nuevos Estados Agregados:**
```javascript
const [selectionMode, setSelectionMode] = useState(false);
const [selectedMessages, setSelectedMessages] = useState(new Set());
const [deletingMessages, setDeletingMessages] = useState(false);
const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
```

**Nuevas Funciones Agregadas:**

##### `toggleSelectionMode()`
- Activa/desactiva el modo de selección
- Limpia la selección al cambiar de modo

##### `handleMessageSelect(messageId)`
- Agrega o quita un mensaje del Set de mensajes seleccionados
- Usa Set para garantizar unicidad de IDs

##### `handleDeleteSelected()`
- Valida que haya mensajes seleccionados
- Muestra confirmación con cantidad de mensajes
- Llama a la API para eliminar los mensajes
- Actualiza el estado local eliminando los mensajes
- Muestra notificación de éxito/error
- Sale del modo de selección automáticamente

**Nuevos Listeners de Socket:**
```javascript
// Listener para eliminación de un mensaje
const handleMessageDeleted = (data) => {
  setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
  setSelectedMessages(prev => {
    const newSet = new Set(prev);
    newSet.delete(data.messageId);
    return newSet;
  });
};

// Listener para eliminación de múltiples mensajes
const handleMessagesDeleted = (data) => {
  setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg.id)));
  setSelectedMessages(prev => {
    const newSet = new Set(prev);
    data.messageIds.forEach(id => newSet.delete(id));
    return newSet;
  });
};
```

**Nueva Interfaz de Usuario:**
- Botón con ícono de checkbox para activar modo de selección
- Botón rojo con ícono de papelera para eliminar mensajes (muestra cantidad)
- Botón de cancelar para salir del modo de selección
- Snackbar para notificaciones de éxito/error

**UI en Modo Normal:**
```
[Botón de Checkbox] ← Activa modo de selección
```

**UI en Modo de Selección:**
```
[Botón Eliminar (X mensajes)] [Botón Cancelar]
```

---

## 🔄 Flujo de Eliminación de Mensajes

### Flujo Completo:

1. **Usuario Activa Modo de Selección**
   - Admin hace click en el botón de checkbox
   - Se activa `selectionMode = true`
   - Aparecen checkboxes en todos los mensajes

2. **Usuario Selecciona Mensajes**
   - Admin hace click en los checkboxes de los mensajes a eliminar
   - Los mensajes seleccionados se agregan al Set `selectedMessages`
   - Los mensajes seleccionados se resaltan con fondo azul

3. **Usuario Elimina Mensajes**
   - Admin hace click en el botón de eliminar
   - Aparece confirmación: "¿Estás seguro de que deseas eliminar X mensaje(s)?"
   - Si acepta:
     - Se llama a `POST /messages/delete-multiple` con los IDs
     - Backend elimina mensajes de la BD
     - Backend invalida caché de Redis
     - Backend emite evento `messagesDeleted` por Socket.IO
     - Frontend elimina mensajes del estado local
     - Frontend sale del modo de selección
     - Aparece notificación de éxito

4. **Sincronización en Tiempo Real**
   - Todos los clientes conectados a la misma sala reciben el evento
   - Los mensajes eliminados desaparecen automáticamente de sus chats
   - Los mensajes eliminados se quitan de selecciones activas

---

## 📊 Endpoints de la API

### DELETE `/messages/:messageId`
**Descripción:** Elimina un mensaje individual por ID

**Parámetros:**
- `messageId` (path): ID del mensaje a eliminar

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Mensaje eliminado exitosamente",
  "data": {
    "id": 123
  }
}
```

**Errores Posibles:**
- `400` - ID de mensaje inválido
- `404` - Mensaje no encontrado
- `500` - Error interno del servidor

---

### POST `/messages/delete-multiple`
**Descripción:** Elimina múltiples mensajes en una sola operación

**Body:**
```json
{
  "messageIds": [123, 456, 789]
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "3 mensaje(s) eliminado(s) exitosamente",
  "data": {
    "deletedCount": 3,
    "deletedIds": [123, 456, 789]
  }
}
```

**Errores Posibles:**
- `400` - Array vacío o IDs inválidos
- `404` - No se encontraron mensajes con los IDs proporcionados
- `500` - Error interno del servidor

---

## 🔌 Eventos de Socket.IO

### Evento: `messageDeleted`
**Emitido por:** Backend al eliminar un mensaje individual  
**Escuchado por:** Todos los clientes en la sala

**Datos Enviados:**
```javascript
{
  messageId: 123
}
```

**Acción en Cliente:**
- Eliminar mensaje del estado local
- Quitar mensaje de la selección si estaba seleccionado

---

### Evento: `messagesDeleted`
**Emitido por:** Backend al eliminar múltiples mensajes  
**Escuchado por:** Todos los clientes en la sala

**Datos Enviados:**
```javascript
{
  messageIds: [123, 456, 789]
}
```

**Acción en Cliente:**
- Eliminar todos los mensajes del estado local
- Quitar mensajes de la selección si estaban seleccionados

---

## 🎨 Componentes UI Agregados

### Nuevos Íconos Importados:
```javascript
import DeleteIcon from "@mui/icons-material/Delete";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CancelIcon from "@mui/icons-material/Cancel";
```

### Nuevos Componentes MUI Utilizados:
```javascript
import { Alert, Snackbar, Checkbox } from "@mui/material";
```

---

## 🧪 Casos de Prueba

### Pruebas Recomendadas:

1. **Selección Individual**
   - ✅ Activar modo de selección
   - ✅ Seleccionar un mensaje
   - ✅ Eliminar mensaje seleccionado
   - ✅ Verificar eliminación en tiempo real

2. **Selección Múltiple**
   - ✅ Seleccionar múltiples mensajes (3-5)
   - ✅ Eliminar todos los mensajes seleccionados
   - ✅ Verificar eliminación en tiempo real

3. **Cancelar Selección**
   - ✅ Seleccionar mensajes
   - ✅ Cancelar sin eliminar
   - ✅ Verificar que los mensajes permanecen

4. **Sincronización Multi-Cliente**
   - ✅ Abrir 2 ventanas de admin
   - ✅ Eliminar mensajes desde una ventana
   - ✅ Verificar que desaparecen en ambas ventanas

5. **Manejo de Errores**
   - ✅ Intentar eliminar sin seleccionar mensajes
   - ✅ Verificar mensaje de advertencia

6. **Diferentes Eventos**
   - ✅ Eliminar mensajes en chat general
   - ✅ Eliminar mensajes en evento específico
   - ✅ Verificar que solo se eliminan en la sala correcta

---

## 🔒 Seguridad

### Consideraciones de Seguridad Implementadas:

1. **Validación de Permisos:**
   - Solo los usuarios administradores (rol_id 1 o 2) pueden ver el botón de selección
   - El botón solo aparece cuando `isAdmin = true`

2. **Validación en Backend:**
   - Validación de tipos de datos (IDs deben ser números)
   - Validación de existencia de mensajes antes de eliminar
   - Manejo de errores con try-catch

3. **Confirmación de Usuario:**
   - Diálogo de confirmación antes de eliminar
   - Muestra cantidad de mensajes a eliminar

### ⚠️ Mejoras de Seguridad Recomendadas (Futuro):

1. Agregar validación de rol en el backend (middleware)
2. Agregar logs de auditoría para eliminaciones
3. Considerar "soft delete" en lugar de eliminación física
4. Agregar límite de mensajes eliminables por operación

---

## 📈 Rendimiento y Optimización

### Optimizaciones Implementadas:

1. **Uso de Set para Selección:**
   - Búsqueda y eliminación O(1)
   - Garantiza unicidad de IDs

2. **Eliminación en Lote:**
   - Reduce número de llamadas a la API
   - Una sola transacción de BD

3. **Invalidación Inteligente de Caché:**
   - Solo invalida caché de eventos afectados
   - Invalida caché general solo si es necesario

4. **Actualización Local Inmediata:**
   - No espera sincronización de servidor
   - Mejora percepción de velocidad

---

## 🐛 Problemas Conocidos y Limitaciones

### Limitaciones Actuales:

1. **Sin Límite de Selección:**
   - No hay límite máximo de mensajes seleccionables
   - Podría causar problemas con selecciones muy grandes

2. **Sin Recuperación de Mensajes:**
   - Una vez eliminados, no se pueden recuperar
   - No hay papelera de reciclaje

3. **Selección Manual:**
   - No hay opción de "Seleccionar todos"
   - Hay que hacer click en cada mensaje

### Posibles Mejoras Futuras:

1. Agregar botón "Seleccionar todos"
2. Agregar botón "Deseleccionar todos"
3. Implementar "soft delete" con papelera
4. Agregar filtros para selección rápida
5. Agregar límite de selección (ej: máximo 50 mensajes)
6. Agregar opción de exportar mensajes antes de eliminar

---

## 📝 Notas Adicionales

### Arquitectura del Sistema:

El sistema utiliza dos servidores de Socket.IO:
- **Puerto 3001:** Servidor de chat dedicado (`artegallera-chat`)
- **Puerto 3002:** Servidor principal con API REST (`artegallera-backend`)

Ambos servidores manejan los eventos de eliminación para garantizar sincronización completa.

### Compatibilidad:

- ✅ Compatible con mensajes de eventos específicos
- ✅ Compatible con mensajes del chat general
- ✅ Compatible con la funcionalidad existente de bloquear usuarios
- ✅ No interfiere con el flujo de mensajes normales

---

## 👥 Créditos

Implementado como una extensión de la funcionalidad de gestión de usuarios existente, siguiendo los mismos patrones de diseño y arquitectura.

---

## 📚 Referencias

Archivos Modificados:
- `artegallera-backend/src/controllers/messageController.js`
- `artegallera-backend/src/routers/messages.js`
- `artegallera-backend/index.js`
- `artegallera-chat/src/websocket.js`
- `artegallera-admin/src/components/Chat/Chat.jsx`
- `artegallera-admin/src/components/Chat/MessageItem.jsx`

Relacionado con:
- `CHANGELOG_USER_CHAT_MANAGEMENT.md` - Gestión de usuarios
- `FIX_SOCKET_SYNC_DESBLOQUEO.md` - Sincronización de Socket.IO

