// Standalone Baileys worker - completely independent from Next.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { useSupabaseAuthState } = require('./baileys-auth-standalone.js');
const { createClient } = require('@supabase/supabase-js');

const logger = pino({ level: 'info' });

// Hardcoded fallbacks from src/lib/server/db.ts
const SUPABASE_URL_FALLBACK = 'https://zrctubjaqyyhtiumdtau.supabase.co';
const SUPABASE_KEY_FALLBACK = 'sb_secret_mVTgwJkcXOWrFC9KhqNCcg_WLVf1nVA';

const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY_FALLBACK;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function startBaileys() {
    const { state, saveCreds } = await useSupabaseAuthState('main-session', supabase);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ['Recruiter Bot', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('💠 [Baileys] QR-код для сканирования:');
            console.log(qr);
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('💠 [Baileys] Соединение закрыто. Переподключение:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(() => startBaileys(), 5000);
            }
        } else if (connection === 'open') {
            console.log('💠 [Baileys] Соединение установлено успешно!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const chatId = msg.key.remoteJid;
            const userText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

            if (!userText) continue;

            console.log(`📬 [Baileys] Сообщение от ${chatId}: ${userText}`);

            // Simple echo for now - full logic will be added
            await sock.sendMessage(chatId, { text: `Получил: ${userText}` });
        }
    });
}

console.log('🚀 [Worker] Starting Baileys WhatsApp worker...');
startBaileys().catch((err) => {
    console.error('❌ [Worker] Fatal error:', err);
    process.exit(1);
});
