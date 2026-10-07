/**
 * 在 GitHub 上创建本仓库（如果还不存在）。
 *
 * 为什么用脚本：
 *   仓库描述是中文。PowerShell 在中文 Windows 下把中文字符串拼进 JSON
 *   请求体时常被按 GBK 编码，导致 GitHub 收到乱码描述。
 *   这里用 Node 明确以 UTF-8 组装并发送请求，可避免这个问题。
 *
 * 认证：优先读环境变量 GITHUB_TOKEN；
 *       否则从 Windows 凭据管理器读取 git:https://github.com 中保存的凭据
 *       （之前 push 时 Windows 帮你存下的那个）。
 *
 * 用法：node scripts/create-repo.mjs
 */
import { execFileSync } from 'node:child_process';

const OWNER = 'zhangjh-psy';
const REPO = 'digital-life-attitude-scale';
const DESCRIPTION = '数字生命态度测评（Digital Life Attitude Scale, DLAS）：20 题四维度自评量表，单文件纯前端实现，无后端、无追踪。';
const HOMEPAGE = `https://${OWNER}.github.io/${REPO}/`;

/** 读取环境变量里的 token */
function fromEnv() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

/**
 * 通过 PowerShell 的 CredentialManager 模块读取 git 保存的凭据。
 * 取不到就返回空字符串，由调用方提示用户手动处理。
 */
function fromCredentialManager() {
  const ps = [
    '$ErrorActionPreference = "Stop"',
    'try {',
    '  Import-Module CredentialManager -ErrorAction Stop',
    '} catch { exit 2 }',
    '$c = Get-StoredCredential -Target "git:https://github.com" -ErrorAction SilentlyContinue',
    'if ($c) { [Console]::Out.Write($c.GetNetworkCredential().Password) } else { exit 3 }',
  ].join('; ');
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const token = fromEnv() || fromCredentialManager();

if (!token) {
  console.error(
    [
      '[create-repo] 没能自动拿到 GitHub 令牌。',
      '',
      '请改用下面任一种方式：',
      '  1) 设置环境变量后重跑：  $env:GITHUB_TOKEN = "你的令牌"; node scripts/create-repo.mjs',
      '  2) 直接在网页上手动新建仓库：https://github.com/new',
      `     仓库名填 ${REPO}，可见性选 Public，不要勾选任何初始化选项，`,
      '     然后回到本地执行 git push -u origin main',
    ].join('\n'),
  );
  process.exit(1);
}

const api = `https://api.github.com/repos/${OWNER}/${REPO}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dlas-setup',
  'X-GitHub-Api-Version': '2022-11-22',
};

/** 先查一下仓库是否已存在 */
const check = await fetch(api, { headers });
if (check.ok) {
  const info = await fetch(api, { headers }).then((r) => r.json());
  console.log(`[create-repo] 仓库已存在：${info.html_url}`);
  process.exit(0);
}

/** 在 zhangjh-psy 账号下创建公开仓库（不自动初始化，避免和本地历史冲突） */
const res = await fetch('https://api.github.com/user/repos', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: REPO,
    description: DESCRIPTION,
    homepage: HOMEPAGE,
    private: false,
    has_issues: true,
    has_wiki: false,
    has_projects: false,
    auto_init: false,
  }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`[create-repo] 创建失败：HTTP ${res.status}\n${text}`);
  process.exit(1);
}

const repo = await res.json();
console.log(`[create-repo] 创建成功：${repo.html_url}`);
console.log(`[create-repo] 描述：${repo.description}`);
