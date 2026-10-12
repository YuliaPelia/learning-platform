// PostToolUse-хук: після змін у src/ або prisma/ запускає typecheck і тести.
// Помилка → exit 2 + вивід у stderr, щоб Claude побачив її й виправив.
import { spawnSync } from "node:child_process";
import { relative } from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let file = "";
try {
  const input = JSON.parse(raw);
  file = input.tool_response?.filePath ?? input.tool_input?.file_path ?? "";
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(root, file);
if (!rel || rel.startsWith("..") || !/^(src|prisma)\//.test(rel)) process.exit(0);

const run = spawnSync("npm run typecheck && npm test", { cwd: root, shell: true, encoding: "utf8" });
if (run.status !== 0) {
  process.stderr.write(`Автоперевірка не пройшла після зміни ${rel}:\n${run.stdout}${run.stderr}`);
  process.exit(2);
}
