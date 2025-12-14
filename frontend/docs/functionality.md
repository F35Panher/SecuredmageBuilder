# Docker Image Builder Application Functionality

## 1. Introduction

The Docker Image Builder is a web-based tool designed to simplify the creation of secure and optimized Docker images. It provides a user-friendly interface to configure every aspect of a container, from the base operating system to application dependencies, while offering real-time security feedback and generating production-ready Dockerfiles and CI/CD pipelines.

## 2. Main Interface (Builder View)

This is the primary view where users build and audit their container configurations.

### 2.1. UI Modes

Users can toggle between two different layouts using the buttons in the header:
-   **Classic View:** A multi-pane layout with a persistent configuration sidebar on the left and a tabbed content area on the right. Ideal for users who want to see everything at once.
-   **Modern View:** A streamlined, multi-column layout that guides the user from configuration on the left to audit results in the middle and the final generated code on the right.

### 2.2. Configuration Panels

The left-hand panel allows users to define their container specifications.

-   **Base OS:** Select the foundational operating system image for the container (e.g., Chainguard Wolfi, Google Distroless, Alpine).
-   **Technology Stack:** Choose the primary programming language and runtime for the application. Users can select a technology (e.g., Node.js) and then pick a specific version from a dropdown (e.g., v20, v18). This choice heavily influences the generated multi-stage Dockerfile.
-   **System Packages:** Add or remove additional system-level packages (e.g., `git`, `curl`). Packages with known security risks are highlighted.
-   **Exposed Ports:** Define which network ports the container should expose. The application will flag commonly insecure ports like 22 (SSH).
-   **Environment Variables:** Add environment variables as key-value pairs. The system audits for keys that suggest hardcoded secrets (e.g., `API_KEY`).

### 2.3. Output Panels

The main content area displays the results of the configuration in real-time.

-   **Security Audit:** This tab shows a dynamic security score from 0-100. It also lists all positive and negative audit findings based on the current configuration and the rules defined in the Admin Panel. Findings are color-coded by severity (Critical, High, Medium, Low).
-   **Dockerfile:** This tab displays the complete, generated `Dockerfile`. The generator implements best practices, including **multi-stage builds** (for compiled languages like Go/Java or to reduce final image size for Node.js/Python), **non-root user creation**, and **package cache cleanup**.
-   **CI/CD Pipeline:** This tab displays a ready-to-use GitHub Actions workflow (`main.yml`). This workflow automates building the Docker image, scanning it for vulnerabilities with tools like Grype, linting it with Dockle, and pushing it to a container registry.
-   **Copy & Download:** Both the Dockerfile and CI/CD views have buttons to quickly copy the content to the clipboard or download it as a file (`Dockerfile` or `main.yml`).

### 2.4. AI-Powered Suggestions

-   The "Get AI Suggestions" button uses the Gemini API to analyze the current configuration.
-   It provides a short, actionable list of 2-3 recommendations focused on improving the container's security posture, which are then displayed in the UI.

## 3. Admin Panel (Admin View)

This view allows an administrator to customize the options and rules available to users in the Builder View. This makes the tool adaptable to different organizational standards.

### 3.1. Management Sections

-   **Manage Base Images:** Add, remove, or edit the available base OS images.
-   **Manage Tech Stacks:** Control the list of available programming languages and their versions.
-   **Manage System Packages:** Customize the list of available system packages that users can add to their images.
-   **Manage Security Rules:** This is the core of the security audit engine. Admins can define custom rules that the `SecurityAuditService` uses to calculate the score. Each rule consists of:
    -   **Type:** The configuration area the rule applies to (`baseOs`, `package`, `port`, `envVar`).
    -   **Identifier:** The specific value to match (e.g., the package name `netcat`, the port `22`, or a regex string like `/_KEY/i` for environment variables).
    -   **Severity:** Critical, High, Medium, or Low.
    -   **Message & Reason:** The text displayed to the user in the audit findings.
    -   **Deduction:** The number of points to subtract from the security score if the rule is triggered.
    -   **Tech Stack (Optional):** Link a rule to a specific technology stack.

## 4. Core Services (Technical Overview)

-   **`ConfigService`:** A central, injectable service that holds all the configurable data (base images, packages, security rules) as signals. The Admin Panel modifies the data in this service.
-   **`SecurityAuditService`:** Consumes the user's configuration and the rules from the `ConfigService` to perform an audit, calculate the security score, and return the list of findings.
-   **`CodeGeneratorService`:** Takes the user's configuration and generates the string output for the Dockerfile and the CI/CD workflow file. It contains the logic for multi-stage builds and other best practices.
-   **`GeminiService`:** An injectable service that handles all communication with the Google Gemini API. It constructs the prompt based on user configuration and returns the AI-generated recommendations.