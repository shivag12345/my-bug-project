import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { api, setSession } from "../api/client";

type LoginForm = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type ForgotPasswordForm = {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: unknown;
};

export function LoginPage() {
  const navigate = useNavigate();
  const rememberedEmail = localStorage.getItem("rememberedEmail") ?? "admin@gmail.com";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { isSubmitting }
  } = useForm<LoginForm>({
    defaultValues: {
      email: rememberedEmail,
      password: "",
      rememberMe: Boolean(localStorage.getItem("rememberedEmail"))
    }
  });
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    reset: resetForgot,
    formState: { isSubmitting: isForgotSubmitting }
  } = useForm<ForgotPasswordForm>({
    defaultValues: {
      email: rememberedEmail,
      token: "",
      password: "",
      confirmPassword: ""
    }
  });

  const openForgotPassword = () => {
    resetForgot({ email: getValues("email") || rememberedEmail, token: "", password: "", confirmPassword: "" });
    setForgotError("");
    setForgotMessage("");
    setShowResetPassword(false);
    setForgotOpen(true);
  };

  const submitForgotPassword = handleForgotSubmit(async (data) => {
    setForgotError("");
    try {
      if (!forgotMessage) {
        const res = await api<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: data.email }) });
        setForgotMessage(res.message);
        return;
      }

      if (data.password !== data.confirmPassword) {
        setForgotError("Passwords do not match");
        return;
      }

      const res = await api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: data.token, password: data.password })
      });
      setNotice(res.message);
      setForgotOpen(false);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Password reset failed");
    }
  });

  return (
    <Box sx={{ minHeight: "100%", display: "grid", placeItems: "center", bgcolor: "#f6f8fb", p: 2 }}>
      <Paper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Typography variant="h4" sx={{ mb: 0.5 }}>Bug Tracking</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Sign in to manage issues, teams, and releases.</Typography>
        <Stack component="form" spacing={2} onSubmit={handleSubmit(async (data) => {
          setError("");
          setNotice("");
          try {
            const { rememberMe, ...credentials } = data;
            const res = await api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
            setSession(res.accessToken, res.refreshToken, res.user);
            if (rememberMe) localStorage.setItem("rememberedEmail", credentials.email);
            else localStorage.removeItem("rememberedEmail");
            navigate("/");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
          }
        })}>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}
          <TextField label="Email" type="email" required {...register("email")} />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            {...register("password")}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                    <IconButton aria-label={showPassword ? "Hide password" : "Show password"} edge="end" onClick={() => setShowPassword((value) => !value)}>
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <FormControlLabel control={<Checkbox {...register("rememberMe")} />} label="Remember me" />
            <Link component="button" type="button" onClick={openForgotPassword} sx={{ fontWeight: 700 }}>
              Forgot password?
            </Link>
          </Box>
          <Button variant="contained" type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Login"}</Button>
        </Stack>
      </Paper>
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Forgot password</DialogTitle>
        <DialogContent>
          <Stack id="forgot-password-form" component="form" spacing={2} sx={{ pt: 1 }} onSubmit={submitForgotPassword}>
            {forgotError && <Alert severity="error">{forgotError}</Alert>}
            {forgotMessage && <Alert severity="success">{forgotMessage}</Alert>}
            <TextField label="Email" type="email" required disabled={Boolean(forgotMessage)} {...registerForgot("email")} />
            {forgotMessage && (
              <>
                <TextField label="Reset token" required {...registerForgot("token")} />
                <TextField
                  label="New password"
                  type={showResetPassword ? "text" : "password"}
                  required
                  {...registerForgot("password")}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showResetPassword ? "Hide password" : "Show password"}>
                          <IconButton
                            aria-label={showResetPassword ? "Hide password" : "Show password"}
                            edge="end"
                            onClick={() => setShowResetPassword((value) => !value)}
                          >
                            {showResetPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    )
                  }}
                />
                <TextField label="Confirm password" type={showResetPassword ? "text" : "password"} required {...registerForgot("confirmPassword")} />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
          <Button variant="contained" type="submit" form="forgot-password-form" disabled={isForgotSubmitting}>
            {forgotMessage ? "Reset password" : "Send reset email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
