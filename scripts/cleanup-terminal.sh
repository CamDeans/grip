#!/bin/bash

# List of files to remove
files_to_remove=(
  "src/components/terminal/Terminal.module.css"
  "src/components/terminal/TerminalWrapper.tsx"
  "src/components/terminal/GuidedTerminalWrapper.module.css"
  "src/lib/config/terminal.ts"
  "src/lib/services/GuidedTerminal.ts"
  "src/lib/workers/terminal.worker.ts"
)

# Remove each file
for file in "${files_to_remove[@]}"; do
  if [ -f "$file" ]; then
    echo "Removing $file..."
    rm "$file"
  fi
done

# Remove terminal-related dependencies from package.json
echo "Removing terminal-related dependencies..."
npm uninstall xterm xterm-addon-fit xterm-addon-web-links bufferutil utf-8-validate ws

# Clean up any remaining terminal references in other files
echo "Cleaning up terminal references..."
find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.css" | xargs sed -i '/terminal/d'

echo "Terminal cleanup complete!" 