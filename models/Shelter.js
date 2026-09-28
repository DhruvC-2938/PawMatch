const mongoose = require("mongoose");

const shelterSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        address: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Shelter", shelterSchema);