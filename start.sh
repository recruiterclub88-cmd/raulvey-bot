#!/bin/sh
# Start both Next.js and Baileys worker

# Set NODE_PATH to find modules in standalone build
export NODE_PATH=/app/node_modules:/app/.next/server/node_modules

# Start Next.js in background
node server.js &

# Start Baileys worker in foreground
node baileys-worker.js
