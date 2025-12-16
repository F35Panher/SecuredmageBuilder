import { Injectable, inject } from '@angular/core';
import { ContainerConfig } from '../types';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class CodeGeneratorService {
  private readonly configService = inject(ConfigService);

  generateDockerfile(config: ContainerConfig): string {
    const { baseOs, techStack, packages, ports, envVars } = config;

    const techSetup = this.getTechSetup(techStack);
    const allPackages = [...packages, ...techSetup.runtimePackages];
    
    let baseOsInfo = this.configService.baseOs().find(os => os.id === baseOs);
    let baseImage = baseOsInfo?.source ? `${baseOsInfo.source}:${baseOsInfo.version}` : 'cgr.dev/chainguard/wolfi-base:latest';
    let isDistroless = baseOs.includes('distroless');
    let finalImageWarning = '';

    if (isDistroless && allPackages.length > 0) {
        finalImageWarning = `# WARNING: Your selected base image is distroless, but your configuration requires
# packages (${allPackages.join(', ')}).
# Switching to a compatible non-distroless image (cgr.dev/chainguard/wolfi-base:latest) to support package installation.`;
        baseImage = 'cgr.dev/chainguard/wolfi-base:latest';
        isDistroless = false; 
    }

    const packageInstallCmd = this.getPackageInstallCmd(allPackages, isDistroless ? 'distroless' : baseOs);

    // User creation and package installation for non-distroless images
    const setupBlock = isDistroless
      ? `# This distroless image runs as non-root by default.
# Package installation is not supported.`
      : `# Create a non-root user and switch to it.
# This is a security best practice to avoid running as root.
RUN ${baseOs === 'alpine' || baseOs === 'wolfi' ? 'addgroup -S appgroup && adduser -S appuser -G appgroup' : 'addgroup --system appgroup && adduser --system --ingroup appgroup appuser'}
USER appuser

# Install necessary packages and clean up cache to keep image small
${packageInstallCmd}`;

    const builderStage = techSetup.builderImage
      ? `# ---- Builder Stage ----
# This stage builds the application and installs dependencies.
# The final image will only copy the necessary artifacts from this stage.
FROM ${techSetup.builderImage} as builder
WORKDIR /app
${techSetup.buildSteps}
`
      : '';
    
    const copyFromBuilder = techSetup.builderImage
      ? `# Copy all application artifacts from the builder stage.
COPY --from=builder /app /app`
      : `# Copy application files.
# For production, it's better to use a multi-stage build to keep the image small.
COPY . .`;


    return `
${builderStage}
# ---- Final Stage ----
# This is the final, minimal image that will be deployed.
${finalImageWarning}
FROM ${baseImage}
WORKDIR /app

${setupBlock}

${copyFromBuilder}

# Set environment variables
${envVars.map(e => e.key && e.value ? `ENV ${e.key}="${e.value}"` : '').filter(Boolean).join('\n')}

# Expose ports
${ports.map(p => p ? `EXPOSE ${p}` : '').filter(Boolean).join('\n')}

# Set entrypoint/command
# Note: The run command is based on the highest priority tech stack selected.
CMD ${techSetup.runCommand}
`.trim().replace(/\n\n+/g, '\n\n');
  }
  
  generateCiCd(config: ContainerConfig): string {
    const imageName = `${config.registry}/\${{ github.repository_owner }}/my-secure-app`.toLowerCase();
    const imageTag = `\${{ github.sha }}`;

    return `
name: Build, Scan, and Publish Docker Image

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build_and_scan:
    name: Build and Scan
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write # Required for pushing packages to GHCR.
      security-events: write # Required for uploading SARIF results.

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to the Container registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${config.registry}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build Docker image
        id: build-and-push
        uses: docker/build-push-action@v5
        with:
          context: .
          # Push only on merges to main, not on PRs
          push: \${{ github.event_name != 'pull_request' }}
          tags: ${imageName}:${imageTag}
          # Load the image into the local Docker daemon to make it available for scanners
          load: true 

      - name: Run Grype vulnerability scanner
        uses: anchore/grype-action@v0
        with:
          image: '${imageName}:${imageTag}'
          fail-on-severity: 'high'
          output-format: 'sarif'
          sarif-file: 'grype-results.sarif'
          
      - name: Upload Grype scan results to GitHub Security tab
        if: success() || failure() # Always run this step to upload results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'grype-results.sarif'
          
      - name: Run Dockle linter for Dockerfile best practices
        uses: goodwithtech/dockle-action@v1
        with:
          image: '${imageName}:${imageTag}'
          exit-code: '1'
          exit-level: 'warn'
          format: 'json'
          output: 'dockle-report.json'

      # --- Additional Advanced Scanners ---
      # The following scanners require specific configurations and secrets.
      # Uncomment and configure them by adding the required secrets to your GitHub repository.

      # - name: Scan image with Wiz for cloud-native visibility
      #   uses: wiz-scan/wiz-scan-action@v1
      #   with:
      #     image: '${imageName}:${imageTag}'
      #     wiz_client_id: \${{ secrets.WIZ_CLIENT_ID }}
      #     wiz_client_secret: \${{ secrets.WIZ_CLIENT_SECRET }}

      # - name: Scan with Black Duck for Software Composition Analysis (SCA)
      #   uses: synopsys/detect-action@1
      #   with:
      #     detect_opts: "--detect.docker.image=${imageName}:${imageTag} --detect.tools=DOCKER"
      #     blackduck_url: \${{ secrets.BLACKDUCK_URL }}
      #     blackduck_api_token: \${{ secrets.BLACKDUCK_API_TOKEN }}

      # - name: Setup JFrog CLI for Xray scan
      #   uses: jfrog/jfrog-setup-action@v4
      #   env:
      #     JF_URL: \${{ secrets.JFROG_URL }}
      #     JF_ACCESS_TOKEN: \${{ secrets.JFROG_ACCESS_TOKEN }}
      # - name: Scan with JFrog Xray for deep binary analysis
      #   run: |
      #     jf docker scan ${imageName}:${imageTag}

      # Note on Polaris: Polaris scans Infrastructure as Code (e.g., Kubernetes YAML),
      # not Docker images directly. You can add a step like the one below if you
      # have Kubernetes manifests in your repository.
      # - name: Run Polaris for Kubernetes best practices (IaC)
      #   uses: fairwindsops/polaris/action@v5
      #   with:
      #     path: ./path/to/your/kubernetes/manifests/
      #     report-name: polaris-report.sarif
      #     report-path: .
`.trim();
  }

  private getTechSetup(techStackIds: string[]) {
    const priority = ['golang', 'java', 'nodejs', 'python'];
    const selectedTechs = techStackIds.sort((a, b) => {
        const langA = a.split('-')[0];
        const langB = b.split('-')[0];
        return priority.indexOf(langA) - priority.indexOf(langB);
    });

    if (selectedTechs.length === 0) {
        return {
            builderImage: null,
            buildSteps: '',
            copyFrom: '.',
            copyTo: '.',
            runCommand: '["/bin/sh", "-c", "echo Your app is running!"]',
            runtimePackages: []
        };
    }

    let buildSteps = '';
    let primaryRunCommand = '["/bin/sh", "-c", "echo Your app is running!"]';
    let primaryBuilderImage: string | null = null;
    let primaryCopyFrom = '/app';
    let primaryCopyTo = '.';
    const runtimePackages: string[] = [];

    // Note: This approach combines steps into a single builder.
    // A more advanced implementation would use multi-stage builds for each tech.
    for (const techId of selectedTechs) {
        const [language, version] = techId.split('-');
        let techSetup;

        switch (language) {
            case 'golang':
                techSetup = {
                    builderImage: `golang:${version}-alpine`,
                    buildSteps: `
# Go setup
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server .`.trim(),
                    copyFrom: '/app/server',
                    copyTo: '/app/server',
                    runCommand: '["/app/server"]',
                    runtimePackages: []
                };
                break;
            case 'java':
                techSetup = {
                    builderImage: `maven:3.9-eclipse-temurin-${version}`,
                    buildSteps: `
# Java setup
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests && mv target/*.jar /app/app.jar`.trim(),
                    copyFrom: '/app/app.jar',
                    copyTo: '/app/app.jar',
                    runCommand: '["java", "-jar", "/app/app.jar"]',
                    runtimePackages: [`java-${version}-openjdk`]
                };
                break;
            case 'nodejs':
                techSetup = {
                    builderImage: `node:${version}-alpine`,
                    buildSteps: `
# Node.js setup
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build`.trim(),
                    copyFrom: '/app/dist',
                    copyTo: '.',
                    runCommand: '["npm", "run", "preview"]',
                    runtimePackages: [`nodejs-${version}`]
                };
                break;
            case 'python':
                techSetup = {
                    builderImage: `python:${version}-slim`,
                    buildSteps: `
# Python setup
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .`.trim(),
                    copyFrom: '/app',
                    copyTo: '.',
                    runCommand: '["python", "app.py"]',
                    runtimePackages: [`python-3`]
                };
                break;
            default:
                continue;
        }

        if (!primaryBuilderImage) {
            primaryBuilderImage = techSetup.builderImage;
            primaryRunCommand = techSetup.runCommand;
            primaryCopyFrom = techSetup.copyFrom;
            primaryCopyTo = techSetup.copyTo;
        }

        buildSteps += (buildSteps ? '\n\n' : '') + techSetup.buildSteps;
        runtimePackages.push(...techSetup.runtimePackages);
    }

    return {
        builderImage: primaryBuilderImage,
        buildSteps: buildSteps,
        copyFrom: primaryCopyFrom,
        copyTo: primaryCopyTo,
        runCommand: primaryRunCommand,
        runtimePackages: runtimePackages
    };
  }
  
  private getPackageInstallCmd(packages: string[], baseOs: string): string {
    if (baseOs.includes('distroless')) {
      return packages.length > 0
        ? '# NOTE: Cannot install packages into distroless images. Remove packages or choose a different base image.'
        : '# No packages to install (distroless base image)';
    }
    
    if (packages.length === 0) {
      return '# No additional packages to install';
    }
    
    if (baseOs === 'alpine' || baseOs === 'wolfi') {
      return `RUN apk update && apk add --no-cache ${packages.join(' ')}`;
    }
    
    // Debian/Ubuntu
    return `RUN apt-get update && apt-get install -y --no-install-recommends ${packages.join(' ')} \\
    && rm -rf /var/lib/apt/lists/*`;
  }
}
