const { Router } = require("express");
const router = Router();
const { GetAll, GetId, Create, Update, Delete, GetBetsByTeam, getBetsByRound, getMarriedBetting, getReportsTransactions, getTransactionsByUsersAndEvent, getEventByUsersAndEvent, generatePDF } = require("../controllers/bettingController.js");
const { validateToken } = require("../middlewares/validateToken.js");

router.get("/pdf/listAmountTransactions/:id_user/:id_event", generatePDF)
router.get("/", validateToken, GetAll)
router.get("/:id", validateToken, GetId)
router.get("/rounds/:id", validateToken, getBetsByRound);
router.get("/married/:id_event/:id_round", validateToken, getMarriedBetting);
router.post("/create", validateToken, Create);
router.post("/update/:id", validateToken, Update);
router.post("/delete/:id", validateToken, Delete);
router.post("/amount/", validateToken, GetBetsByTeam);
router.get("/report/car/:id_user/:id_event", getTransactionsByUsersAndEvent);
router.get("/report/range", getReportsTransactions);
router.get("/report/event/:id_user", getEventByUsersAndEvent);



module.exports = router;