import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { api, crud, currentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { Role, User } from "../types";
import { downloadXlsx } from "../utils/xlsx";

const roles: Role[] = ["Admin", "Developer", "Tester"];
const defaultUserPassword = "BugTracker@12345";
const userImportTemplate = [
  ["Name", "Email", "Role", "Disabled"],
  ["Aarav Mehta", "aarav.mehta@gmail.com", "Developer", "false"],
  ["Nisha Rao", "nisha.rao@gmail.com", "Tester", "false"],
  ["Priya Nair", "priya.nair@gmail.com", "Admin", "false"]
] as const;

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  smtp: SmtpFormData;
};

type SmtpFormData = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
};

type UserFormPayload = Partial<Omit<UserFormData, "smtp">> & { smtp?: Partial<SmtpFormData> };

type UserImportError = {
  row: number;
  email?: string;
  message: string;
};

type UserImportResult = {
  created: number;
  skipped: number;
  errors: UserImportError[];
  users: User[];
};

function emptySmtp(): SmtpFormData {
  return {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromName: ""
  };
}

function emptyUser(): UserFormData {
  return {
    name: "",
    email: "",
    password: defaultUserPassword,
    role: "Developer",
    smtp: emptySmtp()
  };
}

function valuesFromUser(user?: User | null): UserFormData {
  if (!user) return emptyUser();
  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    smtp: {
      enabled: Boolean(user.smtp?.enabled),
      host: user.smtp?.host ?? "",
      port: user.smtp?.port ?? 587,
      secure: Boolean(user.smtp?.secure),
      user: user.smtp?.user ?? "",
      password: "",
      fromName: user.smtp?.fromName ?? ""
    }
  };
}

function UserForm({ user, onCancel, onSubmit }: { user?: User | null; onCancel: () => void; onSubmit: (data: UserFormPayload) => void }) {
  const { control, register, handleSubmit, reset } = useForm<UserFormData>({ defaultValues: valuesFromUser(user) });

  useEffect(() => {
    reset(valuesFromUser(user));
  }, [reset, user]);

  const submit = (data: UserFormData) => {
    const smtp: Partial<SmtpFormData> = { ...data.smtp };
    const payload: UserFormPayload = { ...data, smtp };
    if (user && !payload.password) delete payload.password;
    if (!smtp.password) delete smtp.password;
    onSubmit(payload);
  };

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(submit)}>
      <TextField label="Name" {...register("name")} />
      <TextField label="Email" {...register("email")} />
      <TextField label={user ? "New Password" : "Temporary Password"} type="password" helperText={user ? "Leave blank to keep the current password." : "Share this temporary password with the user."} {...register("password")} />
      <TextField select label="Role" {...register("role")}>{roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField>
      <Divider />
      <Typography variant="subtitle2" fontWeight={800}>SMTP Sender</Typography>
      <FormControlLabel
        control={<Controller name="smtp.enabled" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />} />}
        label="User SMTP sender"
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="SMTP Host" fullWidth {...register("smtp.host")} />
        <TextField label="Port" type="number" sx={{ width: { xs: "100%", sm: 140 } }} {...register("smtp.port", { valueAsNumber: true })} />
      </Stack>
      <FormControlLabel
        control={<Controller name="smtp.secure" control={control} render={({ field }) => <Switch checked={Boolean(field.value)} onChange={(event) => field.onChange(event.target.checked)} />} />}
        label="SSL/TLS"
      />
      <TextField label="SMTP Username" {...register("smtp.user")} />
      <TextField label="SMTP Password" type="password" helperText={user?.smtp?.hasPassword ? "Password saved. Enter a new password to replace it." : ""} {...register("smtp.password")} />
      <TextField label="From Name" {...register("smtp.fromName")} />
      <DialogActions sx={{ px: 0 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">Save User</Button>
      </DialogActions>
    </Stack>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const canManageUsers = currentUser<User>()?.role === "Admin";
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<UserImportResult | null>(null);
  const [search, setSearch] = useState("");
  const users = useQuery({ queryKey: ["users"], queryFn: () => crud.list<User>("users") });
  const create = useMutation({ mutationFn: (data: unknown) => crud.create<User>("users", data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setCreateOpen(false); } });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: unknown }) => crud.update<User>("users", id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setEditingUser(null); } });
  const remove = useMutation({ mutationFn: (id: string) => crud.remove("users", id), onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const importUsers = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api<UserImportResult>("/users/import", { method: "POST", body: form });
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportFile(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const openImportDialog = () => {
    setImportOpen(true);
    setImportFile(null);
    setImportResult(null);
    importUsers.reset();
  };

  const closeImportDialog = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
    importUsers.reset();
  };

  const submitImport = () => {
    if (importFile) importUsers.mutate(importFile);
  };

  const downloadReferenceExcel = () => {
    downloadXlsx("bug-tracking-user-import-reference.xlsx", "Users", userImportTemplate);
  };

  if (users.isPending || users.error) return <DataState loading={users.isPending} error={users.error} />;
  const query = search.trim().toLowerCase();
  const filteredUsers = query
    ? users.data!.filter((user) => [user.name, user.email, user.role, user.department ?? ""].some((value) => value.toLowerCase().includes(query)))
    : users.data!;

  return (
    <>
      <PageHeader
        title="Users"
        actions={canManageUsers ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadReferenceExcel}>Reference Excel</Button>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={openImportDialog}>Import Excel</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Create User</Button>
          </Stack>
        ) : undefined}
      />
      <TextField
        size="small"
        placeholder="Search users"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 2, maxWidth: 420, width: "100%" }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
      />
      <TableContainer sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{["Name", "Email", "Role", "SMTP", "Disabled", ...(canManageUsers ? ["Actions"] : [])].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{filteredUsers.map((u) => {
        const userId = (u._id ?? u.id)!;
        return <TableRow key={userId}><TableCell>{u.name}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.role}</TableCell><TableCell><Chip size="small" label={u.smtpConfigured ? "Configured" : "Default"} color={u.smtpConfigured ? "success" : "default"} /></TableCell><TableCell><Switch checked={Boolean(u.disabled)} disabled={!canManageUsers} onChange={(e) => update.mutate({ id: userId, data: { disabled: e.target.checked } })} /></TableCell>{canManageUsers && <TableCell><IconButton color="primary" aria-label="Edit user" onClick={() => setEditingUser(u)}><EditIcon /></IconButton><IconButton color="error" aria-label="Delete user" onClick={() => remove.mutate(userId)}><DeleteIcon /></IconButton></TableCell>}</TableRow>;
      })}</TableBody></Table></TableContainer>
      {canManageUsers && <><Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Create User</DialogTitle><DialogContent><UserForm onCancel={() => setCreateOpen(false)} onSubmit={(data) => create.mutate(data)} /></DialogContent></Dialog>
      <Dialog open={Boolean(editingUser)} onClose={() => setEditingUser(null)} fullWidth maxWidth="sm"><DialogTitle>Edit User</DialogTitle><DialogContent><UserForm user={editingUser} onCancel={() => setEditingUser(null)} onSubmit={(data) => update.mutate({ id: (editingUser!._id ?? editingUser!.id)!, data })} /></DialogContent></Dialog>
      <Dialog open={importOpen} onClose={closeImportDialog} fullWidth maxWidth="sm">
        <DialogTitle>Import Users</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadReferenceExcel}>
                Reference Excel
              </Button>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                Choose Excel File
                <input
                  hidden
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => {
                    setImportResult(null);
                    importUsers.reset();
                    setImportFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">{importFile?.name ?? "No file selected"}</Typography>
            </Box>
            {importUsers.error && <Alert severity="error">{importUsers.error instanceof Error ? importUsers.error.message : "Import failed"}</Alert>}
            {importResult && (
              <Alert severity={importResult.skipped ? "warning" : "success"}>
                {importResult.created} users imported. {importResult.skipped} skipped.
              </Alert>
            )}
            {importResult?.errors.length ? (
              <Box sx={{ maxHeight: 240, overflow: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Row", "Email", "Issue"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>{importResult.errors.map((error, index) => (
                    <TableRow key={`${error.row}-${index}`}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.email ?? "-"}</TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImportDialog}>{importResult ? "Close" : "Cancel"}</Button>
          <Button variant="contained" onClick={submitImport} disabled={!importFile || importUsers.isPending}>{importUsers.isPending ? "Importing..." : "Import"}</Button>
        </DialogActions>
      </Dialog>
      </>}
    </>
  );
}
