/**
 * 把本仓库推送到 GitHub（需要联网）。
 *
 * 为什么要有这个脚本：
 *   这个仓库用 HTTPS 推送，而 Windows 把 GitHub 的登录凭据存在「凭据管理器」里。
 *   直接在 PowerShell 里拼推送地址，令牌会出现在命令行历史里，不太干净；
 *   而且 PowerShell 处理中文提交信息时容易乱码。
 *   这里统一用 Node 读取凭据并调用 git，避免这两个问题。
 *
 * 用法：node scripts/push.mjs "提交说明"
 *       不写提交说明时，只做推送、不提交。
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'zhangjh-psy';
const REPO = 'digital-life-attitude-scale';
const REMOTE = `https://github.com/${OWNER}/${REPO}.git`;

/** 从 Windows 凭据管理器读取 GitHub 令牌（调 PowerShell 的 Win32 API） */
function readToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  const ps = String.raw`
$sig = @"
using System;
using System.Runtime.InteropServices;
public class C {
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  static extern bool CredReadW(string target, uint type, uint flags, out IntPtr cred);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  struct CRED {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public long LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
  }
  public static string Get(string t) {
    IntPtr p;
    if (!CredReadW(t, 1, 0, out p)) return null;
    try {
      CRED c = (CRED)Marshal.PtrToStructure(p, typeof(CRED));
      byte[] b = new byte[c.CredentialBlobSize];
      Marshal.Copy(c.CredentialBlob, b, 0, (int)c.CredentialBlobSize);
      return System.Text.Encoding.Unicode.GetString(b);
    } finally { CredFree(p); }
  }
}
"@
Add-Type -TypeDefinition $sig -Language CSharp -ErrorAction SilentlyContinue
[Console]::Out.Write([C]::Get("git:https://github.com"))
`;
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

const message = process.argv[2];
const run = (args, opts = {}) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe', ...opts });

// 有提交说明就先提交（--allow-empty 让没改动时也不报错）
if (message) {
  run(['add', '-A']);
  run(['-c', 'core.safecrlf=false', 'commit', '-m', message]);
  console.log(`[push] 已提交：${message}`);
}

const token = readToken();
if (!token) {
  console.error(
    '[push] 没读到 GitHub 令牌。请确认 Windows 凭据管理器里有 git:https://github.com，\n' +
      '       或先设置环境变量 GITHUB_TOKEN，然后重试。',
  );
  process.exit(1);
}

// 一次性把带令牌的地址传给 git，不写进 remote 配置，避免令牌留在仓库里
const withToken = `https://${OWNER}:${token}@github.com/${OWNER}/${REPO}.git`;
const out = run(['push', withToken, 'main:main'], { stdio: ['ignore', 'pipe', 'pipe'] });
process.stdout.write(out);
console.log('[push] 完成');
