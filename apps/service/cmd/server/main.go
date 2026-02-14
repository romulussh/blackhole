package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/blackhole/service/internal/proxy"
	"github.com/blackhole/service/internal/registry"
	"github.com/blackhole/service/internal/serviceapi"
	"github.com/blackhole/service/internal/tunnel"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	connectHost := os.Getenv("BHOLE_CONNECT_HOST")
	if connectHost == "" {
		connectHost = "localhost"
	}
	apiHost := os.Getenv("BHOLE_API_HOST")
	if apiHost == "" {
		apiHost = "localhost"
	}

	reg := registry.New()
	proxyHandler := proxy.New(reg)
	serviceAPIHandler := serviceapi.New(reg)
	tunnelServer := tunnel.NewServer(reg)

	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := strings.ToLower(strings.Split(r.Host, ":")[0])
		path := r.URL.Path

		// /api/* always goes to service API (health checks, etc.) regardless of host
		if strings.HasPrefix(path, "/api/") {
			serviceAPIHandler.ServeHTTP(w, r)
			return
		}

		// Path-based /tunnel for non-production hosts (Fly internal, localhost, etc.)
		isProdDomain := host == connectHost || host == apiHost
		if !isProdDomain {
			if path == "/tunnel" {
				tunnelServer.HandleTunnel(w, r)
				return
			}
			proxyHandler.ServeHTTP(w, r)
			return
		}

		// Host-based routing (production)
		if host == connectHost {
			tunnelServer.HandleTunnel(w, r)
			return
		}
		if host == apiHost {
			serviceAPIHandler.ServeHTTP(w, r)
			return
		}
		proxyHandler.ServeHTTP(w, r)
	})

	log.Printf("Blackhole service listening on %s (connect=%s, api=%s)", addr, connectHost, apiHost)
	if err := http.ListenAndServe(addr, router); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server: %v", err)
	}
}
