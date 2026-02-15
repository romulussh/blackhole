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

	reg := registry.New()
	proxyHandler := proxy.New(reg)
	serviceAPIHandler := serviceapi.New(reg)
	tunnelServer := tunnel.NewServer(reg)

	router := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		if strings.HasPrefix(path, "/api/") {
			serviceAPIHandler.ServeHTTP(w, r)
			return
		}
		if path == "/tunnel" {
			tunnelServer.HandleTunnel(w, r)
			return
		}
		proxyHandler.ServeHTTP(w, r)
	})

	log.Printf("Blackhole service listening on %s (any host with cert)", addr)
	if err := http.ListenAndServe(addr, router); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server: %v", err)
	}
}
