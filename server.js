const express = require("express");
app.use("/uploads", express.static("uploads"));
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const petRoutes = require("./routes/petRoutes");
const shelterRoutes = require("./routes/shelterRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api/pets", petRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Atlas connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });