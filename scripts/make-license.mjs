/**
 * 生成 LICENSE 文件（CC BY 4.0）。
 *
 * 为什么用脚本而不是手写：
 *   CC BY 4.0 是法律文本，一个字都不能抄错。
 *   这里直接从 Creative Commons 官方地址拉取规范的 legalcode，
 *   前面拼上本项目的署名头，保证 LICENSE 既准确又明确指向本项目。
 *
 * 用法：node scripts/make-license.mjs
 * 需要联网。生成一次即可，不必每次运行。
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const LEGALCODE_URL = 'https://creativecommons.org/licenses/by/4.0/legalcode.txt';

/** 项目根目录（本脚本在 scripts/ 下） */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 署名头：声明本项目的版权人与协议，并给出官方协议地址 */
const HEADER = `数字生命态度测评 (Digital Life Attitude Scale, DLAS)
Copyright (c) 2026 ZHANG Junhui (zhangjh-psy)

本项目采用 Creative Commons Attribution 4.0 International (CC BY 4.0) 协议。
你可以自由地共享和演绎本项目（包括商业目的），但必须署名并标明是否作了修改。
协议要点见：https://creativecommons.org/licenses/by/4.0/deed.zh

以下为 CC BY 4.0 官方协议全文（来源：${LEGALCODE_URL}）
=======================================================================

`;

const res = await fetch(LEGALCODE_URL);
if (!res.ok) {
  console.error(`[make-license] 下载失败：HTTP ${res.status}`);
  process.exit(1);
}
const legalcode = await res.text();

// 简单校验，避免把错误页写进 LICENSE
if (!legalcode.includes('Creative Commons Attribution 4.0 International Public License')) {
  console.error('[make-license] 下载到的内容不像 CC BY 4.0 正文，已中止');
  process.exit(1);
}

const target = path.join(root, 'LICENSE');
writeFileSync(target, HEADER + legalcode, 'utf8');
console.log(`[make-license] 已生成 ${target}（${legalcode.length} 字节正文）`);
