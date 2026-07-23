import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { decryptSecret } from "../utils/secretCrypto.js";
async function userSmtpSender(userId) {
    if (!userId)
        return null;
    const user = await User.findById(userId).select("name smtp");
    if (!user)
        return null;
    const smtp = user.smtp;
    if (!smtp?.enabled || !smtp.host || !smtp.user || !smtp.passEncrypted)
        return null;
    const pass = decryptSecret(smtp.passEncrypted);
    if (!pass)
        return null;
    return {
        host: smtp.host,
        port: smtp.port || 587,
        secure: Boolean(smtp.secure),
        user: smtp.user,
        pass,
        fromName: smtp.fromName || user.name
    };
}
async function defaultSmtpSender() {
    if (env.smtp.host && env.smtp.user && env.smtp.pass) {
        return {
            host: env.smtp.host,
            port: env.smtp.port,
            secure: env.smtp.secure,
            user: env.smtp.user,
            pass: env.smtp.pass
        };
    }
    // Fall back to Admin's SMTP configuration from database
    const admin = await User.findOne({ role: "Admin", email: env.adminEmail }).select("name smtp");
    if (admin && admin.smtp?.enabled && admin.smtp.host && admin.smtp.user && admin.smtp.passEncrypted) {
        const pass = decryptSecret(admin.smtp.passEncrypted);
        if (pass) {
            return {
                host: admin.smtp.host,
                port: admin.smtp.port || 587,
                secure: Boolean(admin.smtp.secure),
                user: admin.smtp.user,
                pass,
                fromName: admin.smtp.fromName || admin.name
            };
        }
    }
    // Fall back to any Admin's SMTP configuration
    const anyAdmin = await User.findOne({ role: "Admin", "smtp.enabled": true }).select("name smtp");
    if (anyAdmin && anyAdmin.smtp?.host && anyAdmin.smtp.user && anyAdmin.smtp.passEncrypted) {
        const pass = decryptSecret(anyAdmin.smtp.passEncrypted);
        if (pass) {
            return {
                host: anyAdmin.smtp.host,
                port: anyAdmin.smtp.port || 587,
                secure: Boolean(anyAdmin.smtp.secure),
                user: anyAdmin.smtp.user,
                pass,
                fromName: anyAdmin.smtp.fromName || anyAdmin.name
            };
        }
    }
    return null;
}
function logEmailToFile(to, subject, html, status) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const workspaceRootLog = path.resolve(__dirname, "../../../emails.log");
        const cleanHtml = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const logEntry = [
            `================================================================`,
            `Date: ${new Date().toISOString()}`,
            `Status: ${status}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content (HTML):`,
            html,
            `Content (Text):`,
            cleanHtml,
            `================================================================\n\n`
        ].join("\n");
        fs.appendFileSync(workspaceRootLog, logEntry, "utf8");
        console.log(`[Email Logged to Workspace Root] -> ${workspaceRootLog}`);
    }
    catch (err) {
        console.error("Failed to log email to file:", err);
    }
}
export const mailService = {
    async send(to, subject, html, options = {}) {
        const sender = (await userSmtpSender(options.senderUserId)) ?? (await defaultSmtpSender());
        if (!sender) {
            console.log(`[email skipped] ${to} | ${subject}`);
            logEmailToFile(to, subject, html, "SKIPPED (No SMTP configured)");
            return;
        }
        const transporter = nodemailer.createTransport({
            host: sender.host,
            port: sender.port,
            secure: sender.secure,
            auth: {
                user: sender.user,
                pass: sender.pass
            }
        });
        try {
            const fromName = options.fromName ?? sender.fromName;
            const info = await transporter.sendMail({
                from: fromName ? { name: fromName, address: sender.user } : sender.user,
                replyTo: options.replyTo,
                to,
                subject,
                html
            });
            console.log("Email sent:", info.messageId);
            logEmailToFile(to, subject, html, `SENT (Message ID: ${info.messageId})`);
        }
        catch (error) {
            console.error("SMTP Error:", error);
            logEmailToFile(to, subject, html, `FAILED (SMTP Error: ${error instanceof Error ? error.message : String(error)})`);
            throw error;
        }
    }
};
export const sendIssueAssignedEmail = async ({ developerEmail, developerName, issueTitle, issueDescription, testerName }) => {
    await mailService.send(developerEmail, `New Issue Assigned - ${issueTitle}`, `
    <div style="font-family:Arial,sans-serif">
      <h2>New Issue Assigned</h2>

      <p>Hello ${developerName},</p>

      <p>A new issue has been assigned to you.</p>

      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <td><strong>Issue Title</strong></td>
          <td>${issueTitle}</td>
        </tr>

        <tr>
          <td><strong>Description</strong></td>
          <td>${issueDescription}</td>
        </tr>

        <tr>
          <td><strong>Reported By</strong></td>
          <td>${testerName}</td>
        </tr>
      </table>

      <br/>

      <p>Please login and start working on this issue.</p>
    </div>
    `, {
        fromName: "Bug Tracker"
    });
};
