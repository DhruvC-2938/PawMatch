const Application = require("../models/Application");
const Pet = require("../models/Pet");

const createApplication = async (req, res) => {
    try {
        const { petId, message } = req.body;

        // Check whether pet exists
        const pet = await Pet.findById(petId);

        if (!pet) {
            return res.status(404).json({
                success: false,
                message: "Pet not found",
            });
        }

        // Create application
        const application = await Application.create({
            adopterId: req.user.userId,
            petId: pet._id,
            shelterId: pet.shelterId,
            message,
        });

        res.status(201).json({
            success: true,
            message: "Adoption application submitted successfully",
            application,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to submit application",
            error: error.message,
        });
    }
};
const getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({
            adopterId: req.user.userId,
        })
            .populate("petId")
            .populate("shelterId");

        res.status(200).json({
            success: true,
            count: applications.length,
            applications,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch applications",
            error: error.message,
        });
    }
};
const getUserApplications = async (req, res) => {
    try {
        const userId = req.params.id;

        // User can only access their own applications
        if (userId !== req.user.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own applications",
            });
        }

        const applications = await Application.find({
            adopterId: userId,
        })
            .populate("petId")
            .populate("shelterId");

        res.status(200).json({
            success: true,
            count: applications.length,
            applications,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch user applications",
            error: error.message,
        });
    }
};
const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = ["pending", "approved", "rejected"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            application,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update application status",
            error: error.message,
        });
    }
};
module.exports = {
    createApplication,
    getMyApplications,
    getUserApplications,
    updateApplicationStatus,
};