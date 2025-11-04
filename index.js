const server = require("./src/app.js");
const { conn } = require("./src/db.js");
const http = require("http");
const { Server } = require("socket.io");

// Crear servidor HTTP
const httpServer = http.createServer(server);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Exportar io para usarlo en otros módulos
global.io = io;

// Configurar eventos de socket
io.on("connection", (socket) => {
  console.log("Nueva conexión de socket:", socket.id);

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`Usuario ${socket.id} se unió a la sala: ${room}`);
  });

  // Listener para eliminación de un mensaje
  socket.on("messageDeleted", (room, data) => {
    console.log(`🗑️ [SOCKET] Mensaje ${data.messageId} eliminado en sala ${room}`);
    // Emitir a todos en la sala (incluyendo al emisor)
    io.to(room).emit("messageDeleted", data);
  });

  // Listener para eliminación de múltiples mensajes
  socket.on("messagesDeleted", (room, data) => {
    console.log(`🗑️ [SOCKET] Múltiples mensajes eliminados en sala ${room}:`, data.messageIds);
    // Emitir a todos en la sala (incluyendo al emisor)
    io.to(room).emit("messagesDeleted", data);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});

conn.sync({ force: false }).then(() => {
  httpServer.listen(process.env.PORT || 3002, () => {
    console.log(`Server is listening at ${process.env.PORT || 3002}`);
    console.log(`Socket.IO server is ready`);
  });
});