---
description: Pre-Commit ESLint Fix and TypeCheck Command. Run this command manually before committing your changes to ensure all modified files pass ESLint validation and TypeScript type checking.
---

1. Checks git status for all changed files (staged and unstaged)
2. Filters for JavaScript/TypeScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
3. Runs `npx eslint --fix` on each changed file
4. Runs `yarn typecheck:apps` to verify TypeScript types
5. Reports results and any remaining errors

## Command Flow

```bash
# Get all changed files (staged + unstaged)
git status --porcelain | awk '{print $2}' | grep -E '\.(tsx?|jsx?)$'

# Run eslint --fix on each file
npx eslint <file> --fix

# Check for remaining errors
npx eslint <file> --quiet

# Run TypeScript type checking
yarn typecheck:apps
```

## Expected Outcome

- All auto-fixable ESLint errors are resolved
- All TypeScript type errors are resolved
- Any remaining errors are reported for manual fixing
- Files are ready for commit

## Note

If `yarn typecheck:apps` fails, you must fix all TypeScript errors before committing.
