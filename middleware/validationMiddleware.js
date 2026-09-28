const validateRequiredFields = (fields) => {
    return (req, res, next) => {
        const missingFields = [];

        fields.forEach((field) => {
            if (
                req.body[field] === undefined ||
                req.body[field] === null ||
                req.body[field] === ""
            ) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Required fields are missing",
                missingFields
            });
        }

        next();
    };
};

module.exports = {
    validateRequiredFields
};