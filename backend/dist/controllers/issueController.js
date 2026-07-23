import { Issue } from "../models/Issue.js";
import { Comment } from "../models/Comment.js";
import { Notification } from "../models/Notification.js";
import { issueService, cleanupOldNotifications } from "../services/issueService.js";
import { AppError } from "../middleware/errorHandler.js";
import { logActivity } from "../services/activityService.js";
import { findVisibleIssueById, visibleIssueFilter } from "../services/issueVisibility.js";
const populate = [
    { path: "project", select: "name key" },
    { path: "reporter", select: "name email" },
    { path: "assignee", select: "name email" },
    { path: "assignedBy", select: "name email" }
];
async function requireVisibleIssue(user, id) {
    const issue = await findVisibleIssueById(user, id);
    if (!issue)
        throw new AppError(404, "Issue not found");
    return issue;
}
export const issueController = {
    list: (async (req, res) => {
        const filter = {};
        for (const key of ["project", "assignee", "category", "modulePage", "priority", "severity", "status", "reporter"]) {
            if (req.query[key])
                filter[key] = req.query[key];
        }
        const issues = await Issue.find(await visibleIssueFilter(req.user, filter)).populate(populate).sort({ updatedAt: -1 });
        res.json(issues);
    }),
    get: (async (req, res) => {
        const issue = await Issue.findOne(await visibleIssueFilter(req.user, { _id: String(req.params.id) })).populate([...populate, { path: "watchers", select: "name email" }]);
        if (!issue)
            throw new AppError(404, "Issue not found");
        res.json(issue);
    }),
    create: (async (req, res) => res.status(201).json(await issueService.create(req.body, req.user))),
    update: (async (req, res) => res.json(await issueService.update(String(req.params.id), req.body, req.user))),
    remove: (async (req, res) => {
        await Issue.findByIdAndDelete(req.params.id);
        await logActivity(req.user?.id, "Issue Deleted", "Issue", String(req.params.id));
        res.status(204).send();
    }),
    upload: (async (req, res) => {
        await requireVisibleIssue(req.user, req.params.id);
        const files = req.files.map((file) => `/uploads/${file.filename}`);
        const issue = await Issue.findByIdAndUpdate(req.params.id, { $push: { attachments: { $each: files } } }, { new: true });
        res.json(issue);
    }),
    watch: (async (req, res) => {
        await requireVisibleIssue(req.user, req.params.id);
        res.json(await Issue.findByIdAndUpdate(req.params.id, { $addToSet: { watchers: req.user.id } }, { new: true }));
    }),
    unwatch: (async (req, res) => {
        await requireVisibleIssue(req.user, req.params.id);
        res.json(await Issue.findByIdAndUpdate(req.params.id, { $pull: { watchers: req.user.id } }, { new: true }));
    }),
    comments: (async (req, res) => {
        await requireVisibleIssue(req.user, req.params.id);
        res.json(await Comment.find({ issue: req.params.id }).populate("author", "name email").sort({ createdAt: 1 }));
    }),
    addComment: (async (req, res) => {
        const issue = await requireVisibleIssue(req.user, req.params.id);
        const attachments = req.files?.map((file) => `/uploads/${file.filename}`) ?? [];
        const comment = await Comment.create({ issue: req.params.id, author: req.user.id, body: req.body.body, attachments, mentions: req.body.mentions ?? [] });
        for (const watcher of issue.watchers) {
            await Notification.create({ user: watcher, title: "Comment Added", message: issue.title, type: "Comment Added", entity: issue._id });
            await cleanupOldNotifications(watcher.toString());
        }
        await logActivity(req.user?.id, "Comment Added", "Issue", String(req.params.id));
        res.status(201).json(comment);
    })
};
