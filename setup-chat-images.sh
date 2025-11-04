#!/bin/bash

echo "========================================"
echo "Configuración de Imágenes para el Chat"
echo "========================================"
echo ""

echo "[1/3] Instalando dependencias..."
npm install multer
if [ $? -ne 0 ]; then
    echo "Error: Falló la instalación de multer"
    exit 1
fi
echo ""

echo "[2/3] Ejecutando migración de base de datos..."
npx sequelize-cli db:migrate
if [ $? -ne 0 ]; then
    echo "Error: Falló la migración de base de datos"
    exit 1
fi
echo ""

echo "[3/3] Creando directorio de uploads..."
if [ ! -d "uploads/chat-images" ]; then
    mkdir -p uploads/chat-images
    echo "Directorio creado: uploads/chat-images"
else
    echo "Directorio ya existe: uploads/chat-images"
fi
echo ""

echo "========================================"
echo "Configuración completada exitosamente!"
echo "========================================"
echo ""
echo "Puedes iniciar el servidor con: npm start"
echo ""

