import * as vscode from "vscode";
import { execSync, spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { registerChatParticipant } from "./chat/participant";
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from "./prompt";
import { DEFAULT_FILE_NAME } from "./constants";
export { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from "./prompt";
import { getBranches, sortTargetBranches } from "./git/branches";
export { parseBranchList } from "./git/branches";
import {
  fetchAzureDevopsPullRequest,
  getAzureDevopsPat,
  parseAzureDevopsPrUrl,
  refNameToRemoteBranch,
} from "./azure/azureDevops";

function runGit(
  workspacePath: string,
  args: string[],
  opts?: { stdoutToFile?: string; stdoutAppend?: boolean }
): void {
  const stdio: any[] = ["ignore", "pipe", "pipe"];
  let fd: number | undefined;

  if (opts?.stdoutToFile) {
    fd = fs.openSync(opts.stdoutToFile, opts.stdoutAppend ? "a" : "w");
    stdio[1] = fd;
  }

  const res = spawnSync("git", args, { cwd: workspacePath, stdio });
  if (fd !== undefined) {
    try {
      fs.closeSync(fd);
    } catch {
      // ignore
    }
  }
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString() : "";
    throw new Error(`git ${args.join(" ")} failed. ${stderr}`.trim());
  }
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
        const gitRemote =
          (config.get<string>("gitRemote") as string | undefined) ?? "origin";

        // --- Get all branches sorted by recency ---
        const branches = getBranches(workspacePath);

        // --- Source branch dropdown ---
        const srcBranch = await vscode.window.showQuickPick(branches, {
          placeHolder: "Select source branch (changes)",
        });
        if (!srcBranch) {
          vscode.window.showErrorMessage("Source branch required");
          return;
        }

        // --- Target branch dropdown ---
        const tgtBranch = await vscode.window.showQuickPick(
          sortTargetBranches(branches, gitRemote),
          {
            placeHolder: "Select target branch",
          }
        );
        if (!tgtBranch) {
          vscode.window.showErrorMessage("Target branch required");
          return;
        }

        // --- Generate diff ---
        const diffFile = path.join(workspacePath, fileName);
        vscode.window.showInformationMessage(
          `Generating diff: ${tgtBranch}...${srcBranch} ...`
        );

        // Fetch latest from the configured remote.
        // Avoid refspec issues when the user selects remote-tracking branches like "origin/feature-x".
        runGit(workspacePath, ["fetch", "--prune", gitRemote]);

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

  const reviewAzurePrDisposable = vscode.commands.registerCommand(
    "ai-pr-review.reviewAzurePr",
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
        const gitRemote =
          (config.get<string>("gitRemote") as string | undefined) ?? "origin";

        const prUrl = await vscode.window.showInputBox({
          title: "Azure DevOps PR URL",
          placeHolder:
            "https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}",
          validateInput: (value) => {
            try {
              parseAzureDevopsPrUrl(value);
              return undefined;
            } catch (e: any) {
              return e?.message ?? "Invalid Azure DevOps PR URL";
            }
          },
        });
        if (!prUrl) {
          return;
        }

        const prRef = parseAzureDevopsPrUrl(prUrl);
        const { pat, sourceEnvVar } = getAzureDevopsPat(
          config.get<string>("azureDevops.patEnvVar") as string | undefined
        );

        vscode.window.showInformationMessage(
          `Fetching PR ${prRef.pullRequestId} from Azure DevOps (PAT: ${sourceEnvVar})...`
        );
        const pr = await fetchAzureDevopsPullRequest(prRef, pat);

        // Best-effort repo sanity check: ensure git remote points to this ADO repo.
        try {
          const remoteUrl = execSync(`git remote get-url ${gitRemote}`, {
            cwd: workspacePath,
          })
            .toString()
            .trim();
          const expectedNeedle = `/${prRef.project}/_git/${prRef.repository}`;
          if (!remoteUrl.includes(expectedNeedle)) {
            const choice = await vscode.window.showWarningMessage(
              `Your git remote "${gitRemote}" doesn't look like ${prRef.project}/${prRef.repository}. Continue anyway?`,
              { modal: true },
              "Continue",
              "Cancel"
            );
            if (choice !== "Continue") {
              return;
            }
          }
        } catch {
          // ignore sanity check failures (remote may not exist, etc.)
        }

        const srcRemoteBranch = refNameToRemoteBranch(pr.sourceRefName, gitRemote);
        const tgtRemoteBranch = refNameToRemoteBranch(pr.targetRefName, gitRemote);

        // Prefer fetching the exact remote-tracking refs to ensure `git diff` works.
        // + forces update (like --force), and maps heads to remote-tracking branches.
        const headPrefix = "refs/heads/";
        if (!pr.sourceRefName.startsWith(headPrefix) || !pr.targetRefName.startsWith(headPrefix)) {
          throw new Error(
            `Unsupported ref name from Azure DevOps. source=${pr.sourceRefName}, target=${pr.targetRefName}`
          );
        }
        const srcShort = pr.sourceRefName.slice(headPrefix.length);
        const tgtShort = pr.targetRefName.slice(headPrefix.length);
        const fetchRefspecs = [
          `+refs/heads/${srcShort}:refs/remotes/${gitRemote}/${srcShort}`,
          `+refs/heads/${tgtShort}:refs/remotes/${gitRemote}/${tgtShort}`,
        ];

        vscode.window.showInformationMessage(
          `Fetching branches for diff: ${tgtRemoteBranch}...${srcRemoteBranch}`
        );
        runGit(workspacePath, ["fetch", gitRemote, ...fetchRefspecs]);

        const diffFile = path.join(workspacePath, fileName);
        const header =
          `# Azure DevOps PR\n` +
          `PR: ${prRef.prUrl}\n` +
          `ID: ${pr.pullRequestId}\n` +
          `Title: ${pr.title ?? ""}\n` +
          `Source: ${pr.sourceRefName}\n` +
          `Target: ${pr.targetRefName}\n` +
          `\n` +
          `## Description\n` +
          `${pr.description ?? ""}\n` +
          `\n` +
          `---\n` +
          `\n`;

        fs.writeFileSync(diffFile, header, "utf8");
        runGit(
          workspacePath,
          ["diff", `${tgtRemoteBranch}...${srcRemoteBranch}`],
          { stdoutToFile: diffFile, stdoutAppend: true }
        );

        const doc = await vscode.workspace.openTextDocument(diffFile);
        vscode.window.showTextDocument(doc);

        const promptComment = buildPrompt(
          config.get<string>("promptComment") as string | undefined,
          fileName
        );
        const initialQuery = `@reviewer review ${fileName}\n\n${promptComment}`;
        await vscode.commands.executeCommand(
          "workbench.action.chat.open",
          initialQuery
        );

        vscode.window.showInformationMessage(
          "Azure DevOps PR diff ready! Review opened in Copilot Chat."
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
  context.subscriptions.push(reviewAzurePrDisposable);
  context.subscriptions.push(disposable);
}

export function deactivate() { }
