# Change Log

All notable changes to the "ai-pr-review" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.2] - 2026-01-05

- Initial release
- Command `ai-pr-review.run` to select source/target branches and generate PR-style diff
- Opens diff and starts Copilot Chat with configurable review prompt
- New setting `ai-pr-review.promptComment` with `${FILE_NAME}` placeholder support
- Command `ai-pr-review.setPromptComment` to quickly edit the prompt via Settings
- New setting `ai-pr-review.fileName` to specify the diff file name
- Command `ai-pr-review.setFileName` to quickly edit the diff file name via Settings
- Added chat participant `@reviewer` for code review tasks