# Resit Documentation

A web app for recording company receipts. Staff snap or upload a receipt, the app reads the
price, and an admin approves it and tracks money in and out. All amounts are in RM.

The project is split in two:

| Folder      | What it is                                   | Hosted on                 |
| ----------- | -------------------------------------------- | ------------------------- |
| `frontend/` | React single-page app (Vite, Tailwind)        | Netlify                   |
| `backend/`  | REST API (Express, Prisma) with MongoDB       | Render, Railway or similar |

The frontend talks to the backend over HTTPS and sends a login token with each request.

## Features

**User**

- Camera: take a photo or upload an image of a receipt.
- The receipt is scanned in the browser and the price, date and vendor are pre-filled.
- Choose a purpose (sale, buy item, rent and so on) and add a note.
- For expenses, choose who paid (staff, admin, finance) and who was paid.
- A warning appears if a receipt with the same price, date and vendor already exists.
- "My receipts" shows each submission and whether it is pending, approved or rejected.

**Admin**

- Dashboard: money in, money out and balance for a chosen period, spending by purpose and
  by who paid, a month-by-month chart, and recent receipts.
- Receipts documented: filter by Buy or Sale, status, purpose, date and search text.
- Open a receipt to see the image, edit the details, and approve or reject it.
- Export the filtered list to Excel or PDF.
- Settings: manage purposes, the "who paid" list and user accounts.

Only approved receipts count in the dashboard totals.

## Run locally

Requires Node.js 18.18 or newer and a MongoDB database (a free MongoDB Atlas cluster works).

**Backend**

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` to your MongoDB
connection string (including the database name), `SESSION_SECRET` to a long random string, and change the seed passwords.

```bash
npm run setup
npm run dev
```

`npm run setup` creates the collections and the starting accounts, purposes and payers. The login
details for the two starting accounts are the `SEED_*` values in `backend/.env`. The API
runs on http://localhost:4000.

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In development the frontend forwards `/api` calls to the
backend on port 4000, so `VITE_API_URL` can stay empty.

## Deploy

Deploy the backend first, because the frontend needs its address.

### 1. Database

1. Create a free cluster at https://www.mongodb.com/atlas and a database user with a password.
2. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`). Render's servers do
   not have a fixed address, so the cluster cannot be limited to one IP.
3. Copy the connection string and add a database name before the `?`, for example
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/resit?retryWrites=true&w=majority`.

### 2. Backend on Render

1. In Render choose **New > Blueprint** and pick this repository; `render.yaml` describes the
   service. (Or create a Web Service by hand with root directory `backend`, build command
   `npm install && npm run build` and start command `npm start`.)
2. Set the environment variables:
   - `DATABASE_URL`: the MongoDB connection string from step 1
   - `SESSION_SECRET`: a long random string (the blueprint generates one)
   - `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`: the first admin login
   - `CORS_ORIGIN`: the frontend address, added after step 3
3. Deploy. The build creates the collections and the first admin account. Note the service
   address, for example `https://resit-backend.onrender.com`.

### 3. Frontend on Netlify

1. In Netlify choose **Add new site > Import an existing project** and pick this repository.
   The build settings come from `netlify.toml`.
2. Add the environment variable `VITE_API_URL` with the backend address from step 2
   (no trailing slash).
3. Deploy, then copy the site address (for example `https://your-site.netlify.app`).

### 4. Connect the two

Back in Render, set `CORS_ORIGIN` to the Netlify site address and redeploy the backend.
The backend only accepts browser requests from that address.

## Notes

- Receipt images are stored in the database, so the backend needs no disk of its own.
- `VITE_API_URL` is baked into the frontend at build time; redeploy the frontend after
  changing it.
- On a free Render plan the backend sleeps when idle, so the first request after a quiet
  period can take up to a minute.
- The scanner (Tesseract.js) downloads its language data from a CDN the first time it runs,
  so the device needs internet access for scanning.
- Phone browsers only allow the camera on HTTPS (or localhost). Netlify serves HTTPS.
- Scanning is a best guess. Faded, handwritten or crumpled receipts may need the price typed in.
