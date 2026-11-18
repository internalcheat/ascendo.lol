import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Scheduled GITHUB_TOKEN commits do not trigger another Pages deployment.
// Request the existing Pages build explicitly, as the profile publisher does.
if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('The catalogue publisher runs only on main in GitHub Actions.');
}
const git = (...args) => execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const file = 'randomff/catalogue.json';
let needsBuild = false;
if (!git('status', '--porcelain', '--', file)) {
  console.log('The complete channel catalogue is unchanged.');
  // Recover when a previous run pushed successfully but its build request failed.
  // Avoid rebuilding an unchanged site four times a day.
  try {
    const live = await fetch('https://ascendo.lol/randomff/catalogue.json?refresh=' + Date.now(), {
      cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
    needsBuild = !live.ok || JSON.stringify(await live.json()) !== JSON.stringify(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    needsBuild = true;
  }
} else {
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('add', '--', file);
  git('commit', '-m', 'Refresh complete Family Friendly video catalogue');
  // Other publishers may update unrelated pages during the crawl. Rebase our
  // single catalogue commit; never force-push or overwrite their work.
  for (let attempt = 0; ; attempt++) {
    git('pull', '--rebase', 'origin', 'main');
    try {
      git('push', 'origin', 'HEAD:main');
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  needsBuild = true;
}
if (needsBuild) {
  const response = await fetch('https://api.github.com/repos/internalcheat/ascendo.lol/pages/builds', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Could not request the existing GitHub Pages build: ' + response.status);
  console.log('Requested the existing Pages build for the complete channel catalogue.');
}
