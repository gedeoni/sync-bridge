#!/usr/bin/env bash
set -euo pipefail

# Print nice header
echo -e "\033[1;36m──────────────────────────────────────────────────\033[0m"
echo -e "\033[1;36m🔧 Configuring sync-bridge Monorepo Git Hooks\033[0m"
echo -e "\033[1;36m──────────────────────────────────────────────────\033[0m"

# Configure hooks path
echo -e "⚙️ Setting core.hooksPath to root .githooks..."
git config core.hooksPath .githooks

# Make pre-commit executable
if [ -f .githooks/pre-commit ]; then
    echo -e "🔑 Ensuring .githooks/pre-commit is executable..."
    chmod +x .githooks/pre-commit
    echo -e "\033[0;32m✓ Hook configured successfully.\033[0m"
else
    echo -e "\033[0;31m❌ Error: .githooks/pre-commit not found at root!\033[0m"
    exit 1
fi

echo -e "\033[1;32m✅ Git hooks setup completed successfully!\033[0m"
echo -e "\033[1;36m──────────────────────────────────────────────────\033[0m"
