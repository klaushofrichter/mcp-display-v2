<template>
  <div class="mcp-display" :class="{ 'resizing': isResizing }">
    <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div class="sidebar-header">
        <h2>MCP Connections</h2>
        <button @click="clearLogs" class="clear-logs-button">Clear Logs</button>
      </div>
      <div class="sidebar-content">
        <div v-if="logEntries.length === 0" class="empty-state">
          <p>No connections yet</p>
        </div>
        <div v-else>
          <div v-for="entry in logEntries" :key="entry.id" class="log-entry">
            <div class="log-time">{{ formatTime(entry.timestamp) }}</div>
            <div class="log-message">{{ entry.message }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div 
      class="resizer" 
      @mousedown="startResize"
      :class="{ 'resizing': isResizing }"
    ></div>
    
    <div class="main-content">
      <div class="main-header">
        <h1>MCP Display</h1>
        <button @click="clearDisplay" class="clear-button">Clear Display</button>
      </div>
      <div class="content-area">
        <div v-if="contentItems.length === 0" class="empty-state">
          <h3>No content to display</h3>
          <p>Content from MCP clients will appear here</p>
        </div>
        <div v-else>
          <div v-for="item in contentItems" :key="item.id" class="content-card">
            <div class="content-meta">
              <div class="content-type">{{ formatContentType(item.type) }}</div>
              <div class="content-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <div class="content-body">
              <div v-if="item.type === 'text'" class="text-content">{{ item.content }}</div>
              <div v-else-if="item.type === 'image' || item.type === 'image-url'" class="image-content">
                <img :src="item.content" :alt="`Image content from ${formatTime(item.timestamp)}`" />
                <div v-if="item.caption" class="content-caption">{{ item.caption }}</div>
              </div>
              <div v-else-if="item.type === 'svg'" class="svg-content">
                <div v-html="item.content"></div>
                <div v-if="item.caption" class="content-caption">{{ item.caption }}</div>
              </div>
              <div v-else-if="item.type === 'url'" class="url-content">
                <div class="url-notice">Click the link below to open the URL:</div>
                <a :href="item.content" target="_blank" rel="noopener noreferrer" class="url-link">
                  <span class="url-icon">🔗</span>
                  <span class="url-text">{{ item.content }}</span>
                  <span class="external-indicator">↗</span>
                </a>
                <div v-if="item.caption" class="content-caption">{{ item.caption }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'App',
  setup() {
    const contentItems = ref([])
    const logEntries = ref([])
    const sidebarWidth = ref(300)
    const isResizing = ref(false)
    let socket = null
    let nextId = 1

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    const formatContentType = (type) => {
      const typeMap = {
        'text': 'Text',
        'image': 'Image',
        'image-url': 'Image-URL',
        'svg': 'SVG',
        'url': 'URL'
      }
      return typeMap[type] || type.toUpperCase()
    }

    const clearDisplay = () => {
      contentItems.value = []
      addLogEntry('Display cleared by user')
    }

    const clearLogs = () => {
      logEntries.value = []
    }

    const addLogEntry = (message) => {
      logEntries.value.unshift({
        id: nextId++,
        timestamp: Date.now(),
        message
      })
      
      // Keep only last 100 log entries
      if (logEntries.value.length > 100) {
        logEntries.value = logEntries.value.slice(0, 100)
      }
    }

    const addContentItem = (type, content, caption = null) => {
      contentItems.value.unshift({
        id: nextId++,
        type,
        content,
        caption,
        timestamp: Date.now()
      })
      
      // Keep only last 50 content items
      if (contentItems.value.length > 50) {
        contentItems.value = contentItems.value.slice(0, 50)
      }
    }

    const startResize = (e) => {
      isResizing.value = true
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
      e.preventDefault()
    }

    const handleResize = (e) => {
      if (!isResizing.value) return
      
      const newWidth = e.clientX
      const minWidth = 200
      const maxWidth = window.innerWidth - 400 // Leave at least 400px for main content
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebarWidth.value = newWidth
      }
    }

    const stopResize = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    }

    const connectWebSocket = () => {
      try {
        socket = new WebSocket('ws://localhost:3001')
        
        socket.onopen = () => {
          addLogEntry('Connected to MCP server')
        }
        
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'content') {
              addContentItem(data.contentType, data.content, data.caption)
              addLogEntry(`Received ${data.contentType} content`)
            } else if (data.type === 'openUrl') {
              try {
                const newWindow = window.open(data.url, '_blank')
                if (newWindow === null || newWindow === undefined) {
                  addLogEntry(`⚠️  Popup blocked! Please allow popups for this site or click the URL link to open: ${data.url}`)
                } else {
                  addLogEntry(`✅ Opened URL in new tab: ${data.url}`)
                }
              } catch (error) {
                addLogEntry(`❌ Failed to open URL (popup blocked): ${data.url}`)
                console.error('Popup blocked:', error)
              }
            } else if (data.type === 'log') {
              addLogEntry(data.message)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
            addLogEntry('Error parsing message from server')
          }
        }
        
        socket.onclose = () => {
          addLogEntry('Disconnected from MCP server')
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }
        
        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          addLogEntry('WebSocket connection error')
        }
      } catch (error) {
        console.error('Error connecting to WebSocket:', error)
        addLogEntry('Failed to connect to MCP server')
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
    }

    onMounted(() => {
      connectWebSocket()
    })

    onUnmounted(() => {
      if (socket) {
        socket.close()
      }
      // Clean up event listeners
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    })

    return {
      contentItems,
      logEntries,
      sidebarWidth,
      isResizing,
      formatTime,
      formatContentType,
      clearDisplay,
      clearLogs,
      startResize
    }
  }
}
</script> 