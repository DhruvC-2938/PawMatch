const Shelter = require("../models/Shelter");

const createShelter = async (req, res) => {
    try {
        const shelter = await Shelter.create(req.body);

        res.status(201).json({
            success: true,
            message: "Shelter created successfully",
            shelter,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create shelter",
            error: error.message,
        });
    }
};

module.exports = {
    createShelter,
};