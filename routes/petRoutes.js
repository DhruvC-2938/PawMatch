const express = require("express");

const {
    createPet,
    getPets,
    getPetById,
    updatePet,
    deletePet,
    searchPets
} = require("../controllers/petController");

const protect = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");
const { validateRequiredFields } = require("../middleware/validationMiddleware");

const router = express.Router();

// Create a pet
// Only authenticated shelter users can create pets
router.post(
    "/",
    protect,
    authorizeRole("shelter"),
    validateRequiredFields([
        "name",
        "species",
        "breed",
        "age",
        "gender",
        "shelterId"
    ]),
    createPet
);

// Get all pets
router.get("/", getPets);

// Search pets
// Keep this BEFORE /:id
router.get("/search", searchPets);

// Get pet by ID
router.get("/:id", getPetById);

// Update pet
// Only authenticated shelter users can update pets
router.put(
    "/:id",
    protect,
    authorizeRole("shelter"),
    updatePet
);

// Delete pet
// Only authenticated shelter users can delete pets
router.delete(
    "/:id",
    protect,
    authorizeRole("shelter"),
    deletePet
);

module.exports = router;