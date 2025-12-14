#!/bin/bash

# This script compiles the Go application and starts the server.
# It ensures that the script will exit immediately if any command fails.
set -e

echo "INFO: Building the frontend application..."

# Navigate into the frontend directory to run npm commands.
# This assumes your TypeScript project is in a 'frontend' sub-directory.
cd ./frontend

echo "INFO: Installing frontend dependencies..."
npm install --legacy-peer-deps

echo "INFO: Compiling the TypeScript frontend..."
# Use npx to run the locally installed Angular CLI
npx ng build --base-href /

# Navigate back to the project root
cd ..

echo "INFO: Preparing static directory..."
# Create the static directory if it doesn't exist, then clear it.
mkdir -p ./static
rm -rf ./static/*

echo "INFO: Copying built frontend assets..."
# The Angular build output is in a nested directory. We copy the contents
# of the 'dist' directory, confirmed by the build log, directly into 'static'.
cp -R ./frontend/dist/* ./static/

echo "INFO: Compiling the Go application..."

# The 'go build' command compiles the source code into a single executable binary.
# -o specifies the output file name.
# Added the following --- go mod download and go mod verify
go mod download
go mod verify
go build -o secured-image-builder .

echo "INFO: Build successful."
echo "INFO: Starting the server..."

# Execute the compiled binary.
# You can configure the port by setting the PORT environment variable before running this script.
# Example: PORT=9000 ./start.sh
./secured-image-builder