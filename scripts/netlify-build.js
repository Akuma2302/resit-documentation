// Netlify build: prepare the database, then build the app.
// Netlify DB (Neon) exposes NETLIFY_DATABASE_URL*; a DATABASE_URL set by hand takes priority.
const { execSync } = require('child_process')

const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL
if (!url) {
  console.error('No database configured. Add Netlify DB to the site or set DATABASE_URL.')
  process.exit(1)
}

const env = { ...process.env, DATABASE_URL: url }
const run = (command) => execSync(command, { stdio: 'inherit', env })

run('prisma generate')
run('prisma db push --skip-generate')
run('node prisma/seed.js')
run('next build')
