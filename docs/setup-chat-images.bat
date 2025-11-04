@echo off
echo ========================================
echo Configuracion de Imagenes para el Chat
echo ========================================
echo.

echo [1/3] Instalando dependencias...
call npm install multer
if %errorlevel% neq 0 (
    echo Error: Fallo la instalacion de multer
    pause
    exit /b 1
)
echo.

echo [2/3] Ejecutando migracion de base de datos...
call npx sequelize-cli db:migrate
if %errorlevel% neq 0 (
    echo Error: Fallo la migracion de base de datos
    pause
    exit /b 1
)
echo.

echo [3/3] Creando directorio de uploads...
if not exist "uploads\chat-images" (
    mkdir uploads\chat-images
    echo Directorio creado: uploads\chat-images
) else (
    echo Directorio ya existe: uploads\chat-images
)
echo.

echo ========================================
echo Configuracion completada exitosamente!
echo ========================================
echo.
echo Puedes iniciar el servidor con: npm start
echo.
pause

