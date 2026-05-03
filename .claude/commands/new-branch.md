Create a new git branch from the latest main. Branch name: $ARGUMENTS

Steps:

1. Switch to main and pull latest:
```bash
git checkout main
git pull origin main 2>/dev/null || true
```

2. Create and switch to the new branch:
```bash
git checkout -b $ARGUMENTS
```

Use these prefixes:
- `feature/` for new features — e.g. `feature/search`, `feature/tags`
- `fix/` for bug fixes — e.g. `fix/checklist-save`, `fix/modal-close`

Confirm the branch was created and show the current branch with `git branch --show-current`.
