const express = require("express");

const {
    createShelter
} = require("../controllers/shelterController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// Create a shelter
// Only authenticated shelter users can create shelters
router.post(
    "/",
    protect,
    authorizeRole("shelter"),
    createShelter
);

module.exports = router;