const User = require("../models/User");
const jwt = require("jsonwebtoken");

const FIREBASE_SIGNUP_URL =
    "https://identitytoolkit.googleapis.com/v1/accounts:signUp";

const FIREBASE_LOGIN_URL =
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

// REGISTER
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Check if user already exists in MongoDB
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Create user in Firebase Authentication
        const firebaseResponse = await fetch(
            `${FIREBASE_SIGNUP_URL}?key=${process.env.FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true
                })
            }
        );

        const firebaseData = await firebaseResponse.json();

        if (!firebaseResponse.ok) {
            return res.status(400).json({
                message: "Firebase registration failed",
                error: firebaseData.error?.message
            });
        }

        // Save user profile in MongoDB
        const user = await User.create({
            firebaseUid: firebaseData.localId,
            name,
            email,
            role: role || "adopter"
        });

        // Create our backend JWT
        const token = jwt.sign(
            {
                userId: user._id,
                firebaseUid: user.firebaseUid,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                firebaseUid: user.firebaseUid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Register error:", error);

        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


// LOGIN
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Authenticate using Firebase
        const firebaseResponse = await fetch(
            `${FIREBASE_LOGIN_URL}?key=${process.env.FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true
                })
            }
        );

        const firebaseData = await firebaseResponse.json();

        if (!firebaseResponse.ok) {
            return res.status(401).json({
                message: "Invalid email or password",
                error: firebaseData.error?.message
            });
        }

        // Find corresponding PawMatch user
        const user = await User.findOne({
            firebaseUid: firebaseData.localId
        });

        if (!user) {
            return res.status(404).json({
                message: "PawMatch user profile not found"
            });
        }

        // Create backend JWT
        const token = jwt.sign(
            {
                userId: user._id,
                firebaseUid: user.firebaseUid,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                firebaseUid: user.firebaseUid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


// PROFILE
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            id: user._id,
            firebaseUid: user.firebaseUid,
            name: user.name,
            email: user.email,
            role: user.role
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


module.exports = {
    registerUser,
    loginUser,
    getProfile
};