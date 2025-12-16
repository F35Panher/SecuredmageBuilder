# Contributing to Secured Container Builder

First off, thank you for considering contributing! We welcome any contributions that help make this project better.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

There are many ways to contribute, from writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests or writing code which can be incorporated into the main project.

### Reporting Bugs

-   **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/vtaparia/securedimagebuilder/issues).
-   If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/vtaparia/securedimagebuilder/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

-   Open a new issue to discuss your enhancement.
-   Clearly describe the enhancement, its purpose, and the expected outcome.

## Development Workflow

We follow a Gitflow-like branching model. All development happens on the `develop` branch.

### Branching Strategy

-   **`main`**: This branch contains the latest stable release. Direct pushes are not allowed.
-   **`develop`**: This is the main development branch. All new features and bug fixes should be based on this branch.
-   **`feature/<feature-name>`**: For new features. Branched from `develop`.
-   **`bugfix/<bug-name>`**: For bug fixes. Branched from `develop`.

### Pull Request Process

1.  **Fork the repository** and create your branch from `develop`.
2.  **Set up the development environment** (see below).
3.  **Make your changes.** Ensure that your code lints and builds correctly.
4.  **Commit your changes** with a clear and descriptive commit message.
5.  **Push your branch** to your fork.
6.  **Open a pull request** to the `develop` branch of the main repository.
7.  The pull request will be reviewed, and once it passes all CI checks and gets approval, it will be merged.

## Development Setup

This project consists of a Go backend and an Angular frontend.

### Prerequisites

-   [Go](https://golang.org/doc/install) (version 1.22 or later)
-   [Node.js](https://nodejs.org/en/download/) (version 20 or later)
-   [npm](https://www.npmjs.com/get-npm)

### Installation

1.  **Clone your fork:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/SecuredContainerBuilder.git
    cd SecuredContainerBuilder
    ```

2.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    ```

### Running the Application for Development

1.  **Run the Go backend:**
    From the root directory of the project:
    ```bash
    go run main.go
    ```
    The backend will start on `http://localhost:8081`.

2.  **Run the Angular frontend:**
    In a separate terminal, from the `frontend` directory:
    ```bash
    npm start
    ```
    The frontend development server will start on `http://localhost:4200`.

### Building the Application

-   **Build the frontend:**
    ```bash
    cd frontend
    npm run build
    ```
    This will build the frontend and place the output in the `static` directory at the root of the project, which is what the Go backend serves.

-   **Build the Go backend:**
    ```bash
    go build -o secured-container-builder main.go
    ```

### Testing

-   **Run Go tests:**
    ```bash
    go test ./...
    ```

-   **Run frontend tests (if any):**
    ```bash
    cd frontend
    npm test
    ```
