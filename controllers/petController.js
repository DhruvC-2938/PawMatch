const Pet = require("../models/Pet");

const createPet = async (req, res) => {
    try {
        const {
            name,
            species,
            breed,
            age,
            gender,
            description,
            shelterId
        } = req.body;

        let photoUrl = "";

        // If an image was uploaded
        if (req.file) {
            photoUrl = `/uploads/${req.file.filename}`;
        }

        const pet = await Pet.create({
            name,
            species,
            breed,
            age,
            gender,
            description,
            photoUrl,
            shelterId
        });

        res.status(201).json({
            message: "Pet created successfully",
            pet
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating pet",
            error: error.message
        });
    }
};

const getPets = async (req, res) => {
    try {
        const pets = await Pet.find();

        res.status(200).json({
            success: true,
            count: pets.length,
            pets,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pets",
            error: error.message,
        });
    }
};

const getPetById = async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        res.status(200).json({
            success: true,
            pet,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pet",
            error: error.message,
        });
    }
};

const updatePet = async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Pet updated successfully",
            pet,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update pet",
            error: error.message,
        });
    }
};

const deletePet = async (req, res) => {
    try {
        const pet = await Pet.findByIdAndDelete(req.params.id);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Pet deleted successfully",
            pet,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete pet",
            error: error.message,
        });
    }
};
const searchPets = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: "Keyword is required",
            });
        }

        const pets = await Pet.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { species: { $regex: keyword, $options: "i" } },
                { breed: { $regex: keyword, $options: "i" } },
            ],
        });

        res.status(200).json({
            success: true,
            count: pets.length,
            pets,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Search failed",
            error: error.message,
        });
    }
};

module.exports = {
    createPet,
    getPets,
    getPetById,
    updatePet,
    deletePet,
    searchPets,
};