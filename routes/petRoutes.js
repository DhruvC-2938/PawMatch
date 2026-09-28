const express = require("express");
const router = express.Router();

const {
    createPet,
    getPets,
    getPetById,
    updatePet,
    deletePet,
    searchPets
} = require("../controllers/petController");

const upload = require("../middleware/uploadMiddleware");

const {
    validateRequiredFields
} = require("../middleware/validationMiddleware");


// CREATE PET
router.post(
    "/",
    upload.single("photo"),
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


// GET ALL PETS
router.get("/", getPets);


// SEARCH PETS
// IMPORTANT: keep this before /:id
router.get("/search", searchPets);


// GET PET BY ID
router.get("/:id", getPetById);


// UPDATE PET
router.put("/:id", updatePet);


// DELETE PET
router.delete("/:id", deletePet);


module.exports = router;