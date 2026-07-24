import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { DataState } from "./DataState";
import type { Issue, Role, User } from "../types";
import { issueStatusLabel } from "../utils/issues";

type Comment = { _id: string; body: string; author: User; attachments?: string[]; createdAt: string };

const priorityColor: Record<string, "error" | "warning" | "info" | "default"> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default"
};

const severityColor: Record<string, "error" | "warning" | "info" | "default"> = {
  BLOCKER: "error",
  CRITICAL: "error",
  MAJOR: "warning",
  MINOR: "default"
};

const statusColor: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  OPEN: "info",
  BUG_BUCKET: "secondary",
  ASSIGNED: "primary",
  IN_PROGRESS: "warning",
  FIXED: "success",
  READY_FOR_TESTING: "info",
  REOPENED: "error",
  CLOSED: "default"
};

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ py: 0.75 }}>
      <Box sx={{ color: "text.disabled", mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ minWidth: 110, flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>{typeof value === "string" ? <Typography variant="body2">{value || "—"}</Typography> : value}</Box>
    </Stack>
  );
}

export function IssueDetailDialog({
  issue,
  open,
  currentUserRole,
  onClose,
  onIssuePatched
}: {
  issue: Issue | null;
  open: boolean;
  currentUserRole?: Role;
  onClose: () => void;
  onIssuePatched?: (patch: Partial<Issue>) => void;
}) {
  const qc = useQueryClient();
  const editor = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [issueFiles, setIssueFiles] = useState<FileList | null>(null);
  const canUploadIssueAttachments = currentUserRole === "Tester";

  useEffect(() => {
    setFiles(null);
    setIssueFiles(null);
  }, [issue?._id, open]);

  const comments = useQuery({
    queryKey: ["comments", issue?._id],
    queryFn: () => api<Comment[]>(`/issues/${issue!._id}/comments`),
    enabled: Boolean(issue?._id && open)
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("body", editor.current?.innerHTML ?? "");
      if (files) Array.from(files).forEach((file) => form.append("files", file));
      return api<Comment>(`/issues/${issue!._id}/comments`, { method: "POST", body: form });
    },
    onSuccess: () => {
      if (editor.current) editor.current.innerHTML = "";
      setFiles(null);
      qc.invalidateQueries({ queryKey: ["comments", issue?._id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const uploadIssueAttachments = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (issueFiles) Array.from(issueFiles).forEach((file) => form.append("files", file));
      return api<Issue>(`/issues/${issue!._id}/uploads`, { method: "POST", body: form });
    },
    onSuccess: (updated) => {
      setIssueFiles(null);
      onIssuePatched?.({ attachments: updated.attachments, updatedAt: updated.updatedAt });
      qc.invalidateQueries({ queryKey: ["issues"] });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      {/* ── Header ─────────────────────────────────────────── */}
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" gap={1}>
          <Chip
            label={issue?.issueNumber}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
            {issue?.title}
          </Typography>
          {issue?.status && (
            <Chip
              label={issueStatusLabel(issue.status, currentUserRole)}
              color={statusColor[issue.status] ?? "default"}
              size="small"
            />
          )}
        </Stack>
        <IconButton
          aria-label="Close bug detail"
          onClick={onClose}
          size="small"
          sx={{ position: "absolute", top: 12, right: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {!issue ? null : (
          <Grid container sx={{ height: "100%" }}>
            {/* ── Left Panel: Full Details ──────────────────── */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ borderRight: { md: "1px solid" }, borderColor: { md: "divider" }, p: 3 }}>
              {/* Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Box
                  sx={{
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 2,
                    minHeight: 72
                  }}
                >
                  <Typography variant="body2" color={issue.description ? "text.primary" : "text.disabled"} sx={{ whiteSpace: "pre-wrap" }}>
                    {issue.description || "No description provided."}
                  </Typography>
                </Box>
              </Box>

              {/* Attachments */}
              {(canUploadIssueAttachments || (issue.attachments?.length ?? 0) > 0) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Screenshots & Attachments
                  </Typography>
                  {(issue.attachments?.length ?? 0) > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: canUploadIssueAttachments ? 1.5 : 0 }}>
                      {issue.attachments!.map((file) => (
                        <Button key={file} size="small" variant="outlined" startIcon={<AttachFileIcon />} href={file} target="_blank">
                          {file.split("/").pop()}
                        </Button>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 1 }}>No attachments yet.</Typography>
                  )}
                  {canUploadIssueAttachments && (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                      <Button component="label" startIcon={<AttachFileIcon />} variant="outlined" size="small">
                        Attach files
                        <input hidden type="file" multiple onChange={(e) => setIssueFiles(e.target.files)} />
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {issueFiles?.length ? `${issueFiles.length} file(s) selected` : "PNG, JPG, PDF, DOCX, ZIP"}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CloudUploadIcon />}
                        disabled={!issueFiles?.length || uploadIssueAttachments.isPending}
                        onClick={() => uploadIssueAttachments.mutate()}
                      >
                        Upload
                      </Button>
                    </Stack>
                  )}
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              {/* Activity / Comments */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                Activity Timeline
              </Typography>
              {comments.isPending || comments.error ? (
                <DataState loading={comments.isPending} error={comments.error} />
              ) : (
                <Stack spacing={2} sx={{ mb: 3 }}>
                  {(comments.data ?? []).length === 0 && (
                    <Typography variant="body2" color="text.disabled">No comments yet. Be the first to comment.</Typography>
                  )}
                  {(comments.data ?? []).map((comment) => (
                    <Box
                      key={comment._id}
                      sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 2, py: 0.5 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {comment.author?.name ?? "User"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Typography component="div" variant="body2" dangerouslySetInnerHTML={{ __html: comment.body }} />
                      {comment.attachments?.map((file) => (
                        <Button key={file} size="small" startIcon={<AttachFileIcon />} href={file} target="_blank">
                          {file.split("/").pop()}
                        </Button>
                      ))}
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Add Comment */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Add Comment
                </Typography>
                <div
                  className="rich-editor"
                  contentEditable
                  ref={editor}
                  data-placeholder="Write a comment…"
                />
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Button component="label" startIcon={<AttachFileIcon />} variant="outlined" size="small">
                    Attach
                    <input hidden type="file" multiple onChange={(e) => setFiles(e.target.files)} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {files?.length ? `${files.length} file(s) selected` : ""}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<SendIcon />}
                    disabled={addComment.isPending}
                    onClick={() => addComment.mutate()}
                  >
                    {addComment.isPending ? "Posting…" : "Post Comment"}
                  </Button>
                </Stack>
              </Box>
            </Grid>

            {/* ── Right Panel: Bug Metadata ───────────────── */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ p: 3, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", fontSize: 11 }}>
                Bug Details
              </Typography>

              <Divider sx={{ mb: 1.5 }} />

              <DetailRow
                icon={<PersonIcon fontSize="small" />}
                label="Reporter"
                value={<Typography variant="body2">{issue.reporter?.name ?? "—"}</Typography>}
              />
              <DetailRow
                icon={<AssignmentIndIcon fontSize="small" />}
                label="Assignee"
                value={
                  issue.assignee ? (
                    <Chip size="small" label={issue.assignee.name} variant="outlined" color="primary" />
                  ) : (
                    <Typography variant="body2" color="text.disabled">Unassigned</Typography>
                  )
                }
              />
              {issue.assignedBy && (
                <DetailRow
                  icon={<PersonIcon fontSize="small" />}
                  label="Assigned By"
                  value={<Typography variant="body2">{(issue.assignedBy as User).name ?? "—"}</Typography>}
                />
              )}

              <Divider sx={{ my: 1.5 }} />

              <DetailRow
                icon={<FolderIcon fontSize="small" />}
                label="Project"
                value={<Typography variant="body2" fontWeight={600}>{issue.project?.name ?? "—"}</Typography>}
              />
              <DetailRow
                icon={<CategoryIcon fontSize="small" />}
                label="Category"
                value={<Chip size="small" label={issue.category} />}
              />
              {issue.type && (
                <DetailRow
                  icon={<CategoryIcon fontSize="small" />}
                  label="Type"
                  value={<Chip size="small" label={issue.type} variant="outlined" />}
                />
              )}
              {issue.modulePage && (
                <DetailRow
                  icon={<CategoryIcon fontSize="small" />}
                  label="Module/Page"
                  value={<Chip size="small" label={issue.modulePage} variant="outlined" />}
                />
              )}

              <Divider sx={{ my: 1.5 }} />

              <DetailRow
                icon={<PriorityHighIcon fontSize="small" />}
                label="Priority"
                value={<Chip size="small" label={issue.priority} color={priorityColor[issue.priority] ?? "default"} />}
              />
              <DetailRow
                icon={<ReportProblemIcon fontSize="small" />}
                label="Severity"
                value={<Chip size="small" label={issue.severity} color={severityColor[issue.severity] ?? "default"} />}
              />

              {(issue.labels ?? []).length > 0 && (
                <DetailRow
                  icon={<CategoryIcon fontSize="small" />}
                  label="Labels"
                  value={
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {issue.labels!.map((l) => <Chip key={l} size="small" label={l} />)}
                    </Stack>
                  }
                />
              )}

              <Divider sx={{ my: 1.5 }} />

              {issue.dueDate && (
                <DetailRow
                  icon={<CalendarTodayIcon fontSize="small" />}
                  label="Due Date"
                  value={
                    <Typography variant="body2" color={new Date(issue.dueDate) < new Date() ? "error.main" : "text.primary"}>
                      {new Date(issue.dueDate).toLocaleDateString()}
                    </Typography>
                  }
                />
              )}
              <DetailRow
                icon={<AccessTimeIcon fontSize="small" />}
                label="Created"
                value={<Typography variant="body2">{new Date(issue.createdAt).toLocaleString()}</Typography>}
              />
              <DetailRow
                icon={<AccessTimeIcon fontSize="small" />}
                label="Updated"
                value={<Typography variant="body2">{new Date(issue.updatedAt).toLocaleString()}</Typography>}
              />

              {(issue.watchers ?? []).length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <DetailRow
                    icon={<VisibilityIcon fontSize="small" />}
                    label="Watchers"
                    value={
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {(issue.watchers as User[]).map((w) => (
                          <Tooltip key={typeof w === "string" ? w : (w._id ?? w.id)} title={typeof w === "string" ? w : w.email ?? ""}>
                            <Chip size="small" label={typeof w === "string" ? w : w.name} variant="outlined" />
                          </Tooltip>
                        ))}
                      </Stack>
                    }
                  />
                </>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}
