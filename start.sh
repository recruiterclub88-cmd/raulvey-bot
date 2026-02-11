#!/bin/sh
# Start both Next.js and Baileys worker

# Start Next.js in background
node server.js &

# Start Baileys worker in foreground
node worker.mjs
