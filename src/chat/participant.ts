import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { buildPrompt } from "../prompt";
import { DEFAULT_FILE_NAME } from "../constants";

async function handleChatRequest(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const config = vscode.workspace.getConfiguration("ai-pr-review");
    const fileName = (config.get<string>("fileName") as string | undefined) ?? DEFAULT_FILE_NAME;

    const workspacePath = workspaceFolders && workspaceFolders[0]?.uri.fsPath;
    const diffFile = workspacePath ? path.join(workspacePath, fileName) : undefined;

    const userPrompt = request.prompt ?? "";

    let diffContent = "";
    if (diffFile && fs.existsSync(diffFile)) {
      try {
        diffContent = fs.readFileSync(diffFile, "utf-8");
      } catch {
        // ignore
      }
    }

    const rubric = buildPrompt(config.get<string>("promptComment") as string | undefined, fileName);

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(rubric),
    ];

    const intent = (userPrompt || "review").trim().toLowerCase();
    const intentHeader = `Task: ${intent}`;
    messages.push(vscode.LanguageModelChatMessage.User(intentHeader));

    if (userPrompt) {
      messages.push(vscode.LanguageModelChatMessage.User(userPrompt));
    }

    if (diffContent) {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `Here is the generated diff file (${fileName}):\n\n\n\n\n\n\n\n${diffContent}`
        )
      );
    } else {
      messages.push(
        vscode.LanguageModelChatMessage.User(
          `No diff file found. Run the command "AI PR Review" to generate ${fileName}, or provide code context via selection or message.`
        )
      );
    }

    if (!request.model) {
      stream.markdown("No AI chat model is available.");
      return;
    }

    const chatResponse = await request.model.sendRequest(messages, {}, token);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }

    stream.markdown(
      "\n\n---\n**Followups:**\n- Summarize key changes\n- List potential breaking changes\n- Suggest missing tests\n- Security risk scan\n- Refactor suggestions"
    );
  } catch (err: any) {
    stream.markdown(`Error while processing request: ${err.message}`);
  }
}

export function registerChatParticipant(context: vscode.ExtensionContext): vscode.Disposable {
  const participant = vscode.chat.createChatParticipant(
    "ai-pr-review.participant",
    handleChatRequest
  );
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "icon.svg");
  return participant;
}
