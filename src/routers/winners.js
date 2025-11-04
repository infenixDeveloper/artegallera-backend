const { Router } = require("express");
const router = Router();
const { validateToken } = require("../middlewares/validateToken.js");
const { getAllWinner, getWinnerByEvent, getEarningsByEvent, getTotalAmountByEvent } = require("../controllers/winnerController.js");

router.get("/", validateToken, getAllWinner)
router.get("/total-earnings/:id", getEarningsByEvent)
router.get("/event/:id", getWinnerByEvent)
router.get("/total-amount/:id", getTotalAmountByEvent)



module.exports = router;