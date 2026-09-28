const express = require("express");
const { createShelter } = require("../controllers/shelterController");

const router = express.Router();

router.post("/", createShelter);

module.exports = router;