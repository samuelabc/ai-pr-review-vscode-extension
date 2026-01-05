# ai-pr-review README

[![CI](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/ci.yml)

This extension:
1. Ask for source branch (branch with changes)
2. Ask for target branch (branch to compare against)
3. Generate a .diff file using git diff
4. Open the diff in a new VSCode editor tab
5. Open Copilot Chat and a dedicated chat participant to review the diff

## Settings
- **`ai-pr-review.fileName`**: Filename for the generated diff in your workspace (default: `ai_code_review.diff`).
- **`ai-pr-review.promptComment`**: Template used when opening Copilot Chat. Supports `${FILE_NAME}` placeholder which is replaced with the generated diff file name.

## Commands
- **`AI PR Review`** (`ai-pr-review.run`): Generate diff and open Copilot Chat.
- **`AI PR Review: Edit File Name`** (`ai-pr-review.setFileName`): Open Settings to change the diff file name.
- **`AI PR Review: Edit Prompt`** (`ai-pr-review.setPromptComment`): Open Settings to change the review prompt template.

## AI Chat Participant
- A participant named `reviewer` is registered in the Chat view. It consumes your generated diff and responds using the review rubric (Correctness, Performance, Readability, Security).
- After running `AI PR Review`, the Chat view opens with `@reviewer` prefilled.
- You can use intents like:
	- `review` — full rubric-based review of the diff
	- `summarize` — high-level summary of changes and risk areas
	- `tests` — propose missing test cases
	- `security` — scan for insecure patterns
	- `refactor` — suggest maintainability improvements

### Tips
- If no diff file exists, run `AI PR Review` from the Command Palette.
- You can also paste or type code snippets directly in Chat; the participant will consider them in context.

## Release
- Tag a commit (e.g., `v0.1.0`) to build and upload a `.vsix` artifact via GitHub Actions.

### Publish to Marketplace
- Set a repository secret named `VSCE_PAT` containing your Visual Studio Marketplace Personal Access Token.
- On tag push (`v*`), the release workflow will publish automatically if `VSCE_PAT` is present.
- To generate a token, see: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token