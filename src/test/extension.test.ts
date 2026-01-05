import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE, parseBranchList } from '../extension';
import { parseAzureDevopsPrUrl } from '../azure/azureDevops';

suite('AI PR Review Extension', () => {
	test('activates and registers commands', async () => {
		const ext = vscode.extensions.all.find(e => e.packageJSON?.name === 'ai-pr-review');
		assert.ok(ext, 'Extension with name "ai-pr-review" should be present');

		await ext!.activate();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('ai-pr-review.run'), 'Command ai-pr-review.run should be registered');
		assert.ok(commands.includes('ai-pr-review.setFileName'), 'Command ai-pr-review.setFileName should be registered');
		assert.ok(commands.includes('ai-pr-review.setPromptComment'), 'Command ai-pr-review.setPromptComment should be registered');
	});

	test('buildPrompt uses default template and substitutes file name', () => {
		const result = buildPrompt(undefined, 'diff.txt');
		assert.ok(result.length > 0, 'Prompt should not be empty');
		assert.ok(result.includes('diff.txt'), 'Prompt should include provided file name');
		// Ensure it matches default shape
		assert.ok(DEFAULT_PROMPT_TEMPLATE.includes('${FILE_NAME}'));
	});

	test('buildPrompt respects provided template with placeholder', () => {
		const tpl = 'File: ${FILE_NAME}';
		const result = buildPrompt(tpl, 'my.diff');
		assert.strictEqual(result, 'File: my.diff');
	});

	test('parseBranchList trims and filters lines', () => {
		const raw = '\n main\n feature/test \n  \n';
		const branches = parseBranchList(raw);
		assert.deepStrictEqual(branches, ['main', 'feature/test']);
	});

	test('parseAzureDevopsPrUrl parses dev.azure.com pullrequest URL', () => {
		const url = 'https://dev.azure.com/samuelthien/test-project/_git/test-repo/pullrequest/335937';
		const parsed = parseAzureDevopsPrUrl(url);
		assert.strictEqual(parsed.organization, 'samuelthien');
		assert.strictEqual(parsed.project, 'test-project');
		assert.strictEqual(parsed.repository, 'test-repo');
		assert.strictEqual(parsed.pullRequestId, 335937);
		assert.strictEqual(parsed.baseUrl, 'https://dev.azure.com/samuelthien');
	});
});
