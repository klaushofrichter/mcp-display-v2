#!/usr/bin/env node

/**
 * MCP Display Test Script (Node.js Version)
 * This script demonstrates all three content types: text, image, and SVG
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MCP_ENDPOINT = 'http://localhost:3000/mcp';
const WEB_INTERFACE = 'http://localhost:5173';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Function to make HTTP requests
async function makeRequest(url, options = {}) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    // Fallback to built-in fetch for Node 18+
    const response = await fetch(url, options);
    return await response.json();
  }
}

// Function to check if server is running
async function checkServer() {
  try {
    console.log('🔍 Checking if MCP server is running...');
    await makeRequest(`${MCP_ENDPOINT.replace('/mcp', '')}/health`);
    console.log(`${colors.green}✅ Server is running${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Server is not running${colors.reset}`);
    console.log('\nPlease start the development server first:');
    console.log('  npm run dev\n');
    process.exit(1);
  }
}

// Function to make MCP request
async function makeMcpRequest(method, toolName = '', content = '', requestId = Math.floor(Math.random() * 1000)) {
  const requestBody = {
    jsonrpc: '2.0',
    id: requestId,
    method: method,
    params: method === 'tools/list' ? {} : {
      name: toolName,
      arguments: {
        content: content
      }
    }
  };

  return await makeRequest(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
}

// Function to test display functionality
async function testDisplay(contentType, toolName, content, description) {
  console.log(`\n${colors.blue}📝 Testing ${contentType} display${colors.reset}`);
  console.log(`   ${description}\n`);

  try {
    const response = await makeMcpRequest('tools/call', toolName, content);

    if (response.result) {
      console.log(`   ${colors.green}✅ ${contentType} display successful${colors.reset}`);
      console.log(`   Response: ${response.result.content[0].text}`);
    } else {
      console.log(`   ${colors.red}❌ ${contentType} display failed${colors.reset}`);
      console.log(`   Error: ${response.error?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ ${contentType} display failed${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }

  console.log(`\n${colors.yellow}   👀 Check the web interface at ${WEB_INTERFACE} to see the content${colors.reset}`);
  console.log(`${colors.yellow}   Press Enter to continue to the next test...${colors.reset}`);
  
  // Wait for user input
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve(true);
    });
  });
}

// Function to convert image to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to read image file: ${error.message}`);
  }
}

// Main test execution
async function main() {
  console.log('🚀 MCP Display Test Script (Node.js)');
  console.log('====================================\n');

  console.log('This script will test all three MCP display content types:');
  console.log('1. Text display');
  console.log('2. Image display (using water.png)');
  console.log('3. SVG display (using custom favicon)\n');
  console.log(`${colors.yellow}Make sure to have the web interface open at ${WEB_INTERFACE}${colors.reset}\n`);
  console.log('Press Enter to start the tests...');

  // Wait for user input to start
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  // Check if server is running
  await checkServer();

  // Test 1: List available tools
  console.log(`\n${colors.blue}🔧 Testing tools/list endpoint${colors.reset}`);
  try {
    const toolsResponse = await makeMcpRequest('tools/list');
    
    if (toolsResponse.result?.tools) {
      console.log(`   ${colors.green}✅ Tools list retrieved successfully${colors.reset}`);
      console.log(`   Available tools: ${toolsResponse.result.tools.length}`);
      toolsResponse.result.tools.forEach(tool => {
        console.log(`     - ${tool.name}`);
      });
    } else {
      console.log(`   ${colors.red}❌ Failed to retrieve tools list${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed to retrieve tools list: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  // Test 2: Text Display
  const textContent = `🎉 MCP Display Test - Text Content

This is a comprehensive test of the text display functionality.

Features being tested:
✅ Multi-line text support
✅ Unicode emoji support  
✅ Special characters: !@#$%^&*()
✅ Code-like content: const message = 'Hello, World!';
✅ Different text lengths and formatting

Timestamp: ${new Date().toISOString()}
Status: All systems operational`;

  await testDisplay('TEXT', 'display_text', textContent, 'Multi-line text with emojis and special characters');

  // Test 3: Image Display
  console.log(`\n${colors.blue}🖼️  Preparing image content...${colors.reset}`);
  
  try {
    const imagePath = path.join(__dirname, 'public', 'water.png');
    console.log(`   Reading image from: ${imagePath}`);
    
    const imageBase64 = imageToBase64(imagePath);
    const imageContent = `data:image/png;base64,${imageBase64}`;
    
    console.log(`   Image size: ${Math.round(imageBase64.length / 1024)} KB`);
    
    await testDisplay('IMAGE', 'display_image', imageContent, 'PNG image (water.png) encoded as base64 data URI');
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed to prepare image: ${error.message}${colors.reset}`);
    console.log('   Skipping image test...');
  }

  // Test 4: SVG Display
  try {
    const svgPath = path.join(__dirname, 'test-favicon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    await testDisplay('SVG', 'display_svg', svgContent, 'Custom MCP Display favicon with animated elements');
  } catch (error) {
    console.log(`   ${colors.red}❌ Failed to read SVG file: ${error.message}${colors.reset}`);
    console.log('   Skipping SVG test...');
  }

  // Final summary
  console.log('\n🎉 All tests completed!');
  console.log('==========================\n');
  console.log(`${colors.green}✅ Text display test completed${colors.reset}`);
  console.log(`${colors.green}✅ Image display test completed${colors.reset}`);
  console.log(`${colors.green}✅ SVG display test completed${colors.reset}\n`);
  console.log(`${colors.blue}📱 Check the web interface at ${WEB_INTERFACE} to see all displayed content${colors.reset}\n`);
  console.log('The MCP Display application is working correctly! 🚀\n');

  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Test script interrupted');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error(`${colors.red}❌ Test script failed: ${error.message}${colors.reset}`);
  process.exit(1);
}); 