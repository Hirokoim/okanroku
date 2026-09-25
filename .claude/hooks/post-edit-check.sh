#!/bin/bash
# Claude Codeがファイルを編集した直後に型チェック・lintを走らせ、エラーがあれば
# Claudeに知らせるだけのフック。自動修正はしない（直すかどうかはClaude自身の判断に委ねる）。

cd "$(dirname "$0")/../.." || exit 0

context=""

if ! tc_out=$(npm run -s typecheck 2>&1); then
  context="${context}## typecheck エラー
\`\`\`
${tc_out}
\`\`\`
"
fi

if ! lint_out=$(npm run -s lint 2>&1); then
  context="${context}## lint エラー
\`\`\`
${lint_out}
\`\`\`
"
fi

if [ -n "$context" ]; then
  jq -n --arg ctx "$context" '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":$ctx}}'
fi

exit 0
