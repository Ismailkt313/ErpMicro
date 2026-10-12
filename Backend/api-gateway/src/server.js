
require("dotenv").config();

const express = require("express");

const app = express();

app.use(express.json());

const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL;
const attendanceServiceUrl = process.env.ATTENDANCE_SERVICE_URL;

app.get("/health", (req, res) => {
    res.json({ service: "api-gateway", status: "running" });
});

app.get("/api/employees", async (req, res) => {
    try {
        const response = await fetch(`${employeeServiceUrl}/employees`);
        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Employee Service unavailable" });
    }
});

app.post("/api/employees", async (req, res) => {
    try {
        const response = await fetch(`${employeeServiceUrl}/employees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Employee Service unavailable" });
    }
});

app.get("/api/employees/:id", async (req, res) => {
    try {
        const response = await fetch(
            `${employeeServiceUrl}/employees/${req.params.id}`
        );

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Employee Service unavailable" });
    }
});

app.get("/api/attendance", async (req, res) => {
    try {
        const response = await fetch(`${attendanceServiceUrl}/attendance`);
        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Attendance Service unavailable" });
    }
});

app.post("/api/attendance", async (req, res) => {
    try {
        const response = await fetch(`${attendanceServiceUrl}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Attendance Service unavailable" });
    }
});

app.get("/api/attendance/:employeeId/details", async (req, res) => {
    try {
        const response = await fetch(
            `${attendanceServiceUrl}/attendance/${req.params.employeeId}/details`
        );

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ message: "Attendance Service unavailable" });
    }
});

app.listen(process.env.PORT || 5000, () => {
    console.log("API Gateway running on port 5000");
});
