# 📖 Historial de Chat para Usuarios Bloqueados

## 📅 Fecha
31 de Octubre, 2025

## 🎯 Objetivo
Documentar el comportamiento del sistema de chat para usuarios bloqueados: **pueden VER el historial pero NO pueden ENVIAR mensajes**.

---

## ✅ Comportamiento Implementado

### 1. **Usuario Bloqueado (is_active_chat = false)**

#### **✓ Lo que SÍ puede hacer:**
- ✅ **Ver todo el historial de mensajes** en tiempo real
- ✅ **Recibir actualizaciones automáticas** cada 3 segundos
- ✅ **Ver mensajes nuevos** que otros usuarios envían
- ✅ **Scroll en el historial** de mensajes
- ✅ **Ver el contenido completo** del chat

#### **✗ Lo que NO puede hacer:**
- ❌ **Enviar nuevos mensajes**
- ❌ **Escribir en el input** (deshabilitado)
- ❌ **Hacer clic en el botón de envío** (deshabilitado)
- ❌ **Seleccionar emojis** (deshabilitado visualmente)

---

## 🔍 Implementación Técnica

### Área de Mensajes (SIEMPRE VISIBLE)

```jsx
{/* Área de mensajes - SIEMPRE VISIBLE independientemente de isActiveChat */}
<Box
  sx={{
    flex: 1,
    overflowY: "auto",
    // ... estilos ...
  }}
>
  {/* NO hay condición if (!isActiveChat) aquí */}
  {messages.map((msgData, index) => (
    <MessageItem 
      key={msgData.id || `msg-${index}`} 
      message={msgData.message} 
      username={msgData.username}
    />
  ))}
</Box>
```

**Características:**
- ❌ **NO** está condicionado por `isActiveChat`
- ✅ Renderiza todos los mensajes independientemente del estado del usuario
- ✅ El scroll funciona normalmente
- ✅ Las actualizaciones en tiempo real funcionan normalmente

---

### Carga de Mensajes (NO VERIFICA BLOQUEO)

```javascript
// Función para cargar mensajes desde la API (optimizada para evitar parpadeo)
// IMPORTANTE: Esta función NO verifica isActiveChat - los mensajes se cargan siempre
// Los usuarios bloqueados pueden VER el historial, solo no pueden ENVIAR mensajes
const loadMessagesFromAPI = async (eventId = null, isInitialLoad = false) => {
  if (isLoadingMessages) return;
  
  // ... NO hay verificación de isActiveChat aquí ...
  
  try {
    let response;
    if (eventId) {
      response = await api.get(`/messages/event/${eventId}`, {
        params: { limit: 100, offset: 0 }
      });
    } else {
      response = await api.get("/messages/general", {
        params: { limit: 100, offset: 0 }
      });
    }
    
    // Formatear y mostrar mensajes
    const formattedMessages = apiMessages.map(formatApiMessage).reverse();
    setMessages(/* ... */);
  } catch (error) {
    console.error("Error al cargar mensajes:", error);
  }
};
```

**Características:**
- ❌ **NO** verifica `isActiveChat` antes de hacer la petición
- ✅ Carga mensajes para **todos los usuarios** (bloqueados o no)
- ✅ La sincronización cada 3 segundos funciona para usuarios bloqueados
- ✅ Los mensajes nuevos aparecen automáticamente

---

### Sincronización Automática (FUNCIONA SIEMPRE)

```javascript
// Sincronización automática cada 3 segundos (estilo Facebook Live)
useEffect(() => {
  const syncMessages = () => {
    const hasValidEvent = activeEvent && 
                          typeof activeEvent === 'object' && 
                          !Array.isArray(activeEvent) && 
                          activeEvent.id;
    
    if (hasValidEvent) {
      loadMessagesFromAPI(activeEvent.id, false); // NO verifica isActiveChat
    } else {
      loadMessagesFromAPI(null, false); // NO verifica isActiveChat
    }
  };

  const intervalId = setInterval(syncMessages, 3000);
  
  return () => clearInterval(intervalId);
}, [activeEvent, eventId]); // NO depende de isActiveChat
```

**Características:**
- ❌ **NO** verifica `isActiveChat` antes de sincronizar
- ❌ **NO** incluye `isActiveChat` en las dependencias del useEffect
- ✅ El intervalo se ejecuta **siempre**, independientemente del estado del usuario
- ✅ Los usuarios bloqueados reciben actualizaciones en tiempo real

---

### Socket.IO (RECIBE MENSAJES SIEMPRE)

```javascript
// Recibir mensajes nuevos en tiempo real
const handleMessage = (msgData) => {
  // Filtrar por evento, NO por isActiveChat
  
  // Si el mensaje tiene ID y ya existe, no agregarlo
  if (msgData.id && loadedMessageIds.current.has(msgData.id)) {
    return;
  }
  
  // Agregar el mensaje - NO hay verificación de isActiveChat
  setMessages((prev) => {
    const exists = prev.some(msg => msg.id === msgData.id);
    if (exists) return prev;
    
    const updated = [...prev, msgData];
    return updated.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || Date.now()).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || Date.now()).getTime();
      return timeA - timeB;
    });
  });
};

socket.on("message", handleMessage);
```

**Características:**
- ❌ **NO** verifica `isActiveChat` antes de procesar mensajes
- ✅ Todos los usuarios reciben mensajes nuevos vía Socket.IO
- ✅ La sincronización en tiempo real funciona para usuarios bloqueados

---

### Input y Envío (SOLO ESTO SE BLOQUEA)

```jsx
<input
  type="text"
  placeholder={isActiveChat ? "Escribe un mensaje..." : "🔒 Chat bloqueado"}
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  disabled={!isActiveChat} // ← ESTO SÍ se bloquea
  style={{
    backgroundColor: !isActiveChat ? "rgba(150, 150, 150, 0.2)" : "transparent",
    color: isActiveChat ? "white" : "#aaa",
    cursor: isActiveChat ? "text" : "not-allowed"
  }}
/>

<IconButton
  onClick={sendMessage}
  disabled={!message || isSending || !isActiveChat} // ← ESTO SÍ se bloquea
>
  {!isActiveChat ? <BlockIcon /> : <SendIcon />}
</IconButton>
```

**Características:**
- ✅ **SÍ** verifica `isActiveChat` para deshabilitar el input
- ✅ **SÍ** verifica `isActiveChat` para deshabilitar el botón de envío
- ✅ Estilos visuales cambian según `isActiveChat`
- ❌ **NO** afecta la visualización del historial

---

## 📊 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO NORMAL (is_active_chat = true)       │
├─────────────────────────────────────────────────────────────────┤
│  ✅ VER historial de mensajes                                   │
│  ✅ RECIBIR actualizaciones en tiempo real (Socket.IO + Polling)│
│  ✅ ENVIAR nuevos mensajes                                      │
│  ✅ Escribir en el input                                        │
│  ✅ Seleccionar emojis                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ Admin bloquea usuario
                             │ (is_active_chat = false)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USUARIO BLOQUEADO (is_active_chat = false)     │
├─────────────────────────────────────────────────────────────────┤
│  ✅ VER historial de mensajes (SIGUE FUNCIONANDO)              │
│  ✅ RECIBIR actualizaciones en tiempo real (SIGUE FUNCIONANDO) │
│  ❌ ENVIAR nuevos mensajes (BLOQUEADO)                         │
│  ❌ Escribir en el input (DESHABILITADO)                       │
│  ❌ Seleccionar emojis (DESHABILITADO)                         │
├─────────────────────────────────────────────────────────────────┤
│  FEEDBACK VISUAL:                                               │
│  • Alert rojo con animación: "🚫 Chat Bloqueado"               │
│  • Mensaje claro: "No puedes enviar mensajes, pero             │
│    puedes seguir viendo el chat"                               │
│  • Input tachado con placeholder "🔒 Chat bloqueado"           │
│  • Botón de envío con icono de bloqueo (🚫)                    │
│  • Advertencia naranja: "Esta restricción puede ser removida"  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Mensaje de Bloqueo Actualizado

### Antes:
```jsx
<Typography>
  Tu cuenta ha sido bloqueada para enviar mensajes. 
  Contacta con el administrador.
</Typography>
```

### Después:
```jsx
<Typography>
  No puedes enviar mensajes, pero <strong>puedes seguir viendo el chat</strong>. 
  Contacta al administrador para más información.
</Typography>
```

**Beneficios:**
- ✅ Claridad sobre qué puede y qué no puede hacer el usuario
- ✅ Reduce confusión y ansiedad del usuario
- ✅ Mensaje positivo: enfatiza lo que SÍ puede hacer
- ✅ Call-to-action claro: contactar al administrador

---

## 🧪 Pruebas de Verificación

### Test 1: Historial visible cuando bloqueado
1. **Setup:**
   - Usuario A logueado en Landing
   - Usuario B (admin) logueado en Admin Panel
   - Varios mensajes en el chat

2. **Acción:**
   - Admin bloquea a Usuario A

3. **Resultado esperado:**
   - ✅ Usuario A sigue viendo **todos los mensajes anteriores**
   - ✅ El scroll funciona normalmente
   - ✅ No hay pérdida de datos

### Test 2: Mensajes nuevos visibles cuando bloqueado
1. **Setup:**
   - Usuario A bloqueado en Landing
   - Usuario B activo en otra ventana

2. **Acción:**
   - Usuario B envía un mensaje nuevo

3. **Resultado esperado:**
   - ✅ Usuario A **ve el mensaje nuevo inmediatamente** (Socket.IO)
   - ✅ O dentro de 3 segundos (Polling)
   - ✅ El mensaje aparece en el historial

### Test 3: Sincronización cada 3 segundos
1. **Setup:**
   - Usuario A bloqueado en Landing
   - Otro usuario envía mensajes continuamente

2. **Acción:**
   - Observar la consola del navegador

3. **Resultado esperado:**
   - ✅ Logs de sincronización cada 3 segundos
   - ✅ Mensajes nuevos aparecen automáticamente
   - ✅ No hay errores en la consola

### Test 4: Input deshabilitado
1. **Setup:**
   - Usuario A bloqueado en Landing

2. **Acción:**
   - Intentar hacer clic en el input
   - Intentar escribir

3. **Resultado esperado:**
   - ❌ No puede hacer clic en el input
   - ❌ No puede escribir
   - ✅ Cursor muestra "not-allowed"
   - ✅ Input tiene estilo de deshabilitado

### Test 5: Botón de envío deshabilitado
1. **Setup:**
   - Usuario A bloqueado en Landing

2. **Acción:**
   - Intentar hacer clic en el botón de envío

3. **Resultado esperado:**
   - ❌ El botón no responde
   - ✅ Muestra icono de bloqueo (🚫)
   - ✅ Color rojo (#d32f2f)
   - ✅ Tooltip: "Chat bloqueado"

---

## 📋 Checklist de Verificación

- [x] Historial de mensajes visible cuando `isActiveChat = false`
- [x] Sincronización cada 3 segundos funciona para usuarios bloqueados
- [x] Socket.IO entrega mensajes a usuarios bloqueados
- [x] Polling de mensajes NO verifica `isActiveChat`
- [x] Input deshabilitado cuando `isActiveChat = false`
- [x] Botón de envío deshabilitado cuando `isActiveChat = false`
- [x] Emoji picker deshabilitado cuando `isActiveChat = false`
- [x] Mensaje claro en el Alert: "puedes seguir viendo el chat"
- [x] Comentarios en el código documentan este comportamiento
- [x] No hay condiciones que oculten el área de mensajes

---

## 🔧 Archivos Modificados

### Frontend - Landing
- **Archivo**: `artegallera-landing/src/components/Chat/Chat.jsx`

#### Líneas 66-69:
```javascript
// Función para cargar mensajes desde la API (optimizada para evitar parpadeo)
// IMPORTANTE: Esta función NO verifica isActiveChat - los mensajes se cargan siempre
// Los usuarios bloqueados pueden VER el historial, solo no pueden ENVIAR mensajes
const loadMessagesFromAPI = async (eventId = null, isInitialLoad = false) => {
```

#### Línea 523:
```javascript
{/* Área de mensajes - SIEMPRE VISIBLE independientemente de isActiveChat */}
```

#### Líneas 636-641:
```jsx
<Typography sx={{ fontSize: "12px", fontWeight: "bold", color: "#fff" }}>
  🚫 Chat Bloqueado
</Typography>
<Typography sx={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
  No puedes enviar mensajes, pero <strong>puedes seguir viendo el chat</strong>. 
  Contacta al administrador para más información.
</Typography>
```

---

## 🎯 Beneficios del Diseño

1. **UX Mejorada**: Usuario no se siente completamente excluido
2. **Transparencia**: Puede ver el contexto y conversación actual
3. **Moderación Efectiva**: Admin puede bloquear spam sin eliminar al usuario
4. **Reversibilidad**: Usuario puede ser desbloqueado y retomar la conversación
5. **Claridad**: Mensaje explícito sobre qué puede y qué no puede hacer
6. **Performance**: No hay lógica adicional que afecte la carga de mensajes

---

## 🔐 Consideraciones de Seguridad

### Backend
- ✅ La API `/messages` NO verifica `is_active_chat` para GET (lectura)
- ✅ La API `/messages` SÍ verifica `is_active_chat` para POST (escritura)
- ✅ Validación en el backend previene bypass del frontend

### Frontend
- ✅ Input deshabilitado previene escritura accidental
- ✅ Botón deshabilitado previene envío accidental
- ✅ Validación adicional en `sendMessage()` verifica `isActiveChat`

```javascript
const sendMessage = async () => {
  // ... validaciones ...
  
  // Validar que el usuario tenga permiso para chatear
  const userData = Cookies.get("data");
  let canChat = isActiveChat;
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      canChat = user?.is_active_chat !== undefined ? user.is_active_chat : true;
      if (canChat !== isActiveChat) {
        setIsActiveChat(canChat);
      }
    } catch (error) {
      console.error("Error al leer datos del usuario:", error);
    }
  }

  if (!canChat) {
    alert("No tienes permiso para enviar mensajes. Contacta al administrador.");
    return; // ← BLOQUEO AQUÍ
  }
  
  // ... resto del código ...
};
```

---

## 📚 Referencias

- [React Conditional Rendering](https://react.dev/learn/conditional-rendering)
- [Material-UI Disabled State](https://mui.com/material-ui/react-button/#disabled)
- [UX Best Practices for Moderation](https://www.nngroup.com/articles/moderation-ux/)

---

## 👨‍💻 Desarrollador
**Fecha**: 31 de Octubre, 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Completado y documentado

---

## 🎉 Conclusión

El sistema está diseñado para que los usuarios bloqueados:
- ✅ **PUEDAN** ver todo el historial de mensajes
- ✅ **PUEDAN** recibir actualizaciones en tiempo real
- ❌ **NO PUEDAN** enviar nuevos mensajes

Este diseño proporciona una experiencia de moderación efectiva y transparente, manteniendo al usuario informado sin permitir interacción no deseada.

