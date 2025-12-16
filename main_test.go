package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheckHandler(t *testing.T) {
	// Create a request to pass to our handler.
	req, err := http.NewRequest("GET", "/healthz", nil)
	require.NoError(t, err)

	// Create a ResponseRecorder to record the response.
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(healthCheckHandler)

	// Call the handler's ServeHTTP method directly.
	handler.ServeHTTP(rr, req)

	// Check the status code is what we expect.
	assert.Equal(t, http.StatusOK, rr.Code, "handler returned wrong status code")

	// Check the response body is what we expect.
	expected := `{"status":"ok"}`
	assert.JSONEq(t, expected, rr.Body.String(), "handler returned unexpected body")
}

func TestGenerateHandler(t *testing.T) {
	// Define our table of test cases
	testCases := []struct {
		name           string
		method         string
		body           string
		expectedStatus int
		expectedBody   string // Substring to check for in the response body
	}{
		{
			name:           "Happy Path - Valid POST request",
			method:         http.MethodPost,
			body:           `{"BaseImage": "alpine:3.18", "User": "testuser"}`,
			expectedStatus: http.StatusOK,
			expectedBody:   `"DockerfileContent":"# Base Image\nFROM alpine:3.18`, // Check for start of Dockerfile
		},
		{
			name:           "Bad Method - GET request",
			method:         http.MethodGet,
			body:           "",
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "Only POST method is allowed",
		},
		{
			name:           "Bad Request - Malformed JSON",
			method:         http.MethodPost,
			body:           `{"BaseImage": "alpine:3.18"`, // Missing closing brace
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "Invalid JSON format: unexpected EOF",
		},
		{
			name:           "Bad Request - Missing required field",
			method:         http.MethodPost,
			body:           `{"User": "testuser"}`,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   `{"error": "BaseImage field is required"}`,
		},
		{
			name:           "Bad Request - Generator logic error",
			method:         http.MethodPost,
			body:           `{"BaseImage": "alpine:3.18", "User": "root"}`,
			expectedStatus: http.StatusBadRequest,
			expectedBody:   "running as 'root' user is not allowed",
		},
	}

	// Iterate over the test cases
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create a new request with the specified method and body
			req, err := http.NewRequest(tc.method, "/generate", bytes.NewBufferString(tc.body))
			require.NoError(t, err)

			// Create a ResponseRecorder to capture the response
			rr := httptest.NewRecorder()
			handler := http.HandlerFunc(generateHandler)

			// Execute the handler
			handler.ServeHTTP(rr, req)

			// Assert the status code
			assert.Equal(t, tc.expectedStatus, rr.Code, "handler returned wrong status code")

			// Assert the response body contains the expected content
			// Using JSONEq for the specific validation error case for a more precise check
			if tc.expectedBody == `{"error": "BaseImage field is required"}` {
				assert.JSONEq(t, tc.expectedBody, rr.Body.String(), "handler returned unexpected body")
			} else {
				// Using Contains for other cases as the full response can be verbose
				assert.Contains(t, strings.TrimSpace(rr.Body.String()), tc.expectedBody, "handler returned unexpected body")
			}
		})
	}
}
