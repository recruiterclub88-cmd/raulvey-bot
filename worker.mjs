#!/usr/bin/env node
// Standalone Baileys worker - runs independently from Next.js
import { startBaileys } from './src/lib/server/baileys.js';

console.log('🚀 [Worker] Starting Baileys WhatsApp worker...');

startBaileys().catch((err) => {
    console.error('❌ [Worker] Fatal error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️ [Worker] SIGTERM received, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⚠️ [Worker] SIGINT received, shutting down...');
    process.exit(0);
});
