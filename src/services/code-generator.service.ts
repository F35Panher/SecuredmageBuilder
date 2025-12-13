import { Injectable } from '@angular/core';
import { ContainerConfig } from '../types';

@Injectable({
  providedIn: 'root',
})
export class CodeGeneratorService {
  generateDockerfile(config: ContainerConfig): string {
    const { baseOs, techStack, packages, ports, envVars } = config;

    let baseImage = 'cgr.dev/chainguard/static:latest';
    if (baseOs === 'alpine') baseImage = 'alpine:latest';
    if (baseOs === 'debian-slim') baseImage = 'debian:slim';
    if (baseOs === 'ubuntu') baseImage = 'ubuntu:latest';

    const techSetup = this.getTechSetup(techStack, baseOs);
    const packageInstallCmd = this.getPackageInstallCmd(packages, baseOs);

    return `
# Stage 1: Builder
FROM ${techSetup.builderImage} as builder
WORKDIR /app
COPY . .
${techSetup.buildSteps}

# Stage 2: Runner
FROM ${baseImage}
WORKDIR /app

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Install necessary packages
${packageInstallCmd}

# Copy artifacts from builder stage
COPY --from=builder /app/${techSetup.artifactPath} .

# Set environment variables
${envVars.map(e => e.key && e.value ? `ENV ${e.key}=${e.value}` : '').filter(Boolean).join('\n')}

# Expose ports
${ports.map(p => p ? `EXPOSE ${p}` : '').filter(Boolean).join('\n')}

# Set entrypoint/command
CMD ${techSetup.runCommand}
`.trim();
  }
  
  generateCiCd(config: ContainerConfig): string {
    const imageName = `my-secure-app`;
    return `
name: Build and Scan Container

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to the Container registry
        uses: docker/login-action@v3
        with:
          registry: ${config.registry}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${config.registry}/\${{ github.repository_owner }}/${imageName}:\${{ github.sha }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${config.registry}/\${{ github.repository_owner }}/${imageName}:\${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          vuln-type: 'os,library'
          severity: 'CRITICAL,HIGH'
`.trim();
  }

  private getTechSetup(techStack: string[], baseOs: string) {
    if (techStack.includes('nodejs')) {
      return {
        builderImage: 'node:20-alpine',
        buildSteps: 'RUN npm install && npm run build',
        artifactPath: 'dist',
        runCommand: '["node", "index.js"]'
      };
    }
    if (techStack.includes('python')) {
       return {
        builderImage: 'python:3.11-slim',
        buildSteps: 'RUN pip install -r requirements.txt',
        artifactPath: '.',
        runCommand: '["python", "app.py"]'
      };
    }
     // Default/fallback for Go or others
    return {
      builderImage: 'golang:1.21-alpine',
      buildSteps: 'RUN go build -o /main .',
      artifactPath: '/main',
      runCommand: '["./main"]'
    };
  }
  
  private getPackageInstallCmd(packages: string[], baseOs: string): string {
    if (packages.length === 0) {
      return '# No packages to install';
    }
    
    if (baseOs === 'alpine' || baseOs === 'wolfi') {
      return `RUN apk update && apk add --no-cache ${packages.join(' ')}`;
    }
    // Debian/Ubuntu
    return `RUN apt-get update && apt-get install -y --no-install-recommends ${packages.join(' ')} && rm -rf /var/lib/apt/lists/*`;
  }
}
