package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"securedimagebuilder/generator"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

// loggingResponseWriter is a wrapper around http.ResponseWriter to capture the status code.
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// loggingMiddleware logs the details of each request.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(lrw, r)

		logger.Info("request handled", "method", r.Method, "path", r.URL.Path, "remote_addr", r.RemoteAddr, "status", lrw.statusCode, "duration", time.Since(start))
	})
}

// writeJSONError is a helper function to create a standard JSON error response.
func writeJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// generateHandler decodes an HTTP request, calls the generator, and sends a response.
func generateHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		writeJSONError(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var req generator.DockerfileRequest
	// Decode the incoming JSON request body into our request struct
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, "Invalid JSON format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Add validation for the request fields
	if req.BaseImage == "" {
		writeJSONError(w, "BaseImage field is required", http.StatusBadRequest)
		return
	}

	// Call the core Generate function
	resp, err := generator.Generate(req)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Set the content type and send the successful JSON response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		logger.Error("failed to encode response", "error", err)
	}
}

// healthCheckHandler responds with a simple status OK message.
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	// Set up structured logging as the default.
	slog.SetDefault(logger)

	mux := http.NewServeMux()

	// API handlers
	mux.Handle("/generate", loggingMiddleware(http.HandlerFunc(generateHandler)))
	mux.Handle("/healthz", loggingMiddleware(http.HandlerFunc(healthCheckHandler)))

	// This file server will handle all non-API requests. It serves files from the 'static'
	// directory. It will automatically serve 'index.html' for the root path "/" and
	// will also correctly serve other assets like 'style.css' and 'app.js'.
	mux.Handle("/", http.FileServer(http.Dir("./static")))

	// Make port configurable via environment variable, with a default.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	addr := ":" + port

	// Create a server object to have more control over its behavior.
	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	// Create a channel to listen for OS signals for shutdown.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// Run the server in a separate goroutine so that it doesn't block.
	go func() {
		logger.Info("Starting Dockerfile generator server", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Could not listen on address", "addr", server.Addr, "error", err)
			os.Exit(1)
		}
	}()

	// Block the main goroutine until a shutdown signal is received.
	<-stop

	logger.Info("Shutting down server...")

	// Create a context with a timeout to allow existing requests to finish.
	// This gives active connections 10 seconds to complete.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Attempt the graceful shutdown by telling the server to stop accepting new
	// connections and wait for active ones to finish.
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("Server gracefully stopped")
}
