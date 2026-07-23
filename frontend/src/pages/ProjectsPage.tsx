import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { crud } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Project, User } from "../types";

type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed";

type ProjectFormData = {
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  members: string[];
};

function entityId(value?: string | { _id?: string; id?: string } | null) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id ?? value.id ?? "";
}

function valuesFromProject(project?: Project | null): ProjectFormData {
  if (!project) {
    return {
      name: "Bug Tracking Issue Suite",
      key: "BUGTRACK",
      description: "",
      status: "Active",
      startDate: "",
      endDate: "",
      members: []
    };
  }

  return {
    name: project.name,
    key: project.key,
    description: project.description ?? "",
    status: project.status as ProjectStatus,
    startDate: project.startDate?.slice(0, 10) ?? "",
    endDate: project.endDate?.slice(0, 10) ?? "",
    members: project.members?.map(entityId).filter(Boolean) ?? []
  };
}

function ProjectForm({ project, users, onCancel, onSubmit }: { project?: Project | null; users: User[]; onCancel: () => void; onSubmit: (data: ProjectFormData) => void }) {
  const { control, register, handleSubmit, reset } = useForm<ProjectFormData>({ defaultValues: valuesFromProject(project) });

  useEffect(() => {
    reset(valuesFromProject(project));
  }, [project, reset]);

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
      <TextField label="Project Name" {...register("name")} />
      <TextField label="Project Key" {...register("key")} />
      <TextField label="Description" multiline minRows={3} {...register("description")} />
      <TextField label="Start Date" type="date" InputLabelProps={{ shrink: true }} {...register("startDate")} />
      <TextField label="End Date" type="date" InputLabelProps={{ shrink: true }} {...register("endDate")} />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <TextField select label="Status" {...field}>{["Planning", "Active", "On Hold", "Completed"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
        )}
      />
      <Controller
        control={control}
        name="members"
        render={({ field }) => (
          <TextField select SelectProps={{ multiple: true }} label="Members" {...field} value={field.value ?? []}>{users.map((u) => <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>{u.name}</MenuItem>)}</TextField>
        )}
      />
      <DialogActions sx={{ px: 0 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Save</Button>
      </DialogActions>
    </Stack>
  );
}

export function ProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => crud.list<Project>("projects") });
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const create = useMutation({ mutationFn: (data: unknown) => crud.create<Project>("projects", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); } });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: unknown }) => crud.update<Project>("projects", id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setEditingProject(null); } });
  const remove = useMutation({ mutationFn: (id: string) => crud.remove("projects", id), onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }) });
  if (projects.isPending || users.isPending || projects.error || users.error) return <DataState loading={projects.isPending || users.isPending} error={projects.error || users.error} />;
  return (
    <>
      <PageHeader title="Projects" action="Create Project" onAction={() => setOpen(true)} />
      <TableContainer sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{["Project Name", "Project Key", "Status", "Start Date", "End Date", "Members", "Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{projects.data!.map((p) => <TableRow key={p._id}><TableCell>{p.name}</TableCell><TableCell>{p.key}</TableCell><TableCell>{p.status}</TableCell><TableCell>{p.startDate?.slice(0, 10)}</TableCell><TableCell>{p.endDate?.slice(0, 10)}</TableCell><TableCell>{p.members?.length ?? 0}</TableCell><TableCell><IconButton color="primary" aria-label="Edit project" onClick={() => setEditingProject(p)}><EditIcon /></IconButton><IconButton color="error" aria-label="Delete project" onClick={() => remove.mutate(p._id)}><DeleteIcon /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Create Project
          <IconButton aria-label="Close create project" onClick={() => setOpen(false)} edge="end"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent><ProjectForm users={users.data!} onCancel={() => setOpen(false)} onSubmit={(data) => create.mutate(data)} /></DialogContent>
      </Dialog>
      <Dialog open={Boolean(editingProject)} onClose={() => setEditingProject(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Edit Project
          <IconButton aria-label="Close edit project" onClick={() => setEditingProject(null)} edge="end"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent><ProjectForm project={editingProject} users={users.data!} onCancel={() => setEditingProject(null)} onSubmit={(data) => update.mutate({ id: editingProject!._id, data })} /></DialogContent>
      </Dialog>
    </>
  );
}
