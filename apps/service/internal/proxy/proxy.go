package proxy

import (
	"bytes"
	"io"
	"net/http"

	"github.com/blackhole/service/internal/registry"
)

const maxRequestBodyBytes = 10 * 1024 * 1024     // 10MB limit to prevent memory exhaustion
const maxResponseBodyBytes = 10 * 1024 * 1024    // 10MB limit for responses

// Proxy forwards incoming HTTP requests to registered tunnels.
type Proxy struct {
	reg *registry.Registry
}

// New creates a new HTTP proxy.
func New(reg *registry.Registry) *Proxy {
	return &Proxy{reg: reg}
}

// ServeHTTP implements http.Handler.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	endpoint := endpointFromRequest(r)
	if endpoint == "" {
		http.Error(w, "Missing X-Blackhole-Endpoint header or Host-based endpoint", http.StatusBadRequest)
		return
	}

	tunnel := p.reg.Get(endpoint)
	if tunnel == nil {
		scheme := "https"
		if r.TLS == nil {
			scheme = "http"
		}
		fullURL := scheme + "://" + r.Host
		if r.URL != nil && r.URL.RequestURI() != "" {
			fullURL += r.URL.RequestURI()
		}
		http.Error(w, "No tunnel registered for "+fullURL, http.StatusBadGateway)
		return
	}

	// Buffer full request body for forwarding, truncate for logging
	var fullReqBody []byte
	if r.Body != nil {
		limited := io.NopCloser(io.LimitReader(r.Body, maxRequestBodyBytes+1))
		fullReqBody, _ = io.ReadAll(limited)
		if len(fullReqBody) > maxRequestBodyBytes {
			http.Error(w, "Request body too large", http.StatusRequestEntityTooLarge)
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(fullReqBody))
	}

	r.RequestURI = ""

	resp, err := tunnel.ForwardRequest(r)
	if err != nil {
		http.Error(w, "Tunnel error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	limitedResp := io.LimitReader(resp.Body, maxResponseBodyBytes+1)
	fullRespBody, _ := io.ReadAll(limitedResp)
	if len(fullRespBody) > maxResponseBodyBytes {
		http.Error(w, "Response body too large", http.StatusBadGateway)
		return
	}

	// Copy response headers and body to client
	for k, v := range resp.Header {
		for _, vv := range v {
			w.Header().Add(k, vv)
		}
	}
	w.WriteHeader(resp.StatusCode)
	w.Write(fullRespBody)
}

// endpointFromRequest extracts the endpoint from Host (first subdomain) or X-Blackhole-Endpoint header.
func endpointFromRequest(r *http.Request) string {
	if ep := r.Header.Get("X-Blackhole-Endpoint"); ep != "" {
		return ep
	}
	// Host: endpoint.example.com -> endpoint
	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	for i, c := range host {
		if c == '.' {
			return host[:i]
		}
	}
	return host
}
