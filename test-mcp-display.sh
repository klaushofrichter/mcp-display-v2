#!/bin/bash

# MCP Display Test Script
# This script demonstrates all three content types: text, image, and SVG

set -e

echo "🚀 MCP Display Test Script"
echo "=========================="
echo ""

# Configuration
MCP_ENDPOINT="http://localhost:3000/mcp"
WEB_INTERFACE="http://localhost:5173"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server() {
    echo -n "🔍 Checking if MCP server is running... "
    if curl -s "$MCP_ENDPOINT/info" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running${NC}"
        echo ""
        echo "Please start the development server first:"
        echo "  npm run dev"
        echo ""
        exit 1
    fi
}

# Function to make MCP request
make_mcp_request() {
    local method="$1"
    local tool_name="$2"
    local content="$3"
    local request_id="$4"
    
    if [ "$method" == "tools/list" ]; then
        curl -s -X POST "$MCP_ENDPOINT" \
            -H "Content-Type: application/json" \
            -d "{
                \"jsonrpc\": \"2.0\",
                \"id\": $request_id,
                \"method\": \"$method\",
                \"params\": {}
            }"
    else
        curl -s -X POST "$MCP_ENDPOINT" \
            -H "Content-Type: application/json" \
            -d "{
                \"jsonrpc\": \"2.0\",
                \"id\": $request_id,
                \"method\": \"$method\",
                \"params\": {
                    \"name\": \"$tool_name\",
                    \"arguments\": {
                        \"content\": $(echo "$content" | jq -R .)
                    }
                }
            }"
    fi
}

# Function to test display functionality
test_display() {
    local content_type="$1"
    local tool_name="$2"
    local content="$3"
    local description="$4"
    
    echo ""
    echo -e "${BLUE}📝 Testing $content_type display${NC}"
    echo "   $description"
    echo ""
    
    local response
    response=$(make_mcp_request "tools/call" "$tool_name" "$content" "$((RANDOM % 1000))")
    
    if echo "$response" | jq -e '.result' > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ $content_type display successful${NC}"
        local result_text
        result_text=$(echo "$response" | jq -r '.result.content[0].text')
        echo "   Response: $result_text"
    else
        echo -e "   ${RED}❌ $content_type display failed${NC}"
        echo "   Error: $(echo "$response" | jq -r '.error.message // "Unknown error"')"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}   👀 Check the web interface at $WEB_INTERFACE to see the content${NC}"
    echo -e "${YELLOW}   Press Enter to continue to the next test...${NC}"
    read -r
}

# Main test execution
main() {
    echo "This script will test all three MCP display content types:"
    echo "1. Text display"
    echo "2. Image display (using water.png)"
    echo "3. SVG display (using custom favicon)"
    echo ""
    echo -e "${YELLOW}Make sure to have the web interface open at $WEB_INTERFACE${NC}"
    echo ""
    echo "Press Enter to start the tests..."
    read -r
    
    # Check if server is running
    check_server
    
    # Test 1: List available tools
    echo ""
    echo -e "${BLUE}🔧 Testing tools/list endpoint${NC}"
    local tools_response
    tools_response=$(make_mcp_request "tools/list" "" "" 1)
    
    if echo "$tools_response" | jq -e '.result.tools' > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Tools list retrieved successfully${NC}"
        local tool_count
        tool_count=$(echo "$tools_response" | jq '.result.tools | length')
        echo "   Available tools: $tool_count"
        echo "$tools_response" | jq -r '.result.tools[].name' | sed 's/^/     - /'
    else
        echo -e "   ${RED}❌ Failed to retrieve tools list${NC}"
        exit 1
    fi
    
    # Test 2: Text Display
    local text_content="🎉 MCP Display Test - Text Content
    
This is a comprehensive test of the text display functionality.

Features being tested:
✅ Multi-line text support
✅ Unicode emoji support  
✅ Special characters: !@#$%^&*()
✅ Code-like content: const message = 'Hello, World!';
✅ Different text lengths and formatting

Timestamp: $(date)
Status: All systems operational"

    test_display "TEXT" "display_text" "$text_content" "Multi-line text with emojis and special characters"
    
    # Test 3: Image Display
    echo ""
    echo -e "${BLUE}🖼️  Preparing image content...${NC}"
    
    # Read the base64 content
    if [ ! -f "/tmp/water_base64.txt" ]; then
        echo "   Converting water.png to base64..."
        base64 -i public/water.png | tr -d '\n' > /tmp/water_base64.txt
    fi
    
    local image_base64
    image_base64=$(cat /tmp/water_base64.txt)
    local image_content="data:image/png;base64,$image_base64"
    
    test_display "IMAGE" "display_image" "$image_content" "PNG image (water.png) encoded as base64 data URI"
    
    # Test 4: SVG Display  
    local svg_content
    svg_content=$(cat test-favicon.svg)
    
    test_display "SVG" "display_svg" "$svg_content" "Custom MCP Display favicon with animated elements"
    
    # Final summary
    echo ""
    echo "🎉 All tests completed!"
    echo "=========================="
    echo ""
    echo -e "${GREEN}✅ Text display test completed${NC}"
    echo -e "${GREEN}✅ Image display test completed${NC}"
    echo -e "${GREEN}✅ SVG display test completed${NC}"
    echo ""
    echo -e "${BLUE}📱 Check the web interface at $WEB_INTERFACE to see all displayed content${NC}"
    echo ""
    echo "The MCP Display application is working correctly! 🚀"
    echo ""
}

# Check for required dependencies
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed. Aborting." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required but not installed. Please install jq first." >&2; exit 1; }

# Run the main function
main "$@" 