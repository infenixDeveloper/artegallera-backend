const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const upload = require('../config/multer');

// Crear un nuevo mensaje (con soporte para imágenes)
router.post('/', upload.single('image'), messageController.createMessage);

// Obtener todos los mensajes (con filtros opcionales)
router.get('/', messageController.getMessages);

// Obtener mensajes por evento específico
router.get('/event/:eventId', messageController.getMessagesByEvent);

// Obtener mensajes generales (sin evento)
router.get('/general', messageController.getGeneralMessages);

// Eliminar un mensaje por ID
router.delete('/:messageId', messageController.deleteMessage);

// Eliminar múltiples mensajes por IDs
router.post('/delete-multiple', messageController.deleteMultipleMessages);

module.exports = router;

