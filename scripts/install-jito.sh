#!/bin/bash

echo "========================================"
echo " Installing Jito Dependencies"
echo "========================================"
echo

cd packages/onchain-bot
echo "Installing jito-ts..."
npm install jito-ts@^3.0.0
echo

echo "========================================"
echo " Installation Complete!"
echo "========================================"
echo
echo "Next steps:"
echo "1. Copy config.jito.toml to your config file"
echo "2. Edit execution.mode = \"jito\""
echo "3. Run: npm run start:onchain-bot -- --config your-config.toml"
echo
