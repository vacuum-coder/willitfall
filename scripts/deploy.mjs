// Builds the site and uploads dist/ to Cloudflare Pages.
// Auth: `npx wrangler login` once, or CLOUDFLARE_API_TOKEN (Pages: Edit) in .env.local — never committed.
// Run: npm run deploy
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PROJECT = process.env.PAGES_PROJECT || 'willitfall';
const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });
run('npm run build');
run(`npx wrangler pages deploy dist --project-name ${env.PAGES_PROJECT || PROJECT} --branch main --commit-dirty=true`);
