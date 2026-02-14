package tunnel

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"sync"

	"github.com/blackhole/service/internal/registry"
	"github.com/gorilla/websocket"
)

const (
	// Control message types
	msgRegister = "register"
	msgRequest  = "request"
	msgResponse = "response"
)

type controlMessage struct {
	Type      string `json:"type"`
	Endpoint  string `json:"endpoint,omitempty"`
	AuthToken string `json:"authToken,omitempty"`
}

// AgentTunnel implements registry.Tunnel by forwarding HTTP over WebSocket.
type AgentTunnel struct {
	conn     *websocket.Conn
	endpoint string
	reg      *registry.Registry
	mu       sync.Mutex
	ch       chan *responsePayload
}

type responsePayload struct {
	Data []byte
}

func (t *AgentTunnel) ForwardRequest(r *http.Request) (*http.Response, error) {
	data, err := httputil.DumpRequest(r, true)
	if err != nil {
		return nil, err
	}

	t.mu.Lock()
	if t.ch == nil {
		t.ch = make(chan *responsePayload, 1)
	}
	ch := t.ch
	t.mu.Unlock()

	if err := t.conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
		return nil, err
	}

	respData := <-ch
	if respData == nil {
		return nil, io.EOF
	}

	return http.ReadResponse(bufio.NewReader(bytes.NewReader(respData.Data)), r)
}

// Close shuts down the tunnel. Does not call Unregister (avoids deadlock with Registry).
func (t *AgentTunnel) Close() error {
	t.unblockForward()
	return t.conn.Close()
}

func (t *AgentTunnel) unblockForward() {
	t.mu.Lock()
	ch := t.ch
	t.ch = nil
	t.mu.Unlock()
	if ch != nil {
		select {
		case ch <- nil:
		default:
		}
	}
}

// Server handles WebSocket connections from agents.
type Server struct {
	reg    *registry.Registry
	upgrader websocket.Upgrader
}

// NewServer creates a new tunnel server.
func NewServer(reg *registry.Registry) *Server {
	return &Server{
		reg: reg,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// ListenAndServe starts the WebSocket server.
func (s *Server) ListenAndServe(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/tunnel", s.handleTunnel)
	return http.ListenAndServe(addr, mux)
}

// HandleTunnel returns an http.HandlerFunc for mounting in a shared mux.
func (s *Server) HandleTunnel(w http.ResponseWriter, r *http.Request) {
	s.handleTunnel(w, r)
}

func (s *Server) handleTunnel(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade: %v", err)
		return
	}
	defer conn.Close()

	// First message must be register
	_, data, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Read register: %v", err)
		return
	}

	var msg controlMessage
	if err := json.Unmarshal(data, &msg); err != nil || msg.Type != msgRegister || msg.Endpoint == "" {
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error":"invalid register"}`))
		return
	}

	// Optional shared secret: if BHOLE_AUTH_TOKEN is set, CLI must send matching authToken
	if want := os.Getenv("BHOLE_AUTH_TOKEN"); want != "" {
		if msg.AuthToken != want {
			conn.WriteMessage(websocket.TextMessage, []byte(`{"error":"unauthorized: invalid or missing auth token"}`))
			return
		}
	}

	tunnel := &AgentTunnel{conn: conn, endpoint: msg.Endpoint, reg: s.reg, ch: make(chan *responsePayload)}
	s.reg.Register(msg.Endpoint, tunnel, "")
	defer s.reg.Unregister(msg.Endpoint)

	conn.WriteMessage(websocket.TextMessage, []byte(`{"ok":true}`))

	// Read responses from agent and unblock ForwardRequest
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			tunnel.unblockForward()
			return
		}
		tunnel.mu.Lock()
		ch := tunnel.ch
		tunnel.mu.Unlock()
		if ch != nil {
			select {
			case ch <- &responsePayload{Data: data}:
			default:
			}
		}
	}
}
