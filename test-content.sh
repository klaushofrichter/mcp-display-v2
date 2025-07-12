#!/bin/zsh
set -e

echo "$0: showing content in the display"

# Display some text content
echo "Displaying text content..."
TIMESTAMP=$(date)
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"display_text\",\"arguments\":{\"content\":\"Hello from the shell script!\\n\\nThis is a multi-line text display example.\\n\\nFeatures:\\n- Line breaks are preserved\\n- Monospace font for code-like appearance\\n- Perfect for showing logs, code, or structured text\\n\\nTimestamp: $TIMESTAMP\"}}}"

echo ""
echo "Displaying URL content..."
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"open_url","arguments":{"url":"https://github.com"}}}'

