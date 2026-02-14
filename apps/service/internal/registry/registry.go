package registry

import (
	"net/http"
	"sync"
)

// Tunnel represents a connection from an agent that can receive proxied requests.
type Tunnel interface {
	ForwardRequest(r *http.Request) (*http.Response, error)
	Close() error
}

// Registry maps endpoint names to connected tunnels.
type Registry struct {
	mu         sync.RWMutex
	tunnels    map[string]Tunnel
	endpointToUser map[string]string
}

// New creates a new tunnel registry.
func New() *Registry {
	return &Registry{
		tunnels:       make(map[string]Tunnel),
		endpointToUser: make(map[string]string),
	}
}

// Register associates an endpoint with a tunnel. Overwrites any existing tunnel for the endpoint.
// Replacing a tunnel closes the old one; must not call Unregister from Close to avoid deadlock.
// userID is optional; when present, usage is attributed to that user for billing.
func (r *Registry) Register(endpoint string, t Tunnel, userID string) {
	r.mu.Lock()
	old := r.tunnels[endpoint]
	r.tunnels[endpoint] = t
	if userID != "" {
		r.endpointToUser[endpoint] = userID
	} else {
		delete(r.endpointToUser, endpoint)
	}
	r.mu.Unlock()
	if old != nil {
		old.Close()
	}
}

// Unregister removes the tunnel for an endpoint. Does not call Close (caller must close);
// calling Close from here would deadlock since AgentTunnel.Close calls Unregister.
func (r *Registry) Unregister(endpoint string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tunnels, endpoint)
	delete(r.endpointToUser, endpoint)
}

// Get returns the tunnel for an endpoint, or nil if none exists.
func (r *Registry) Get(endpoint string) Tunnel {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.tunnels[endpoint]
}

// GetUserID returns the user ID for an endpoint, or "" if unknown.
func (r *Registry) GetUserID(endpoint string) string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.endpointToUser[endpoint]
}

// List returns all registered endpoint names.
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	names := make([]string, 0, len(r.tunnels))
	for name := range r.tunnels {
		names = append(names, name)
	}
	return names
}
