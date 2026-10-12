require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL;

const attendanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
        },
        checkIn: {
            type: Date,
            required: true,
            default: Date.now,
        },
        checkOut: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

async function getEmployee(employeeId) {
    const response = await fetch(
        `${employeeServiceUrl}/employees/${encodeURIComponent(employeeId)}`,
        { signal: AbortSignal.timeout(3000) }
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Employee Service returned ${response.status}`);
    }

    return response.json();
}

app.get("/health", (req, res) => {
    res.json({
        service: "attendance-service",
        status: "running",
    });
});

app.post("/attendance", async (req, res) => {
    try {
        const { employeeId, date, checkIn, checkOut } = req.body;

        if (!employeeId) {
            return res.status(400).json({
                message: "employeeId is required",
            });
        }

        let employee;

        try {
            employee = await getEmployee(employeeId);
        } catch (error) {
            return res.status(503).json({
                message: "Employee Service is unavailable",
            });
        }

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const attendanceDate = date ? new Date(date) : new Date();

        if (Number.isNaN(attendanceDate.getTime())) {
            return res.status(400).json({
                message: "Invalid date",
            });
        }

        attendanceDate.setUTCHours(0, 0, 0, 0);

        const record = await Attendance.create({
            employeeId: String(employeeId).trim(),
            date: attendanceDate,
            ...(checkIn ? { checkIn: new Date(checkIn) } : {}),
            ...(checkOut ? { checkOut: new Date(checkOut) } : {}),
        });

        return res.status(201).json({
            message: "Attendance created successfully",
            attendance: record,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Attendance already exists for this employee on this date",
            });
        }

        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid attendance data",
            });
        }

        return res.status(500).json({
            message: "Internal server error",
        });
    }
});

app.get("/attendance", async (req, res) => {
    try {
        const records = await Attendance.find().sort({ date: -1 }).lean();

        res.json(records);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve attendance records",
        });
    }
});

app.get("/attendance/:employeeId/details", async (req, res) => {
    try {
        const { employeeId } = req.params;

        let employee;

        try {
            employee = await getEmployee(employeeId);
        } catch (error) {
            return res.status(503).json({
                message: "Employee Service is unavailable",
            });
        }

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }

        const records = await Attendance.find({ employeeId })
            .sort({ date: -1 })
            .lean();

        res.json({
            employee,
            attendance: records,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve employee attendance details",
        });
    }
});

app.get("/attendance/:employeeId", async (req, res) => {
    try {
        const records = await Attendance.find({
            employeeId: req.params.employeeId,
        })
            .sort({ date: -1 })
            .lean();

        res.json(records);
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve employee attendance",
        });
    }
});

app.patch("/attendance/:id/checkout", async (req, res) => {
    try {
        const record = await Attendance.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                message: "Attendance record not found",
            });
        }

        if (record.checkOut) {
            return res.status(409).json({
                message: "Employee has already checked out",
            });
        }

        record.checkOut = new Date();
        await record.save();

        res.json({
            message: "Check-out recorded successfully",
            attendance: record,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to record check-out",
        });
    }
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        app.listen(process.env.PORT || 5002, () => {
            console.log("Attendance Service running on port 5002");
        });
    } catch (error) {
        console.error("Attendance Service failed to start");
        process.exit(1);
    }
}

startServer();