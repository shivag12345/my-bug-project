import { BaseRepository } from "../repositories/baseRepository.js";
import { logActivity } from "../services/activityService.js";
import { AppError } from "../middleware/errorHandler.js";
export function crudController(model, entityType) {
    const repo = new BaseRepository(model);
    const projectPopulate = entityType === "Project" ? "members teams" : undefined;
    return {
        list: (async (_req, res) => res.json(await repo.findAll({}, projectPopulate))),
        get: (async (req, res) => {
            const id = String(req.params.id);
            const item = await repo.findById(id, projectPopulate);
            if (!item)
                throw new AppError(404, `${entityType} not found`);
            res.json(item);
        }),
        create: (async (req, res) => {
            const item = await repo.create(req.body);
            await logActivity(req.user?.id, `${entityType} Created`, entityType, item._id?.toString());
            res.status(201).json(item);
        }),
        update: (async (req, res) => {
            const id = String(req.params.id);
            const item = await repo.update(id, req.body);
            if (!item)
                throw new AppError(404, `${entityType} not found`);
            await logActivity(req.user?.id, `${entityType} Updated`, entityType, item._id?.toString());
            res.json(item);
        }),
        remove: (async (req, res) => {
            const id = String(req.params.id);
            const item = await repo.delete(id);
            if (!item)
                throw new AppError(404, `${entityType} not found`);
            await logActivity(req.user?.id, `${entityType} Deleted`, entityType, id);
            res.status(204).send();
        })
    };
}
