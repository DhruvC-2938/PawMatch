const Pet = require("../models/Pet");

// Create a pet
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

        const pet = await Pet.create({
            name,
            species,
            breed,
            age,
            gender,
            description,
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

// Get all pets
const getPets = async (req, res) => {
    try {
        const pets = await Pet.find();

        res.status(200).json({
            success: true,
            count: pets.length,
            pets
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching pets",
            error: error.message
        });
    }
};

// Get pet by ID
const getPetById = async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({
                message: "Pet not found"
            });
        }

        res.status(200).json({
            success: true,
            pet
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching pet",
            error: error.message
        });
    }
};

// Update pet
const updatePet = async (req, res) => {
    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!pet) {
            return res.status(404).json({
                message: "Pet not found"
            });
        }

        res.status(200).json({
            success: true,
            pet
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating pet",
            error: error.message
        });
    }
};

// Delete pet
const deletePet = async (req, res) => {
    try {
        const pet = await Pet.findByIdAndDelete(req.params.id);

        if (!pet) {
            return res.status(404).json({
                message: "Pet not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Pet deleted successfully",
            pet
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting pet",
            error: error.message
        });
    }
};

// Search pets
const searchPets = async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({
                message: "Keyword is required"
            });
        }

        const pets = await Pet.find({
            $or: [
                { name: { $regex: keyword, $options: "i" } },
                { species: { $regex: keyword, $options: "i" } },
                { breed: { $regex: keyword, $options: "i" } }
            ]
        });

        res.status(200).json({
            success: true,
            count: pets.length,
            pets
        });
    } catch (error) {
        res.status(500).json({
            message: "Error searching pets",
            error: error.message
        });
    }
};

module.exports = {
    createPet,
    getPets,
    getPetById,
    updatePet,
    deletePet,
    searchPets
};