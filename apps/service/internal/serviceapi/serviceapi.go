package serviceapi

import (
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"time"

	"github.com/blackhole/service/internal/registry"
)

// Handler serves the Service API.
type Handler struct {
	reg       *registry.Registry
	startTime time.Time
}

// New creates a Service API handler.
func New(reg *registry.Registry) *Handler {
	return &Handler{reg: reg, startTime: time.Now()}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	switch r.URL.Path {
	case "/api/tunnels", "/api/tunnels/":
		h.handleTunnels(w)
	case "/api/health", "/api/health/":
		h.handleHealth(w)
	default:
		http.NotFound(w, r)
	}
}

func (h *Handler) handleTunnels(w http.ResponseWriter) {
	endpoints := h.reg.List()
	json.NewEncoder(w).Encode(map[string]any{"tunnels": endpoints})
}

func (h *Handler) handleHealth(w http.ResponseWriter) {
	uptime := time.Since(h.startTime).Seconds()
	region := os.Getenv("FLY_REGION")
	if region == "" {
		region = "local"
	}
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 && n < 65536 {
			port = n
		}
	}
	info := map[string]any{
		"status":   "ok",
		"version":  os.Getenv("BHOLE_VERSION"),
		"image":    os.Getenv("BHOLE_IMAGE"),
		"region":   region,
		"uptime_s": uptime,
		"started":  h.startTime.UTC().Format(time.RFC3339),
		"go":       runtime.Version(),
		"tunnels":  len(h.reg.List()),
		"ports":    map[string]int{"http": port, "tunnel": port, "api": port},
	}
	if info["version"] == "" {
		info["version"] = "dev"
	}
	json.NewEncoder(w).Encode(info)
}
