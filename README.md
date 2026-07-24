# Bug Tracking

Production-ready Jira-style bug tracking system with React, TypeScript, Express, MongoDB, JWT auth, file uploads, email hooks, reporting, and Docker deployment.

## Folder Structure

```text
backend/        Express API, services, repositories, routes, Mongoose models
frontend/       React 19 Vite app with MUI, React Query, Router, Hook Form, Recharts
nginx/          Reverse proxy configuration
docker-compose.yml
```

## Run

```bash
docker compose up -d
```

Open `http://localhost`.

Default login:

```text
Email: any seeded Bug Tracker user, or shivakumar.galibu60@gmail.com
Password: Bug@123
```

The seeded administrator uses the credentials above. Other seeded users use the configured default password.

## Notes

- Configure SMTP variables in `docker-compose.yml` or `backend/.env.example` to send real email. Users can also save their own SMTP sender in Settings; issue emails use that sender first and fall back to the default SMTP account.
- Uploaded files are stored under `/uploads` in the backend container and persisted in the `uploads` Docker volume.
# my-bug-project
