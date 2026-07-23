import { Issue } from "../models/Issue.js";
import { Project } from "../models/Project.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { AppError } from "../middleware/errorHandler.js";
import { emitNotification } from "../realtime/socket.js";
import { logActivity } from "./activityService.js";
import { mailService } from "./mailService.js";
import { visibleIssueFilter } from "./issueVisibility.js";
async function cleanupOldNotifications(userId) {
    const userNotifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(5);
    if (userNotifications.length > 0) {
        const oldIds = userNotifications.map((n) => n._id);
        await Notification.deleteMany({ _id: { $in: oldIds } });
    }
}
async function nextIssueNumber(projectId) {
    const project = await Project.findById(projectId);
    if (!project)
        throw new AppError(404, "Project not found");
    const count = await Issue.countDocuments({ project: projectId });
    return `${project.key}-${count + 1}`;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function senderOptions(sender) {
    return {
        senderUserId: sender.id,
        fromName: `${sender.name} via Bug Tracking`,
        replyTo: sender.email
    };
}
function idString(value) {
    if (value && typeof value === "object" && "_id" in value)
        return String(value._id);
    return String(value ?? "");
}
async function notifyAssignee(assignee, issueId, title, options = {}) {
    if (!assignee)
        return;
    const user = await User.findById(assignee);
    if (!user)
        return;
    const notification = await Notification.create({
        user: assignee,
        title: "Issue Assigned",
        message: title,
        type: "Issue Assigned",
        entity: issueId
    });
    emitNotification(assignee, notification);
    await cleanupOldNotifications(assignee);
    if (options.sendEmail === false)
        return;
    await mailService.send(user.email, "Bug Tracking issue assigned", `
      <div style="font-family:Arial,sans-serif">
        <h2>New Issue Assigned</h2>

        <p>Hello ${escapeHtml(user.name)},</p>

        <p>You have been assigned a new issue.</p>

        <table border="1" cellpadding="10" cellspacing="0">
          <tr>
            <td><strong>Issue</strong></td>
            <td>${escapeHtml(title)}</td>
          </tr>
        </table>

        <br/>

        <p>Please login to Bug Tracking and start working on the issue.</p>
      </div>
    `, options.sender ? senderOptions(options.sender) : { fromName: "Bug Tracking" });
}
async function notifyUsers(filter, title, message, type, issueId) {
    const users = await User.find(filter).select("_id email");
    for (const user of users) {
        const notification = await Notification.create({ user: user._id, title, message, type, entity: issueId });
        emitNotification(user._id.toString(), notification);
        await cleanupOldNotifications(user._id.toString());
    }
}
async function developerFilterForIssue(issue, assignee) {
    if (assignee) {
        return {
            _id: assignee,
            role: "Developer",
            disabled: { $ne: true }
        };
    }
    const projectId = idString(issue.project);
    const project = projectId ? await Project.findById(projectId).select("members").lean() : null;
    return {
        _id: { $in: project?.members ?? [] },
        role: "Developer",
        disabled: { $ne: true }
    };
}
async function emailDevelopersAboutTesterIssue(issue, reporter, assignee) {
    if (reporter.role !== "Tester")
        return;
    const developers = await User.find(await developerFilterForIssue(issue, assignee)).select("email name");
    if (!developers.length)
        return;
    const isBucketIssue = issue.status === "BUG_BUCKET";
    const subject = `${isBucketIssue ? "New Bug in Bucket" : "New Issue Assigned"} - ${issue.issueNumber}`;
    for (const developer of developers) {
        const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px">
        <h2 style="color:#1976d2">${isBucketIssue ? "New Bug in Bucket" : "New Issue Assigned"}</h2>

        <p>Hello <strong>${escapeHtml(developer.name)}</strong>,</p>

        <p>A new issue has been created by the tester and ${isBucketIssue ? "added to the developer bug bucket." : "assigned to you."}</p>

        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%">
          <tr>
            <td><strong>Issue Number</strong></td>
            <td>${escapeHtml(issue.issueNumber)}</td>
          </tr>
          <tr>
            <td><strong>Title</strong></td>
            <td>${escapeHtml(issue.title)}</td>
          </tr>
          <tr>
            <td><strong>Status</strong></td>
            <td>${escapeHtml(issue.status)}</td>
          </tr>
          <tr>
            <td><strong>Category</strong></td>
            <td>${escapeHtml(issue.category)}</td>
          </tr>
          <tr>
            <td><strong>Priority</strong></td>
            <td>${escapeHtml(issue.priority)}</td>
          </tr>
          <tr>
            <td><strong>Reporter</strong></td>
            <td>${escapeHtml(reporter.name)} (${escapeHtml(reporter.email)})</td>
          </tr>
        </table>

        ${issue.description
            ? `
          <h3>Description</h3>
          <div style="background:#f5f5f5;padding:15px;border-radius:6px">
            ${escapeHtml(issue.description).replace(/\n/g, "<br/>")}
          </div>
        `
            : ""}

        <br/>

        <p>Please login to the Bug Tracker and start working on this issue.</p>
      </div>
    `;
        await mailService.send(developer.email, subject, html, senderOptions(reporter));
    }
}
export const issueService = {
    async create(data, user) {
        const payload = { ...data };
        if (user.role === "Admin") {
            delete payload.priority;
            delete payload.severity;
            delete payload.status;
            delete payload.labels;
            delete payload.dueDate;
        }
        if (user.role === "Tester") {
            delete payload.severity;
            delete payload.labels;
            delete payload.assignee;
            payload.status = "BUG_BUCKET";
        }
        const status = payload.status ?? (payload.assignee ? "ASSIGNED" : "OPEN");
        const issue = await Issue.create({
            ...payload,
            status,
            reporter: user.id,
            assignedBy: payload.assignee ? user.id : undefined,
            issueNumber: await nextIssueNumber(payload.project)
        });
        await logActivity(user.id, "Issue Created", "Issue", issue._id.toString(), { title: issue.title });
        await notifyUsers({ role: "Admin", disabled: { $ne: true } }, "Issue Created", issue.title, "Issue Created", issue._id.toString());
        if (user.role === "Tester") {
            await emailDevelopersAboutTesterIssue(issue, user, payload.assignee);
            await notifyUsers(await developerFilterForIssue(issue, payload.assignee), "Bug Bucket", issue.title, "Issue Created", issue._id.toString());
        }
        else {
            await notifyAssignee(payload.assignee, issue._id.toString(), issue.title, { sender: user });
        }
        return issue;
    },
    async update(id, data, user) {
        const before = await Issue.findOne(await visibleIssueFilter(user, { _id: id }));
        if (!before)
            throw new AppError(404, "Issue not found");
        const update = { ...data };
        if (user.role === "Admin") {
            delete update.priority;
            delete update.severity;
            delete update.status;
            delete update.labels;
            delete update.dueDate;
        }
        if (user.role === "Tester") {
            delete update.severity;
            delete update.labels;
            delete update.assignee;
        }
        if (user.role === "Developer" && before.status === "BUG_BUCKET" && !before.assignee && update.status && update.status !== "BUG_BUCKET") {
            update.assignee = user.id;
            update.assignedBy = user.id;
        }
        if (update.assignee && update.assignee !== String(before.assignee)) {
            update.assignedBy = user.id;
            if (!update.status)
                update.status = "ASSIGNED";
        }
        const issue = await Issue.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        if (update.status && update.status !== before.status) {
            await logActivity(user.id, "Status Changed", "Issue", id, { from: before.status, to: update.status });
            if (update.status === "READY_FOR_TESTING")
                await notifyUsers({ _id: before.reporter }, "Ready For Testing", before.title, "Status Changed", id);
            if (update.status === "REOPENED" && before.assignee)
                await notifyUsers({ _id: before.assignee }, "Issue Reopened", before.title, "Status Changed", id);
            if (update.status === "CLOSED")
                await notifyUsers({ role: "Admin", disabled: { $ne: true } }, "Issue Closed", before.title, "Status Changed", id);
            for (const watcher of before.watchers) {
                await Notification.create({ user: watcher, title: "Status Changed", message: `${before.issueNumber} moved to ${update.status}`, type: "Status Changed", entity: id });
                await cleanupOldNotifications(watcher.toString());
            }
        }
        else if (update.assignee && update.assignee !== String(before.assignee)) {
            await logActivity(user.id, "Assignment Changed", "Issue", id, { assignee: update.assignee });
            await notifyAssignee(update.assignee, id, before.title, { sender: user });
        }
        else {
            await logActivity(user.id, "Issue Updated", "Issue", id);
        }
        return issue;
    }
};
export { cleanupOldNotifications };
