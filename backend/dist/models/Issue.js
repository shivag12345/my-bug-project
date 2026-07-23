import mongoose, { Schema } from "mongoose";
export const issueTypes = ["Bug", "Task", "Story", "Improvement"];
export const issuePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const issueSeverities = ["MINOR", "MAJOR", "CRITICAL", "BLOCKER"];
export const issueStatuses = ["OPEN", "BUG_BUCKET", "ASSIGNED", "IN_PROGRESS", "FIXED", "READY_FOR_TESTING", "REOPENED", "CLOSED"];
export const issueCategories = ["UI Bug", "Backend Bug", "API Bug", "Database Bug", "Performance Bug", "Security Bug", "Mobile Bug", "Enhancement Request"];
export const issueModulePages = ["Login Page", "Dashboard", "Reports", "User Management", "API", "Database", "Mobile UI", "Notifications", "Authentication", "Chat", "File Upload"];
const issueSchema = new Schema({
    issueNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: issueTypes, default: "Bug" },
    category: { type: String, enum: issueCategories, required: true },
    modulePage: { type: String, enum: issueModulePages, required: true, default: "Login Page" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: issuePriorities, default: "MEDIUM" },
    severity: { type: String, enum: issueSeverities, default: "MAJOR" },
    status: { type: String, enum: issueStatuses, default: "OPEN" },
    labels: [{ type: String, trim: true }],
    attachments: [{ type: String }],
    dueDate: { type: Date },
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });
export const Issue = mongoose.model("Issue", issueSchema);
