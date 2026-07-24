import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/bug_tracking",
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret",
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  adminEmail: process.env.ADMIN_EMAIL ?? "shivakumar.galibu60@gmail.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "Shiva@123",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  smtpEncryptionSecret: process.env.SMTP_ENCRYPTION_SECRET ?? process.env.JWT_REFRESH_SECRET ?? process.env.JWT_ACCESS_SECRET ?? "dev_smtp_secret"
};
