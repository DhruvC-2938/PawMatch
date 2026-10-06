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

router.get("/", getPets);

router.get("/search", searchPets);

router.get("/:id", getPetById);

router.put(
    "/:id",
    protect,
    authorizeRole("shelter"),
    updatePet
);

router.delete(
    "/:id",
    protect,
    authorizeRole("shelter"),
    deletePet
);

module.exports = router;