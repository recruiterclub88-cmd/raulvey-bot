export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startBaileys } = await import('./lib/server/baileys');
        console.log('🚀 [Instrumentation] Запускаем Baileys worker...');
        startBaileys().catch((err) => {
            console.error('❌ [Instrumentation] Ошибка запуска Baileys:', err);
        });
    }
}
