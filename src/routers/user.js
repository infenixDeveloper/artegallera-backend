const { Router } = require("express")
const router = Router();

const { getUsers, updateUser, addBalance, deleteUser, getUserById, withdrawBalance, getTotalAmount, exportUsersToExcel, updateUserChatStatus, getUserChatStatus } = require("../controllers/userController");

router.get("/", getUsers);
router.get("/total-amount", getTotalAmount);
router.get("/generar-cvs", exportUsersToExcel);
// Rutas específicas ANTES de las genéricas con parámetros
router.get("/:id/chat-status", getUserChatStatus);
router.patch("/:id/chat-status", updateUserChatStatus);
router.put("/balance", addBalance);
router.put("/withdraw-balance", withdrawBalance);
router.put("/delete/:id", deleteUser);
router.put("/", updateUser);
// Ruta genérica al final
router.get("/:id", getUserById);

module.exports = router