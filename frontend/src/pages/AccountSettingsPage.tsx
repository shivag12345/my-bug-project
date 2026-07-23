import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { api, setCurrentUser } from "../api/client";
import { DataState } from "../components/DataState";
import { PageHeader } from "../components/PageHeader";
import type { User } from "../types";

type SmtpSettingsForm = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
};

function emptySmtpForm(): SmtpSettingsForm {
  return { enabled: false, host: "", port: 587, secure: false, user: "", password: "", fromName: "" };
}

function valuesFromUser(user?: User | null): SmtpSettingsForm {
  return {
    enabled: Boolean(user?.smtp?.enabled),
    host: user?.smtp?.host ?? "",
    port: user?.smtp?.port ?? 587,
    secure: Boolean(user?.smtp?.secure),
    user: user?.smtp?.user ?? user?.email ?? "",
    password: "",
    fromName: user?.smtp?.fromName ?? user?.name ?? ""
  };
}

export function AccountSettingsPage() {
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const settings = useQuery({ queryKey: ["user-smtp-settings"], queryFn: () => api<User>("/users/me") });
  const { control, register, handleSubmit, reset, watch } = useForm<SmtpSettingsForm>({ defaultValues: emptySmtpForm() });

  const smtpEnabled = watch("enabled");
  const smtpHost = watch("host");
  const smtpUser = watch("user");
  const fromName = watch("fromName");

  const save = useMutation({
    mutationFn: (data: SmtpSettingsForm) => {
      const smtp: Partial<SmtpSettingsForm> = { ...data };
      if (!smtp.password) delete smtp.password;
      return api<User>("/users/me/smtp", { method: "PUT", body: JSON.stringify({ smtp }) });
    },
    onSuccess: (user) => {
      setTestResult(null);
      reset(valuesFromUser(user));
      setCurrentUser(user);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user-smtp-settings"] });
    }
  });

  const testEmail = useMutation({
    mutationFn: () => api<{ message: string }>("/users/me/smtp/test", { method: "POST" }),
    onSuccess: (res) => setTestResult({ ok: true, message: res.message }),
    onError: (err) => setTestResult({ ok: false, message: err instanceof Error ? err.message : "Test failed" })
  });

  useEffect(() => {
    if (settings.data) reset(valuesFromUser(settings.data));
  }, [reset, settings.data]);

  if (settings.isPending || settings.error) return <DataState loading={settings.isPending} error={settings.error} />;

  const configured = settings.data?.smtp?.configured;
  const enabled = settings.data?.smtp?.enabled;
  const savedFromEmail = settings.data?.smtp?.user;
  const savedFromName = settings.data?.smtp?.fromName || settings.data?.name;

  return (
    <>
      <PageHeader title="Email Settings" />

      <Stack spacing={3} sx={{ maxWidth: 760 }}>

        {/* ── Status Banner ─────────────────────────────────────── */}
        <Card
          variant="outlined"
          sx={{
            borderColor: configured && enabled ? "success.light" : "divider",
            background: configured && enabled
              ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <EmailIcon sx={{ color: configured && enabled ? "success.main" : "text.disabled", fontSize: 32 }} />
                <Box>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Personal SMTP Sender
                    </Typography>
                    <Chip
                      size="small"
                      icon={configured && enabled ? <CheckCircleIcon /> : <ErrorIcon />}
                      label={configured && enabled ? "Active" : configured ? "Disabled" : "Not Configured"}
                      color={configured && enabled ? "success" : "default"}
                      variant={configured && enabled ? "filled" : "outlined"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {configured && enabled
                      ? <>Outgoing emails will be sent from <strong>{savedFromName}</strong> &lt;{savedFromEmail}&gt;</>
                      : "Configure your SMTP credentials below to send emails from your own address."}
                  </Typography>
                </Box>
              </Stack>

              {configured && enabled && (
                <Button
                  id="test-smtp-btn"
                  variant="outlined"
                  color="success"
                  startIcon={<SendIcon />}
                  disabled={testEmail.isPending}
                  onClick={() => testEmail.mutate()}
                  size="small"
                >
                  {testEmail.isPending ? "Sending…" : "Send Test Email"}
                </Button>
              )}
            </Stack>

            {testResult && (
              <Alert
                severity={testResult.ok ? "success" : "error"}
                sx={{ mt: 2 }}
                onClose={() => setTestResult(null)}
              >
                {testResult.message}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ── How it works ──────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            p: 2,
            borderRadius: 2,
            bgcolor: "info.50",
            border: "1px solid",
            borderColor: "info.200"
          }}
        >
          <InfoOutlinedIcon sx={{ color: "info.main", mt: 0.2, flexShrink: 0 }} />
          <Box>
            <Typography variant="body2" fontWeight={600} color="info.main">
              How per-user SMTP works
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              When you configure and enable your own SMTP sender, all emails triggered by your actions — such as
              assigning an issue to a developer or posting a comment — will be sent <strong>from your email address</strong>.
              If you haven't configured it, the system will fall back to the default mail account.
            </Typography>
          </Box>
        </Box>

        {/* ── SMTP Form ─────────────────────────────────────────── */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              SMTP Configuration
            </Typography>

            <Stack
              id="smtp-settings-form"
              component="form"
              spacing={2.5}
              onSubmit={handleSubmit((data) => { setTestResult(null); save.mutate(data); })}
            >
              {save.isSuccess && <Alert severity="success" onClose={() => save.reset()}>SMTP settings saved successfully.</Alert>}
              {save.error && <Alert severity="error" onClose={() => save.reset()}>{save.error instanceof Error ? save.error.message : "Could not save settings"}</Alert>}

              {/* Enable toggle */}
              <FormControlLabel
                control={
                  <Controller
                    name="enabled"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="smtp-enabled-toggle"
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>Enable personal SMTP sender</Typography>
                    <Typography variant="caption" color="text.secondary">
                      When enabled, your emails will be sent from your configured address below
                    </Typography>
                  </Box>
                }
              />

              <Divider />

              {/* Host + Port row */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  id="smtp-host"
                  label="SMTP Host"
                  fullWidth
                  placeholder="e.g. smtp.hostinger.com"
                  disabled={!smtpEnabled}
                  helperText="Your outgoing mail server hostname"
                  {...register("host")}
                />
                <TextField
                  id="smtp-port"
                  label="Port"
                  type="number"
                  sx={{ width: { xs: "100%", sm: 150 } }}
                  disabled={!smtpEnabled}
                  helperText="Usually 465 or 587"
                  {...register("port", { valueAsNumber: true })}
                />
              </Stack>

              {/* SSL toggle */}
              <FormControlLabel
                control={
                  <Controller
                    name="secure"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="smtp-secure-toggle"
                        checked={Boolean(field.value)}
                        disabled={!smtpEnabled}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>SSL / TLS</Typography>
                    <Typography variant="caption" color="text.secondary">Enable if using port 465 (SSL). Leave off for port 587 (STARTTLS)</Typography>
                  </Box>
                }
              />

              <Divider />

              {/* Username / Password */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  id="smtp-username"
                  label="SMTP Username / Email"
                  fullWidth
                  placeholder="your@email.com"
                  disabled={!smtpEnabled}
                  helperText="Usually your full email address"
                  {...register("user")}
                />
                <TextField
                  id="smtp-password"
                  label="SMTP Password"
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  disabled={!smtpEnabled}
                  helperText={settings.data?.smtp?.hasPassword ? "Password saved – enter a new one to replace" : "Required to authenticate with your mail server"}
                  {...register("password")}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                          <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              {/* From Name */}
              <TextField
                id="smtp-from-name"
                label="From Name"
                fullWidth
                placeholder="John Smith"
                disabled={!smtpEnabled}
                helperText='The display name recipients see in their inbox, e.g. "John Smith via Bug Tracking"'
                {...register("fromName")}
              />

              {/* Preview */}
              {smtpEnabled && smtpUser && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: "grey.50",
                    border: "1px dashed",
                    borderColor: "grey.300"
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    PREVIEW — Emails will appear as:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>{fromName || settings.data?.name || "Your Name"}</strong>{" "}
                    &lt;{smtpUser || settings.data?.email}&gt;
                  </Typography>
                  {smtpHost && (
                    <Typography variant="caption" color="text.secondary">
                      via {smtpHost}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Action buttons */}
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  id="save-smtp-btn"
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={save.isPending}
                >
                  {save.isPending ? "Saving…" : "Save Settings"}
                </Button>

                {settings.data?.smtp?.configured && settings.data?.smtp?.enabled && (
                  <Button
                    id="test-smtp-bottom-btn"
                    variant="outlined"
                    startIcon={<SendIcon />}
                    disabled={testEmail.isPending}
                    onClick={() => testEmail.mutate()}
                  >
                    {testEmail.isPending ? "Sending…" : "Send Test Email"}
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
