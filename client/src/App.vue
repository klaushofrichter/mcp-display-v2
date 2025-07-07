<template>
  <div class="mcp-display">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>MCP Connections</h2>
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
              <div class="content-type">{{ item.type }}</div>
              <div class="content-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <div class="content-body">
              <div v-if="item.type === 'text'" class="text-content">{{ item.content }}</div>
              <div v-else-if="item.type === 'image'" class="image-content">
                <img :src="item.content" :alt="`Image content from ${formatTime(item.timestamp)}`" />
              </div>
              <div v-else-if="item.type === 'svg'" class="svg-content" v-html="item.content"></div>
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
    let socket = null
    let nextId = 1

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    const clearDisplay = () => {
      contentItems.value = []
      addLogEntry('Display cleared by user')
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

    const addContentItem = (type, content) => {
      contentItems.value.unshift({
        id: nextId++,
        type,
        content,
        timestamp: Date.now()
      })
      
      // Keep only last 50 content items
      if (contentItems.value.length > 50) {
        contentItems.value = contentItems.value.slice(0, 50)
      }
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
              addContentItem(data.contentType, data.content)
              addLogEntry(`Received ${data.contentType} content`)
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
    })

    return {
      contentItems,
      logEntries,
      formatTime,
      clearDisplay
    }
  }
}
</script> 