import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Divider
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { Issue, IssueCategory, IssueStatus, Project, ModulePage, User } from "../types";
import { downloadXlsx } from "../utils/xlsx";

const taskPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const taskStatuses: IssueStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "FIXED", "CLOSED"];

const categories: IssueCategory[] = [
  "UI Bug",
  "Backend Bug",
  "API Bug",
  "Database Bug",
  "Performance Bug",
  "Security Bug",
  "Mobile Bug",
  "Enhancement Request"
];

const modulePages: ModulePage[] = [
  "Login Page",
  "Dashboard",
  "Reports",
  "User Management",
  "API",
  "Database",
  "Mobile UI",
  "Notifications",
  "Authentication",
  "Chat",
  "File Upload"
];

const priorityColors: Record<string, string> = {
  LOW: "#24a148",
  MEDIUM: "#0f62fe",
  HIGH: "#ff832b",
  CRITICAL: "#da1e28"
};

const taskAssignmentTemplate = [
  ["Task Title", "Task Requirements", "Module / Page", "Category", "Project", "Priority", "Suggested Developer Email", "Status", "Due Date"],
  ["Fix dashboard card alignment", "Make all stat containers equal height and match dashboard colors.", "Dashboard", "UI Bug", "BUGTRACK", "HIGH", "developer@gmail.com", "OPEN", "2026-06-30"],
  ["Prepare task status report", "Create a summary of pending and completed task assignments.", "Reports", "Enhancement Request", "BUGTRACK", "MEDIUM", "", "ASSIGNED", "2026-07-05"]
] as const;

type FormValues = {
  type: string;
  title: string;
  description: string;
  modulePage: string;
  category: string;
  project: string;
  assignee?: string;
  priority: string;
  status: string;
  dueDate?: string;
};

export function TaskForm({
  projects,
  users,
  initial,
  onSubmit
}: {
  projects: Project[];
  users: User[];
  initial?: Partial<Issue>;
  onSubmit: (data: unknown, attachments: File[]) => void;
}) {
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [taskSheet, setTaskSheet] = useState<File | null>(null);

  const { register, handleSubmit, control, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        type: "Task",
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        modulePage: initial?.modulePage ?? "",
        category: initial?.category ?? "",
        project: initial?.project?._id ?? projects[0]?._id ?? "",
        assignee: initial?.assignee?._id ?? "",
        priority: initial?.priority ?? "MEDIUM",
        status: initial?.status ?? "OPEN",
        dueDate: initial?.dueDate?.slice(0, 10) ?? ""
      }
    });

  const selectedProjectId = useWatch({ control, name: "project" });

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  const projectMembers = selectedProject?.members ?? [];

  const projectMemberIds = new Set(
    projectMembers.map(m => (typeof m === "string" ? m : m._id ?? m.id))
  );

  const availableDevs = users.filter(u =>
    projectMemberIds.has(u._id ?? u.id)
  );

  const onFormSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      type: "Task",
      assignee: data.assignee || undefined,
      dueDate: data.dueDate || undefined
    };

    onSubmit(payload, taskSheet ? [...screenshots, taskSheet] : screenshots);
  };

  const downloadReferenceExcel = () => {
    downloadXlsx("bug-tracking-task-assignment-reference.xlsx", "Task Assignment", taskAssignmentTemplate);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onFormSubmit)}>
      <Stack spacing={2.5} sx={{ pt: 1 }}>

        <Stack direction="row" alignItems="center" spacing={1}>
          <AssignmentIcon color="primary" fontSize="small" />
          <Chip label="Task" color="primary" variant="outlined" size="small" />
          <Typography variant="caption" color="text.secondary">
            Admin Task Management
          </Typography>
        </Stack>

        <Divider />

        <TextField
          label="Task Title *"
          fullWidth
          error={Boolean(errors.title)}
          {...register("title", { required: true })}
        />

        <TextField
          label="Task Requirements"
          multiline
          minRows={4}
          fullWidth
          {...register("description")}
        />

        <TextField
          select
          label="Module / Page *"
          fullWidth
          {...register("modulePage", { required: true })}
        >
          <MenuItem value="">Select module/page</MenuItem>
          {modulePages.map(mp => (
            <MenuItem key={mp} value={mp}>{mp}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Category *"
          fullWidth
          {...register("category", { required: true })}
        >
          <MenuItem value="">Select category</MenuItem>
          {categories.map(c => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Project *"
            fullWidth
            {...register("project", { required: true })}
          >
            {projects.map(p => (
              <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Priority"
            fullWidth
            {...register("priority")}
          >
            {taskPriorities.map(p => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Suggested Developer"
            fullWidth
            {...register("assignee")}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {availableDevs.map(u => (
              <MenuItem key={u._id ?? u.id} value={u._id ?? u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Status"
            fullWidth
            {...register("status")}
          >
            {taskStatuses.map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <TextField
          label="Due Date"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          {...register("dueDate")}
        />

        <Stack direction="row" spacing={1} alignItems="center">
          <Button component="label" startIcon={<AttachFileIcon />} variant="outlined">
            Attach Screenshots
            <input
              hidden
              type="file"
              multiple
              accept="image/png,image/jpeg"
              onChange={(e) =>
                setScreenshots(Array.from(e.target.files ?? []).slice(0, 5))
              }
            />
          </Button>

          <Typography variant="caption">
            {screenshots.length
              ? `${screenshots.length} files selected`
              : "Max 5 screenshots"}
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={downloadReferenceExcel}>
            Reference Excel
          </Button>

          <Button component="label" startIcon={<UploadFileIcon />} variant="outlined">
            Attach Task Excel
            <input
              hidden
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setTaskSheet(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </Button>

          <Typography variant="caption" color="text.secondary">
            {taskSheet?.name ?? "Optional for task assigning"}
          </Typography>
        </Stack>

        <Divider />

        <Button type="submit" variant="contained" startIcon={<AssignmentIcon />}>
          {initial?._id ? "Update Task" : "Create Task"}
        </Button>

      </Stack>
    </Box>
  );
}
