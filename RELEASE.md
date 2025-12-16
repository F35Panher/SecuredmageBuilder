# Release Notes

## v0.0.09 (2025-12-14)

### Features
- Renamed application to "Secured Container Builder".
- Added new logo and tagline "Build and deploy with confidence."
- Added Admin Console for feature management and API key configuration.
- API key is now managed via the backend and is not stored in environment files.
- AI suggestions can be enabled/disabled from the admin console.
- Added Copyright and version number to the UI.

### Refactor
- Refactored `GeminiService` to be resilient to a missing API key.
- Moved AI suggestion feature from the main builder view to the admin console.

### Documentation
- Added this `RELEASE.md` file.
- Updated `README.md` with new application name.
