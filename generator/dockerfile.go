package generator

import (
	"bytes"
	"errors"
	"fmt"
	"strings"
	"text/template"
)

// DockerfileRequest defines the user's request for generating a Dockerfile.
type DockerfileRequest struct {
	BaseImage    string
	AppPort      int
	Dependencies []string
	User         string
}

// DockerfileResponse contains the generated Dockerfile and any security warnings.
type DockerfileResponse struct {
	DockerfileContent string
	SecurityWarnings  string
}

const dockerfileTemplate = `
# Base Image
FROM {{.BaseImage}}

{{- if .CreateUser }}
# Create a non-root user
RUN addgroup -S {{.User}} && adduser -S {{.User}} -G {{.User}}
{{- end }}

# Set the user
USER {{.User}}

{{- if .Dependencies }}
# Install dependencies
RUN apk add --no-cache{{ range .Dependencies }} {{.}}{{ end }}
{{- end }}

{{- if .AppPort }}
# Expose the application port
EXPOSE {{.AppPort}}
{{- end }}
`

// Generate creates a Dockerfile based on the provided request.
func Generate(req DockerfileRequest) (*DockerfileResponse, error) {
	if req.User == "root" {
		return nil, errors.New("running as 'root' user is not allowed")
	}

	var warnings []string
	if strings.HasSuffix(req.BaseImage, ":latest") {
		warnings = append(warnings, "Using the 'latest' tag for a base image is not recommended for production.")
	}

	createUser := false
	if req.User == "" {
		req.User = "appuser"
		createUser = true
	}

	tmpl, err := template.New("dockerfile").Parse(strings.TrimSpace(dockerfileTemplate))
	if err != nil {
		return nil, fmt.Errorf("failed to parse dockerfile template: %w", err)
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, map[string]interface{}{
		"BaseImage":    req.BaseImage,
		"AppPort":      req.AppPort,
		"Dependencies": req.Dependencies,
		"User":         req.User,
		"CreateUser":   createUser,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to execute dockerfile template: %w", err)
	}

	return &DockerfileResponse{
		DockerfileContent: buf.String(),
		SecurityWarnings:  strings.Join(warnings, "\n"),
	}, nil
}