#!/bin/bash

# Linux/Mac shell script to run the Rust pool cache prototype

echo ""
echo "===================================================="
echo "  Solana Pool Cache - Prototype Runner"
echo "===================================================="
echo ""

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "ERROR: Rust/Cargo is not installed or not in PATH"
    echo ""
    echo "Please install Rust from: https://rustup.rs/"
    echo ""
    exit 1
fi

echo "[1/2] Building project..."
echo ""
cargo build --release
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed. Please check the error messages above."
    echo ""
    exit 1
fi

echo ""
echo "[2/2] Starting pool cache..."
echo ""
echo "Press Ctrl+C to stop the program."
echo ""

cargo run --release



