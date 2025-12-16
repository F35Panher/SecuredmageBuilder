#!/bin/bash

# This script performs a live health check on the running application.

# The port can be passed as the first argument, otherwise it defaults to 8081.
PORT=${1:-8081}
URL="http://localhost:${PORT}/healthz"

echo "INFO: Performing health check on ${URL}..."

# Use curl to make the request:
# -f, --fail:  Fail silently (exit with an error code) on HTTP errors (like 404, 500).
# -s, --silent: Don't show progress meter or error messages.
# The response is captured in the 'response' variable.
response=$(curl -fs "${URL}")

if [ $? -eq 0 ] && [ "$response" == '{"status":"ok"}' ]; then
  echo "SUCCESS: Health check passed. Application is up and running."
  exit 0
else
  echo "ERROR: Health check failed. Application might be down or unresponsive."
  exit 1
fi