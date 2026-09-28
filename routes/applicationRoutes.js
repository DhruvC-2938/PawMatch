const express = require("express");

const {
    createApplication,
    getMyApplications,
    getUserApplications,
    updateApplicationStatus,
} = require("../controllers/applicationController");

const protect = require("../middleware/authMiddleware");
const authorizeRole = require("../middleware/roleMiddleware");
const {
    validateRequiredFields
} = require("../middleware/validationMiddleware");

const router = express.Router();

router.post(
    "/",
    protect,
    validateRequiredFields(["petId"]),
    createApplication
);

router.get("/my", protect, getMyApplications);

router.get("/user/:id", protect, getUserApplications);



router.put(
    "/:id/status",
    protect,
    authorizeRole("shelter"),
    validateRequiredFields(["status"]),
    updateApplicationStatus
);

module.exports = router;