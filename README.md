# Resit Documentation

A web app for recording company receipts. Staff snap or upload a receipt, the app reads the
price, and an admin approves it and tracks money in and out. All amounts are in RM.

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

## Setup

Requires Node.js 18.18 or newer.

```bash
npm install
```

Copy `.env.example` to `.env`, then set `SESSION_SECRET` to a long random string and change
the seed passwords.

```bash
npm run setup
```

This creates the SQLite database and the starting accounts, purposes and payers. The login
details for the two starting accounts are the `SEED_*` values in `.env`.

```bash
npm run dev
```

Open http://localhost:3000.

## Notes

- Receipt images are stored in `uploads/` and the database in `prisma/dev.db`. Back up both.
- The scanner (Tesseract.js) downloads its language data from a CDN the first time it runs,
  so the device needs internet access for scanning.
- Phone browsers only allow the camera on HTTPS (or localhost), so serve the app over HTTPS
  when staff use it from their phones.
- Scanning is a best guess. Faded, handwritten or crumpled receipts may need the price typed in.

## Stack

Next.js 14 (App Router), Prisma with SQLite, Tailwind CSS, Tesseract.js, ExcelJS, PDFKit.
