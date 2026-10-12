
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

const employeeSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        department: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

const Employee = mongoose.model("Employee", employeeSchema);

app.get("/health", (req, res) => {
    res.json({
        service: "employee-service",
        status: "ok"
    });
});

app.post("/employees", async (req, res) => {
    try {
        const employee = await Employee.create(req.body);

        return res.status(201).json(employee);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Employee ID or email already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Failed to create employee"
        });
    }
});

app.get("/employees", async (req, res) => {
    try {
        const employees = await Employee.find().lean();

        return res.json(employees);
    } catch {
        return res.status(500).json({
            message: "Failed to retrieve employees"
        });
    }
});

app.get("/employees/:id", async (req, res) => {
    try {
        const employee = await Employee.findOne({
            employeeId: req.params.id
        }).lean();

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json(employee);
    } catch {
        return res.status(500).json({
            message: "Failed to retrieve employee"
        });
    }
});

app.patch("/employees/:id", async (req, res) => {
    try {
        const allowedFields = ["name", "email", "department"];
        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided"
            });
        }

        const employee = await Employee.findOneAndUpdate(
            { employeeId: req.params.id },
            updates,
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.json(employee);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Failed to update employee"
        });
    }
});

app.delete("/employees/:id", async (req, res) => {
    try {
        const employee = await Employee.findOneAndDelete({
            employeeId: req.params.id
        });

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        return res.status(204).send();
    } catch {
        return res.status(500).json({
            message: "Failed to delete employee"
        });
    }
});

const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        app.listen(PORT, () => {
            console.log(`Employee Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
}

startServer();
