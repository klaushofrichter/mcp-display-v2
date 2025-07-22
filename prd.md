# MCP Display Product Requirements Document

## Functionality
* We create a local MCP server that supports HTTP transport
* The server is locally run on MacOS
* When launched, the MCP server offers a port where a browser can connect to
* The MCP server offers these tools to MCP clients:
  * Text display: the MCP client provides simple ASCII text that is then shown in a conected browser
  * Image display: the MCP client provides base64 encoded image data that is then shown in the connected browser. It is possible to provide an optional short string value that is shown as "caption" underneath the image display. 
  * SVG display: the MCP client provides an SVG object that is shown in the connected browser. It is possible to provide an optional short string value that is shown as "caption" underneath the image display. 
  * Image URL display: the MCP client provides a URL to an image that is shown in the connected browser. It is possible to provide an optional short string value that is shown as "caption" underneath the image display. 
  * open_url - this receives a single string with a URL from the client. The dislpay is then opening another tab to navigate. Additionally, the content display shows a clickable link to the URL and a log entry is shown
  to the given URL.
* There is a button on the screen that clears the window
* There is a sidebar that shows a log of MCP client connections

# Implementation 
* We use NodeJS 20.19 or better, we do not use typescript
* We build a single page web application 
* We use VUE3 composition API with vite for the browser application
* We make sure that the server ports are fixed and not dynamic
* We create a script that terminates the servers by terminating the processes that use the fixed ports
* We implement commonly used MCP protocol elements, including these:
  * /register
  * /initialize
* We implement a /health endpoint for all servers

# Application UI design
* There is a narrow MCP log section on the left side
  * there is a button "clear log" that removes all logs (but keeps the content)
  * there is a limit of 200 log entries. After that older logs are removed
* There is a wide content display section on the right side, with a "clear display" button 
  * the clear display button removes currently displayed content (but keeps the log)
  * We can remove old content when there are more than 100 content items displayed
* there are scrollbars for the log and the content section
* new content is shown on top. 
* each content card has an indicator for the type and time of the content display on the left of the card, and the actual content on the right, left-aligned
* We create a favicon the shows a monitor
* It is possible to adjust the width of the left and right columns dynamicallu with a resize handle

# Documentation
* We create an detailed README.md, including these sections:
  * installation
  * configuration
    * configuration of the MCP server
    * configuration of popular MCP clients, specifically "claude code" and "gemini cli"
  * software structure
  * test

# Testing
* We use playwright for application tests
  * Chromium tests are sufficient
  * We include tests that verify that content is actually displayed on the browser
* We use jest for api tests
* We implement unit tests where applicable
* we make sure that the server can be launched without error
* we create a test script that displays examples of the supported content types

# Other Infornation
* We use best practices for software design and project structure
* We prefer readability of code over efficiency and performance
* We use only well known 3rd party software packages, and use the latest stable version
  * specifically, we use modelcontextprotocol/sdk 1.15.0 or better
* We use the MIT licence
* We do not edit the prd.md file
* after completion of the project, re-read this prd.md and confirm that requirements are met
* after completion of the project, run all tests