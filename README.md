# AI PR Review (VS Code Extension)

[![Release](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/release.yml/badge.svg)](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/release.yml)
[![Release Please](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/release-please.yml/badge.svg)](https://github.com/samuelabc/ai-pr-review-vscode-extension/actions/workflows/release-please.yml)
[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/SamuelThien.ai-pr-review)](https://marketplace.visualstudio.com/items?itemName=SamuelThien.ai-pr-review)
[![VS Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/SamuelThien.ai-pr-review)](https://marketplace.visualstudio.com/items?itemName=SamuelThien.ai-pr-review)
[![VS Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/SamuelThien.ai-pr-review)](https://marketplace.visualstudio.com/items?itemName=SamuelThien.ai-pr-review)
[![License](https://img.shields.io/github/license/samuelabc/ai-pr-review-vscode-extension)](LICENSE.txt)

This extension lets you generate a PR-style diff from two branches or directly from an Azure DevOps Pull Request URL and send it straight to GitHub Copilot Chat, with `@reviewer` ready to review.

It’s designed to make local code review easier and more effective. By consolidating all changes into a single diff and pairing it with a structured prompt, you can get useful Copilot feedback early, before opening a PR or asking teammates to review.

## Quick start (2 minutes)
- Open a folder that contains a **git repo**.
- Make sure **GitHub Copilot Chat** is enabled in VS Code (and you’re signed in).
- Open the Command Palette(Ctrl+Shift+P) and run **`AI PR Review`**.
- Pick:
	- **source** branch = the branch with changes
	- **target** branch = the branch you’re comparing against
- The extension will:
	- fetch from your configured remote
	- write a diff file into your workspace
	- open the diff
	- open Copilot Chat with `@reviewer` pre-filled

## What it does (under the hood)
1. Ask for **source** + **target** branches
2. Run `git diff target...source` and save it to a workspace file
3. Open the diff in an editor tab
4. Open Copilot Chat with a dedicated participant (`@reviewer`) and your configured prompt template

## Settings
- **`ai-pr-review.fileName`**: Filename for the generated diff in your workspace (default: `ai_code_review.diff`).
- **`ai-pr-review.promptComment`**: Template used when opening Copilot Chat. Supports `${FILE_NAME}` placeholder which is replaced with the generated diff file name.
- **`ai-pr-review.gitRemote`**: Git remote name used for fetch/diff operations (default: `origin`).
- **`ai-pr-review.azureDevops.patEnvVar`**: Environment variable name containing your Azure DevOps PAT (default: `AZURE_DEVOPS_EXT_PAT`).

### Azure DevOps PAT requirement
- The `AI PR Review: Review Azure DevOps PR URL` command reads your PAT from the VS Code process environment.
- If you set the PAT after VS Code is already running, you may need to **restart VS Code** so the extension can see it.
- Your PAT needs sufficient scope to read PR metadata (typically **Code (Read)**).

## Commands
- **`AI PR Review`** (`ai-pr-review.run`): Generate diff and open Copilot Chat.
- **`AI PR Review: Review Azure DevOps PR URL`** (`ai-pr-review.reviewAzurePr`): Paste an Azure DevOps PR URL, fetch PR title/description + branches, generate a local diff, and open Copilot Chat.
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
- **Automated (recommended)**:
	- Merge changes into `main` using **Conventional Commits** (examples: `feat: ...`, `fix: ...`, `chore: ...`).
	- GitHub Actions **Release Please** will open (or update) a **release PR** that bumps `package.json` + `CHANGELOG.md`.
	- Merge the release PR → it will create a git tag like `v0.2.6`, which triggers the **Release** workflow to build and upload a `.vsix` (and publish if configured).

- **Manual (fallback)**:
	- Tag a commit (e.g., `v0.2.6`) to build and upload a `.vsix` artifact via GitHub Actions.

### Publish to Marketplace
- Set a repository secret named `VSCE_PAT` containing your Visual Studio Marketplace Personal Access Token.
- On tag push (`v*`), the release workflow will publish automatically if `VSCE_PAT` is present.
- To generate a token, see: [Publishing Extensions: Personal Access Token](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)
