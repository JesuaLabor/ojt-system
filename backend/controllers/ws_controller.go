package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, check origin
	},
}

// Client represents a connected user
type Client struct {
	UserID uint
	Conn   *websocket.Conn
	Send   chan []byte
}

// Hub maintains the set of active clients
type Hub struct {
	clients    map[uint]*Client
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

var MainHub = Hub{
	clients:    make(map[uint]*Client),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			
			// Send initial list of online users to the new client
			onlineUserIDs := make([]uint, 0, len(h.clients))
			for id := range h.clients {
				onlineUserIDs = append(onlineUserIDs, id)
			}
			h.mu.Unlock()

			initialStatus, _ := json.Marshal(map[string]interface{}{
				"type":     "initial_online_users",
				"user_ids": onlineUserIDs,
			})
			client.Send <- initialStatus

			h.broadcastStatus(client.UserID, true)
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
				h.mu.Unlock()
				h.broadcastStatus(client.UserID, false)

				// Update LastSeen in DB
				now := time.Now()
				config.DB.Model(&models.User{}).Where("id = ?", client.UserID).Update("last_seen", now)
			} else {
				h.mu.Unlock()
			}
		}
	}
}

func (h *Hub) broadcastStatus(userID uint, isOnline bool) {
	statusMsg, _ := json.Marshal(map[string]interface{}{
		"type":      "user_status",
		"user_id":   userID,
		"is_online": isOnline,
	})
	
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, client := range h.clients {
		select {
		case client.Send <- statusMsg:
		default:
			close(client.Send)
			delete(h.clients, client.UserID)
		}
	}
}

func (h *Hub) IsUserOnline(userID uint) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	_, ok := h.clients[userID]
	return ok
}

// BroadcastEvent sends a message to all connected clients
func (h *Hub) BroadcastEvent(event interface{}) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshalling broadcast event: %v", err)
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	for _, client := range h.clients {
		select {
		case client.Send <- data:
		default:
			close(client.Send)
			delete(h.clients, client.UserID)
		}
	}
}


func (h *Hub) BroadcastToUser(userID uint, message []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if client, ok := h.clients[userID]; ok {
		select {
		case client.Send <- message:
		default:
			close(client.Send)
			delete(h.clients, userID)
		}
	}
}

func HandleWS(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uint)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WS upgrade error: %v", err)
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	MainHub.register <- client

	// Read pump
	go func() {
		defer func() {
			MainHub.unregister <- client
			conn.Close()
		}()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}
			// Handle incoming messages if needed (e.g., typing indicators)
			var data map[string]interface{}
			if err := json.Unmarshal(message, &data); err == nil {
				if data["type"] == "typing" {
					receiverID := uint(data["receiver_id"].(float64))
					typingMsg, _ := json.Marshal(map[string]interface{}{
						"type":       "typing",
						"sender_id":  userID,
						"is_typing": data["is_typing"],
					})
					MainHub.BroadcastToUser(receiverID, typingMsg)
				}
			}
		}
	}()

	// Write pump
	go func() {
		defer conn.Close()
		for {
			message, ok := <-client.Send
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			conn.WriteMessage(websocket.TextMessage, message)
		}
	}()
}
