# MCP Display Product Requirements Document

## Functionality
* We create a local MCP server that supports HTTP transport
* The server is locally run on MacOS
* When launched, the MCP server offers a port where a browser can connect ca
* The MCP server offers these tools to MCP clients:
  * Text display: the MCP client provides simple ASCII text that is then shown in a conected browser
  * Image display: the MCP client provides base64 encoded image data that is then shown in the connected browser
  * SVG display: the MCP client provides an SVG object that is shown in the connected browser
* There is a button on the screen that clears the window
* There is a sidebar that shows a log of MCP client connections
* We build a single page web application 

# Implementation 
* We use NodeJS 20.19 or better, we do not use typescript
* We use VUE3 composition API with vite for the browser application

# Application UI design
* There is a narrow MCP log section on the left side
* There is a wide content display section on the right side, with a "clear display" button 
  * the clear display button removes currently displayed content
* there are scrollbars for the log and the content section
* new content is shown on top. 
* each content card has an indicator for the type and time of the content display on the left of the card, and the actual content on the right, left-aligned
* There is a favicon the shows a monitor

# Documentation
* We create an detailed README.md, including these sections:
  * installation
  * configuration
  * software structure
  * test

# Testing
* We use playwright for application tests
  * Chromium tests are sufficient
  * We include tests that verify that content is actually displayed on the browser
* We use jest for api tests
* We implement unit tests where applicable

# Other Infornation
* We use best practices for software design and project structure
* We prefer readability of code over efficiency and performance
* We use only well known 3rd party software packages, and use the latest stabke version
  * specifically, we use modelcontextprotocol/sdk 1.15.0 or better
* We do not edit the prd.md file
