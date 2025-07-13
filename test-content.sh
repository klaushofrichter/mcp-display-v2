#!/bin/zsh
set -e

echo "$0: showing content in the display"

# Display some text content
echo "Displaying text content..."
TIMESTAMP=$(date)
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"display_text\",\"arguments\":{\"content\":\"Hello from the shell script!\\n\\nThis is a multi-line text display example.\\n\\nFeatures:\\n- Line breaks are preserved\\n- Monospace font for code-like appearance\\n- Perfect for showing logs, code, or structured text\\n\\nTimestamp: $TIMESTAMP\"}}}"

echo ""
echo "Displaying HTML content..."
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"display_html","arguments":{"content":"<h1>HTML Display Test</h1><p>This is a <strong>comprehensive HTML test</strong> showing various supported elements.</p><h2>Text Formatting</h2><p>We support <strong>bold text</strong>, <em>italic text</em>, <b>bold with b tag</b>, <i>italic with i tag</i>, and <u>underlined text</u>.</p><h3>Lists</h3><ul><li>Unordered list item 1</li><li>Unordered list item 2</li><li>Nested list:<ol><li>Ordered nested item 1</li><li>Ordered nested item 2</li></ol></li></ul><h3>Links and Images</h3><p>External link: <a href=\"https://github.com\">GitHub</a></p><p>Image example:</p><img src=\"https://via.placeholder.com/300x200/0066cc/ffffff?text=HTML+Test+Image\" alt=\"Test Image\" width=\"300\" height=\"200\"><blockquote>This is a blockquote example showing quoted text with proper styling.</blockquote><h3>Code Example</h3><pre><code>function greet(name) {\\n  return `Hello, ${name}!`;\\n}\\n\\nconsole.log(greet(\"World\"));</code></pre><h3>Table Example</h3><table><thead><tr><th>Feature</th><th>Status</th><th>Description</th></tr></thead><tbody><tr><td>HTML Display</td><td>✅ Active</td><td>Renders safe HTML content</td></tr><tr><td>Text Display</td><td>✅ Active</td><td>Plain text with line breaks</td></tr><tr><td>Image Display</td><td>✅ Active</td><td>Images and SVG support</td></tr><tr><td>URL Opening</td><td>✅ Active</td><td>Opens links in new tabs</td></tr></tbody></table><div><p>This content is wrapped in a div for additional structure.</p></div>","caption":"HTML Test Content - Demonstrating various HTML elements and styling"}}}'

echo ""
echo "Displaying URL content..."
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"open_url","arguments":{"url":"https://github.com","caption":"GitHub - Code Repository Platform"}}}'

