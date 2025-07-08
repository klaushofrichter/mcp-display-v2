#!/bin/zsh

claude mcp remove mcp-display
claude mcp add-json mcp-display '{"type":"http","url":"http://localhost:3000/mcp","description":"A MCP server that offers tools for display of text, image and SVG"}'

claude mcp remove een-mcp
claude mcp add-json een-mcp '{"type":"http","url":"http://localhost:2999/mcp","description":"A MCP server for the EEN API offering cameras and images"}'
