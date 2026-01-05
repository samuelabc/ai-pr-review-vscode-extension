import * as vscode from "vscode";
import { execSync } from "child_process";
import * as path from "path";
import { registerChatParticipant } from "./chat/participant";
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from "./prompt";
import { DEFAULT_FILE_NAME } from "./constants";
export { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from "./prompt";

// Exported for testing: normalize and filter branches list from git output
export function parseBranchList(raw: string): string[] {
  return raw
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

export function activate(context: vscode.ExtensionContext) {
  // Register chat participant via helper
  const participant = registerChatParticipant(context);
  context.subscriptions.push(participant);

  const disposable = vscode.commands.registerCommand(
    "ai-pr-review.run",
    async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("Open a folder with a git repo first");
          return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration("ai-pr-review");
        const fileName =
          (config.get<string>("fileName") as string | undefined) ??
          DEFAULT_FILE_NAME;

        // --- Get all branches sorted by recency ---
        const branchesRaw = execSync(
          'git for-each-ref --sort=-committerdate --format="%(refname:short)" refs/heads/ refs/remotes/',
          { cwd: workspacePath }
        );
        const branches = parseBranchList(branchesRaw.toString());

        // --- Source branch dropdown ---
        const srcBranch = await vscode.window.showQuickPick(branches, {
          placeHolder: "Select source branch (changes)",
        });
        if (!srcBranch) {
          vscode.window.showErrorMessage("Source branch required");
          return;
        }

        // --- Target branch dropdown ---
        const tgtBranch = await vscode.window.showQuickPick(branches, {
          placeHolder: "Select target branch",
        });
        if (!tgtBranch) {
          vscode.window.showErrorMessage("Target branch required");
          return;
        }

        // --- Generate diff ---
        const diffFile = path.join(workspacePath, fileName);
        vscode.window.showInformationMessage(
          `Generating diff: ${tgtBranch}...${srcBranch} ...`
        );

        // Optional fetch
        execSync(`git fetch origin ${srcBranch} ${tgtBranch}`, {
          cwd: workspacePath,
        });

        // Generate PR-style diff
        execSync(`git diff ${tgtBranch}...${srcBranch} > "${diffFile}"`, {
          cwd: workspacePath,
        });

        // --- Open diff in editor ---
        const doc = await vscode.workspace.openTextDocument(diffFile);
        vscode.window.showTextDocument(doc);

        // Read promptComment from settings (with a default). Supports ${FILE_NAME} placeholder.
        const promptComment = buildPrompt(
          config.get<string>("promptComment") as string | undefined,
          fileName
        );
        // Open Chat UI targeting this participant with an initial query
        const initialQuery = `@reviewer review ${fileName}\n\n${promptComment}`;
        await vscode.commands.executeCommand(
          "workbench.action.chat.open",
          initialQuery
        );

        vscode.window.showInformationMessage(
          'Diff ready! Copilot Chat participant added. Type "@reviewer" in the chat to start review.'
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    }
  );

  // Command to quickly open settings to edit the promptComment
  let openPromptCommentSettings = vscode.commands.registerCommand(
    "ai-pr-review.setPromptComment",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "ai-pr-review.promptComment"
      );
    }
  );

  // Command to quickly open settings to edit the fileName
  let openFileNameSettings = vscode.commands.registerCommand(
    "ai-pr-review.setFileName",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "ai-pr-review.fileName"
      );
    }
  );

  context.subscriptions.push(openPromptCommentSettings);
  context.subscriptions.push(openFileNameSettings);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
