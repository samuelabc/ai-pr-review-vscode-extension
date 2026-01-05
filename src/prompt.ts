export const DEFAULT_PROMPT_TEMPLATE = `# AI Code Review Prompt
# Review the following code changes in \${FILE_NAME}.
# Please provide detailed feedback focusing on:

# 1. Correctness
#    - Identify potential bugs or logical errors.
#    - Verify that the code meets the intended behavior.

# 2. Performance
#    - Highlight inefficient algorithms or operations.
#    - Suggest improvements if applicable.

# 3. Readability & Maintainability
#    - Comment on code clarity, naming, and structure.
#    - Suggest refactoring opportunities.

# 4. Security
#    - Identify vulnerabilities or unsafe patterns.
#    - Suggest mitigations or safer alternatives.

# Instructions:
# - Provide actionable feedback and examples when possible.
# - Keep comments concise and precise.
# - Avoid generic statements; focus on the code in context.

`;

export function buildPrompt(template: string | undefined, fileName: string): string {
  const t = template ?? DEFAULT_PROMPT_TEMPLATE;
  return t.replaceAll("${FILE_NAME}", fileName);
}
