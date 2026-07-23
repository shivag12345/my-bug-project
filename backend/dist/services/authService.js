import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { mailService } from "./mailService.js";
function signAccess(user) {
    return jwt.sign(user, env.accessSecret, { expiresIn: env.accessTtl });
}
function signRefresh(user) {
    return jwt.sign(user, env.refreshSecret, { expiresIn: env.refreshTtl });
}
function publicUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profileImage: user.profileImage,
        disabled: user.disabled
    };
}
export const authService = {
    async me(id) {
        const user = await User.findById(id);
        if (!user || user.disabled)
            throw new AppError(401, "Invalid or disabled user");
        return publicUser(user);
    },
    async register(data) {
        const exists = await User.exists({ email: data.email.toLowerCase() });
        if (exists)
            throw new AppError(409, "Email already registered");
        const passwordHash = await bcrypt.hash(data.password, 12);
        const user = await User.create({ ...data, passwordHash });
        return publicUser(user);
    },
    async login(email, password) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || user.disabled)
            throw new AppError(401, "Invalid credentials");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new AppError(401, "Invalid credentials");
        const payload = { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
        const accessToken = signAccess(payload);
        const refreshToken = signRefresh(payload);
        user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
        await user.save();
        return { user: publicUser(user), accessToken, refreshToken };
    },
    async refresh(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, env.refreshSecret);
            const user = await User.findById(payload.id);
            if (!user || user.disabled || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
                throw new AppError(401, "Invalid refresh token");
            }
            return { accessToken: signAccess({ id: user._id.toString(), email: user.email, name: user.name, role: user.role }) };
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            throw new AppError(401, "Invalid refresh token");
        }
    },
    async forgotPassword(email) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log("Password reset requested for unknown email:", email);
            return;
        }
        const token = crypto.randomBytes(32).toString("hex");
        user.resetTokenHash = await bcrypt.hash(token, 12);
        user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await user.save();
        console.log("PASSWORD RESET TOKEN");
        console.log("User:", user.email);
        console.log("Token:", token);
        console.log("Expires:", user.resetTokenExpiresAt);
        try {
            await mailService.send(user.email, "Bug Tracking password reset", `<p>Use this reset token:</p><code>${token}</code>`);
        }
        catch (error) {
            console.error("Failed to send password reset email:", error);
        }
    },
    async resetPassword(token, password) {
        const users = await User.find({ resetTokenExpiresAt: { $gt: new Date() }, resetTokenHash: { $ne: "" } });
        let user = null;
        for (const candidate of users) {
            if (await bcrypt.compare(token, candidate.resetTokenHash)) {
                user = candidate;
                break;
            }
        }
        if (!user)
            throw new AppError(400, "Invalid or expired reset token");
        user.passwordHash = await bcrypt.hash(password, 12);
        user.resetTokenHash = "";
        user.resetTokenExpiresAt = undefined;
        await user.save();
    }
};
