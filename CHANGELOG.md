# Change Log

All notable changes to the "ai-pr-review" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.3.0](https://github.com/samuelabc/ai-pr-review-vscode-extension/compare/v0.2.5...v0.3.0) (2026-01-05)


### Features

* Implement Azure DevOps PR review functionality ([046e606](https://github.com/samuelabc/ai-pr-review-vscode-extension/commit/046e606cecb803af8796f0e7966cf14f38c1574b))
* Implement Azure DevOps PR review functionality, including command registration and configuration options for PAT and git remote. Enhance git operations with new utility functions for fetching and parsing PR details. ([26929b2](https://github.com/samuelabc/ai-pr-review-vscode-extension/commit/26929b22ffed842641c51e94a5477d034c7c6360))


### Bug Fixes

* smoke test release-please ([#2](https://github.com/samuelabc/ai-pr-review-vscode-extension/issues/2)) ([f16376a](https://github.com/samuelabc/ai-pr-review-vscode-extension/commit/f16376a593ced2a1b835f56714c4624036fee2e3))

## [Unreleased]

## [0.2.5] - 2026-01-05

### Added

- Command `ai-pr-review.reviewAzurePr` to review Azure DevOps PR URLs.
- Setting `ai-pr-review.gitRemote` to specify the git remote name (default: `origin`).
- Setting `ai-pr-review.azureDevops.patEnvVar` to specify the Azure DevOps PAT environment variable (default: `AZURE_DEVOPS_EXT_PAT`).

## [0.2.2] - 2026-01-05

### Added

- Initial release.
- Command `ai-pr-review.run` to select source/target branches and generate a PR-style diff.
- Opens the diff and starts Copilot Chat with a configurable review prompt.
- Setting `ai-pr-review.promptComment` with `${FILE_NAME}` placeholder support.
- Command `ai-pr-review.setPromptComment` to quickly edit the prompt via Settings.
- Setting `ai-pr-review.fileName` to specify the diff file name.
- Command `ai-pr-review.setFileName` to quickly edit the diff file name via Settings.
- Chat participant `@reviewer` for code review tasks.

[Unreleased]: https://github.com/samuelabc/ai-pr-review-vscode-extension/compare/v0.2.5...HEAD
[0.2.5]: https://github.com/samuelabc/ai-pr-review-vscode-extension/compare/v0.2.2...v0.2.5
[0.2.2]: https://github.com/samuelabc/ai-pr-review-vscode-extension/releases/tag/v0.2.2
