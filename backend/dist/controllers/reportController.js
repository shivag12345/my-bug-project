import { Issue } from "../models/Issue.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { combineIssueFilters, visibleIssueFilter } from "../services/issueVisibility.js";
function matchVisibleIssues(filter) {
    return Object.keys(filter).length ? [{ $match: filter }] : [];
}
export const reportController = {
    dashboard: (async (req, res) => {
        const visibility = await visibleIssueFilter(req.user);
        const statusFilter = (status) => combineIssueFilters(visibility, { status });
        const typeFilter = (type) => combineIssueFilters(visibility, { type });
        const [total, open, bugBucket, assigned, inProgress, fixed, readyForTesting, closed, totalProjects, totalUsers, byPriority, byStatus, byProject, bugTotal, taskTotal, bugByPriority, taskByPriority, bugByStatus, taskByStatus] = await Promise.all([
            Issue.countDocuments(visibility),
            Issue.countDocuments(statusFilter("OPEN")),
            Issue.countDocuments(statusFilter("BUG_BUCKET")),
            Issue.countDocuments(statusFilter("ASSIGNED")),
            Issue.countDocuments(statusFilter("IN_PROGRESS")),
            Issue.countDocuments(statusFilter("FIXED")),
            Issue.countDocuments(statusFilter("READY_FOR_TESTING")),
            Issue.countDocuments(statusFilter("CLOSED")),
            Project.countDocuments(),
            User.countDocuments(),
            Issue.aggregate([...matchVisibleIssues(visibility), { $group: { _id: "$priority", value: { $sum: 1 } } }]),
            Issue.aggregate([...matchVisibleIssues(visibility), { $group: { _id: "$status", value: { $sum: 1 } } }]),
            Issue.aggregate([...matchVisibleIssues(visibility), { $group: { _id: "$project", issues: { $sum: 1 } } }]),
            Issue.countDocuments(typeFilter("Bug")),
            Issue.countDocuments(typeFilter("Task")),
            Issue.aggregate([...matchVisibleIssues(typeFilter("Bug")), { $group: { _id: "$priority", value: { $sum: 1 } } }]),
            Issue.aggregate([...matchVisibleIssues(typeFilter("Task")), { $group: { _id: "$priority", value: { $sum: 1 } } }]),
            Issue.aggregate([...matchVisibleIssues(typeFilter("Bug")), { $group: { _id: "$status", value: { $sum: 1 } } }]),
            Issue.aggregate([...matchVisibleIssues(typeFilter("Task")), { $group: { _id: "$status", value: { $sum: 1 } } }])
        ]);
        res.json({ total, open, bugBucket, assigned, inProgress, fixed, readyForTesting, closed, totalProjects, totalUsers, byPriority, byStatus, byProject, bugTotal, taskTotal, bugByPriority, taskByPriority, bugByStatus, taskByStatus });
    }),
    reports: (async (_req, res) => {
        const projects = await Project.find();
        const issues = await Issue.find().populate("project", "name key").populate("assignee", "name");
        res.json({
            bugSummary: issues,
            resolutionTime: issues.filter((i) => i.status === "CLOSED"),
            teamPerformance: await Issue.aggregate([{ $group: { _id: "$assignee", resolved: { $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } }, total: { $sum: 1 } } }]),
            projectStatus: projects
        });
    })
};
