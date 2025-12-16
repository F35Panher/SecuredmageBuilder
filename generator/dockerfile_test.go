package generator

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerate(t *testing.T) {
	// Define our table of test cases
	testCases := []struct {
		name            string // A descriptive name for the test case
		request         DockerfileRequest
		expectError     bool
		expectedError   string
		expectedContent []string // Substrings we expect to find in the Dockerfile
		expectedWarning string   // A specific warning we expect to see
	}{
		{
			name: "Happy Path - Valid request with non-root user",
			request: DockerfileRequest{
				BaseImage:    "alpine:3.18",
				AppPort:      8080,
				Dependencies: []string{"nodejs", "npm"},
				User:         "node",
			},
			expectError: false,
			expectedContent: []string{
				"FROM alpine:3.18",
				"USER node",
				"EXPOSE 8080",
				"RUN apk add --no-cache nodejs npm",
			},
		},
		{
			name: "Error Case - Requesting root user",
			request: DockerfileRequest{
				BaseImage: "alpine:3.18",
				User:      "root",
			},
			expectError:   true,
			expectedError: "running as 'root' user is not allowed",
		},
		{
			name: "Warning Case - Using latest tag",
			request: DockerfileRequest{
				BaseImage: "alpine:latest",
				User:      "appuser",
			},
			expectError: false,
			expectedContent: []string{
				"FROM alpine:latest",
				"USER appuser",
			},
			expectedWarning: "Using the 'latest' tag for a base image is not recommended for production.",
		},
		{
			name: "Default User - User field is empty",
			request: DockerfileRequest{
				BaseImage: "alpine:3.18",
				AppPort:   3000,
			},
			expectError: false,
			expectedContent: []string{
				"USER appuser", // Should default to 'appuser'
				"RUN addgroup -S appuser && adduser -S appuser -G appuser",
			},
		},
	}

	// Iterate over the test cases
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := Generate(tc.request)

			if tc.expectError {
				require.Error(t, err, "Expected an error but got none")
				assert.Contains(t, err.Error(), tc.expectedError, "Error message did not match")
			} else {
				require.NoError(t, err, "Did not expect an error but got one")
				for _, content := range tc.expectedContent {
					assert.Contains(t, resp.DockerfileContent, content, "Dockerfile content is missing expected string")
				}
				if tc.expectedWarning != "" {
					assert.Contains(t, resp.SecurityWarnings, tc.expectedWarning, "Expected a security warning")
				}
			}
		})
	}
}
