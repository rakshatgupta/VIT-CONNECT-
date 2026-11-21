# VIT Connect

VIT Vellore student portal for alias-based campus feedback, a student task marketplace, and opt-in live task tracking. The React frontend and Socket.IO API use the same origin. The Java service is legacy and is outside the active app.

## Run locally on Windows

Use Node.js 24 and a running MongoDB instance. The example points to a local database named `vit_platform`. To recover existing records, use the URI for the existing database and keep any existing files in the upload directory.

From the repository root in PowerShell:

```powershell
Copy-Item node-backend/.env.example node-backend/.env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value after `JWT_SECRET=` in `node-backend/.env`. Keep that file private. Run `./start-all.bat` from PowerShell and open the Vite URL printed by the frontend, usually http://localhost:5173. The API readiness endpoint is http://127.0.0.1:5000/api/health. For local signup, enter a VIT student email and read the six-digit development code in the API terminal.

To run a production-style build locally:

```powershell
npm ci --prefix frontend
npm run build --prefix frontend
npm ci --prefix node-backend
npm start --prefix node-backend
```

Open http://127.0.0.1:5000. Stop a running development API first if it already uses port 5000.

## Deploy on Render with MongoDB Atlas

1. Push the updated branch to GitHub with `git push -u origin codex/restore-vit-connect`. In Render, connect the repository as a **Node Web Service**, select that branch, and leave **Root Directory** blank.
2. Set **Build Command** to `npm ci --prefix frontend --include=dev && npm run build --prefix frontend && npm ci --prefix node-backend --omit=dev`.
3. Set **Start Command** to `npm start --prefix node-backend` and **Health Check Path** to `/api/health`.
4. In Atlas, create a database user with read/write access to the application database. Add the Render service's outbound addresses to the Atlas project IP access list. Use the Atlas driver connection string, with the database name in its path, as `MONGO_URI`.
5. Set these environment variables in Render.

   | Variable | Value |
   | --- | --- |
   | `NODE_VERSION` | `24` |
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `MONGO_URI` | Atlas connection string |
   | `JWT_SECRET` | A new random secret of at least 32 characters |
   | `RESEND_API_KEY` | Resend sending API key |
   | `OTP_FROM_EMAIL` | Sender address on a verified Resend domain |
   | `UPLOAD_DIR` | `/var/data/uploads` |

6. Attach a persistent disk mounted at `/var/data` so feedback attachments survive redeploys. Render requires a paid service for a persistent disk. Run one instance because signup challenges and Socket.IO rooms are process-local.
7. Deploy. Open the HTTPS service URL, check `/api/health`, and register with a real VIT mailbox to verify delivery. Submit feedback with an attachment and test task tracking from two signed-in browser sessions. The worker must select **Share live location** and grant location permission.

[Render Web Services](https://render.com/docs/web-services) · [Render persistent disks](https://render.com/docs/disks) · [MongoDB Atlas connection setup](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) · [Resend email API](https://resend.com/docs/api-reference/emails/send-email)
