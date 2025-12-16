# Secured Container Builder

**Secured Container Builder** is a visual tool designed to help developers configure, audit, and generate production-ready Dockerfiles and CI/CD pipelines with a strong focus on security best practices. It provides real-time feedback on configuration choices, helping to create minimal, secure, and efficient container images by default.

## ✨ Features

- **Interactive Builder:** Visually select base images, technology stacks (with version selection), system packages, and more.
- **Dual UI Modes:** Choose between a classic, multi-pane layout or a modern, streamlined column-based view.
- **Real-Time Security Audit:** Get an instant security score and actionable findings as you build your configuration.
- **Dockerfile Generation:** Automatically generate an optimized, multi-stage Dockerfile based on your selections.
- **CI/CD Pipeline Generation:** Generate a ready-to-use GitHub Actions workflow for building and scanning your container image.
- **Extensible Admin Panel:** Configure the available options (base images, packages) and define custom security rules.
- **AI-Powered Suggestions:** Leverage the Gemini API to get intelligent recommendations for improving your security score.

## VERSION

See the `VERSION` file for the current version of the application.

## 🚀 Deployment

This is a standalone Angular application. It can be built and served from any static web server.

### Build Process

A simple build script is provided to copy the necessary files into a `dist` directory.

```bash
sh build.sh
```

This will create a `dist/` directory containing `index.html`, `index.tsx`, `metadata.json`, and the `src/` folder.

### 1. In-House / Local Deployment (using Docker)

You can easily serve the application using the provided `Dockerfile.deploy`. This Dockerfile sets up an Nginx server to host the static application files.

**Steps:**

1.  **Build the application:**
    ```bash
    sh build.sh
    ```
2.  **Build the deployment Docker image:**
    ```bash
    docker build -t secured-container-builder -f Dockerfile.deploy .
    ```
3.  **Run the container:**
    ```bash
    docker run -d -p 8080:80 secured-container-builder
    ```
The application will now be available at `http://localhost:8080`.

### 2. Cloud Deployment (e.g., Google Cloud Run)

You can deploy the application as a serverless container on services like Google Cloud Run.

**Prerequisites:**

-   Google Cloud SDK (`gcloud`) installed and authenticated.
-   A Google Cloud project with Cloud Run and Artifact Registry APIs enabled.

**Steps:**

1.  **Build the application:**
    ```bash
    sh build.sh
    ```
2.  **Configure gcloud CLI:**
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    gcloud config set run/region YOUR_REGION # e.g., us-central1
    ```
3.  **Build and push the container image to Artifact Registry:**
    ```bash
    gcloud builds submit --tag YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/secure-builder-repo/app --file=Dockerfile.deploy
    ```
4.  **Deploy to Cloud Run:**
    ```bash
    gcloud run deploy secured-container-builder \
      --image YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/secure-builder-repo/app \
      --platform managed \
      --region YOUR_REGION \
      --allow-unauthenticated
    ```

After deployment, `gcloud` will provide you with a URL to access your live application.