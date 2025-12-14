# ---- Frontend Build Stage ----
# Use a Node.js image to build the TypeScript frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app
# Copy only the package files first to leverage Docker layer caching.
COPY ./frontend/package.json ./frontend/package-lock.json ./
RUN npm install

# Copy the rest of the frontend source code and run the build.
COPY ./frontend/ ./
# Assuming the build output goes to a 'build' directory. Change if yours is different (e.g., 'dist').
RUN npm run build

# ---- Backend Build Stage ----
# Use a Go image to build the backend application
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app
# Copy Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend source code.
COPY . .
# Build the application as a static binary for Linux
RUN CGO_ENABLED=0 GOOS=linux go build -o /secured-image-builder .

# ---- Final Stage ----
# Use a minimal, non-root, "distroless" image for a small and secure final container
FROM gcr.io/distroless/static-debian11

# Copy the built backend binary
COPY --from=backend-builder /secured-image-builder /

# Copy the built frontend assets from the frontend-builder stage into the /static directory.
# Our Go server is configured to serve files from this directory.
# The Angular build output is in the 'dist' directory.
COPY --from-frontend-builder /app/dist/ /static

# Expose the port the app runs on
EXPOSE 8081

ENTRYPOINT ["/secured-image-builder"]