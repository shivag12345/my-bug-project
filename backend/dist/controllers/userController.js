import bcrypt from "bcryptjs";
import { readSheet } from "read-excel-file/node";
import { env } from "../config/env.js";
import { roles, User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";
import { encryptSecret } from "../utils/secretCrypto.js";
import { mailService } from "../services/mailService.js";
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function smtpConfigured(smtp) {
    return Boolean(smtp?.enabled && smtp.host && smtp.user && smtp.passEncrypted);
}
function publicSmtp(user) {
    const smtp = user.smtp ?? {};
    return {
        enabled: Boolean(smtp.enabled),
        host: smtp.host ?? "",
        port: Number(smtp.port ?? 587),
        secure: Boolean(smtp.secure),
        user: smtp.user ?? "",
        fromName: smtp.fromName ?? "",
        hasPassword: Boolean(smtp.passEncrypted),
        configured: smtpConfigured(smtp)
    };
}
function sanitize(user, options = {}) {
    const data = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profileImage: user.profileImage,
        disabled: user.disabled,
        smtpConfigured: smtpConfigured(user.smtp),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
    if (options.includeSmtp)
        data.smtp = publicSmtp(user);
    return data;
}
function normalizeSmtpPort(value) {
    if (value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value)))
        return 587;
    const port = Number(value ?? 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new AppError(400, "SMTP port must be between 1 and 65535");
    }
    return port;
}
function trimString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function applySmtpConfig(user, input) {
    if (!input || typeof input !== "object")
        return;
    const data = input;
    user.smtp ??= {};
    if ("enabled" in data)
        user.smtp.enabled = Boolean(data.enabled);
    if ("host" in data)
        user.smtp.host = trimString(data.host);
    if ("port" in data)
        user.smtp.port = normalizeSmtpPort(data.port);
    if ("secure" in data)
        user.smtp.secure = Boolean(data.secure);
    if ("user" in data)
        user.smtp.user = trimString(data.user);
    if ("fromName" in data)
        user.smtp.fromName = trimString(data.fromName);
    if ("password" in data && typeof data.password === "string" && data.password.length > 0) {
        user.smtp.passEncrypted = encryptSecret(data.password);
    }
    user.smtp.port ||= 587;
    if (user.smtp.enabled && (!user.smtp.host || !user.smtp.user || !user.smtp.passEncrypted)) {
        throw new AppError(400, "SMTP host, username, and password are required when SMTP sender is enabled");
    }
}
function applyUserFields(user, data) {
    for (const field of ["name", "email", "role", "department", "profileImage", "disabled"]) {
        if (field in data)
            user[field] = data[field];
    }
}
function normalizeKey(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function stringifyCell(value) {
    if (value instanceof Date)
        return value.toISOString();
    return String(value ?? "").trim();
}
function cell(row, aliases) {
    const normalizedAliases = new Set(aliases.map(normalizeKey));
    const entry = Object.entries(row).find(([key]) => normalizedAliases.has(normalizeKey(key)));
    return entry ? entry[1] : "";
}
function parseRole(value) {
    if (!value)
        return "Developer";
    const normalized = normalizeKey(value);
    const match = roles.find((role) => normalizeKey(role) === normalized);
    if (match)
        return match;
    if (normalized === "dev")
        return "Developer";
    if (normalized === "qa" || normalized === "test")
        return "Tester";
    return null;
}
function parseBoolean(value) {
    return ["true", "yes", "y", "1", "disabled", "inactive"].includes(value.toLowerCase());
}
async function parseUserRows(file) {
    const worksheet = await readSheet(file.buffer);
    if (worksheet.length < 2)
        throw new AppError(400, "Excel file does not contain user rows");
    const headers = worksheet[0].map(stringifyCell);
    const rows = worksheet.slice(1);
    const parsed = [];
    const errors = [];
    rows.forEach((values, index) => {
        const rowNumber = index + 2;
        const row = headers.reduce((record, header, headerIndex) => {
            if (header)
                record[header] = stringifyCell(values[headerIndex]);
            return record;
        }, {});
        if (Object.values(row).every((value) => !value))
            return;
        const name = cell(row, ["name", "full name", "user name"]);
        const email = cell(row, ["email", "email address"]).toLowerCase();
        const password = cell(row, ["password", "temporary password", "temp password"]) || env.adminPassword;
        const department = cell(row, ["department", "dept"]);
        const role = parseRole(cell(row, ["role", "user role"]));
        const disabled = parseBoolean(cell(row, ["disabled", "inactive"]));
        if (!name) {
            errors.push({ row: rowNumber, email, message: "Name is required" });
            return;
        }
        if (!email) {
            errors.push({ row: rowNumber, message: "Email is required" });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ row: rowNumber, email, message: "Email is invalid" });
            return;
        }
        if (!role) {
            errors.push({ row: rowNumber, email, message: "Role must be Admin, Developer, or Tester" });
            return;
        }
        parsed.push({ row: rowNumber, name, email, password, role, department, disabled });
    });
    if (!parsed.length && !errors.length)
        throw new AppError(400, "Excel file does not contain user rows");
    return { parsed, errors };
}
export const userController = {
    list: (async (req, res) => {
        const users = await User.find().sort({ name: 1 });
        res.json(users.map((user) => sanitize(user, { includeSmtp: req.user?.role === "Admin" })));
    }),
    me: (async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user)
            throw new AppError(404, "User not found");
        res.json(sanitize(user, { includeSmtp: true }));
    }),
    get: (async (req, res) => {
        const user = await User.findById(req.params.id);
        if (!user)
            throw new AppError(404, "User not found");
        res.json(sanitize(user, { includeSmtp: req.user?.role === "Admin" || req.user?.id === user._id.toString() }));
    }),
    create: (async (req, res) => {
        const { password = env.adminPassword, smtp, ...data } = req.body;
        const user = new User({ ...data, passwordHash: await bcrypt.hash(password, 12) });
        applySmtpConfig(user, smtp);
        await user.save();
        await logActivity(req.user?.id, "User Created", "User", user._id.toString());
        res.status(201).json(sanitize(user, { includeSmtp: true }));
    }),
    importExcel: (async (req, res) => {
        if (!req.file)
            throw new AppError(400, "Excel file is required");
        const { parsed, errors } = await parseUserRows(req.file);
        const existingEmails = new Set(await User.find({ email: { $in: parsed.map((row) => row.email) } }).distinct("email"));
        const importedUsers = [];
        for (const row of parsed) {
            if (existingEmails.has(row.email)) {
                errors.push({ row: row.row, email: row.email, message: "Email already exists" });
                continue;
            }
            try {
                const user = await User.create({
                    name: row.name,
                    email: row.email,
                    passwordHash: await bcrypt.hash(row.password, 12),
                    role: row.role,
                    department: row.department,
                    disabled: row.disabled
                });
                existingEmails.add(row.email);
                importedUsers.push(sanitize(user));
            }
            catch (error) {
                errors.push({ row: row.row, email: row.email, message: error instanceof Error ? error.message : "User import failed" });
            }
        }
        if (importedUsers.length) {
            await logActivity(req.user?.id, "Users Imported", "User", undefined, { created: importedUsers.length, skipped: errors.length });
        }
        res.status(importedUsers.length ? 201 : 200).json({
            created: importedUsers.length,
            skipped: errors.length,
            errors,
            users: importedUsers
        });
    }),
    updateOwnSmtp: (async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user)
            throw new AppError(404, "User not found");
        applySmtpConfig(user, req.body.smtp ?? req.body);
        await user.save();
        await logActivity(req.user?.id, "SMTP Settings Updated", "User", user._id.toString());
        res.json(sanitize(user, { includeSmtp: true }));
    }),
    update: (async (req, res) => {
        const { password, smtp, ...data } = req.body;
        const user = await User.findById(req.params.id);
        if (!user)
            throw new AppError(404, "User not found");
        applyUserFields(user, data);
        if (password)
            user.passwordHash = await bcrypt.hash(password, 12);
        applySmtpConfig(user, smtp);
        await user.save();
        await logActivity(req.user?.id, password ? "Password Reset" : "User Updated", "User", user._id.toString());
        res.json(sanitize(user, { includeSmtp: true }));
    }),
    remove: (async (req, res) => {
        await User.findByIdAndDelete(req.params.id);
        await logActivity(req.user?.id, "User Deleted", "User", String(req.params.id));
        res.status(204).send();
    }),
    testSmtp: (async (req, res) => {
        const user = await User.findById(req.user.id);
        if (!user)
            throw new AppError(404, "User not found");
        const smtp = user.smtp;
        if (!smtp?.enabled || !smtp.host || !smtp.user || !smtp.passEncrypted) {
            throw new AppError(400, "SMTP sender is not fully configured. Please fill in host, username, password and enable it first.");
        }
        await mailService.send(user.email, "Bug Tracking – SMTP Test Email", `<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#1976d2;margin-top:0">&#10003; SMTP Configuration Working</h2>
        <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
        <p>Your personal SMTP sender is configured correctly on Bug Tracking.</p>
        <p>Emails (issue assignments, notifications, etc.) will automatically be sent <strong>from your email address</strong> (${escapeHtml(smtp.fromName || user.name)} &lt;${escapeHtml(smtp.user)}&gt;).</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="color:#888;font-size:12px">Tested at: ${new Date().toLocaleString()}</p>
      </div>`, { senderUserId: user._id.toString() });
        res.json({ message: `Test email sent to ${user.email}` });
    })
};
