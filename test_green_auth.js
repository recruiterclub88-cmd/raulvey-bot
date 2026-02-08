// Self-contained test script for Green API
// No imports, just fetch

async function test() {
    console.log('Testing Green API Send...');
    try {
        const baseUrl = process.env.GREEN_API_BASE_URL || 'https://7105.api.greenapi.com';
        const id = process.env.GREEN_API_ID_INSTANCE || '7105475055';
        const token = process.env.GREEN_API_TOKEN || 'b1a61afc4dce4282997b9a6ce386255a696b16ee244d4d36ac';

        const url = `${baseUrl}/waInstance${id}/getSettings/${token}`;
        console.log('Fetching settings from:', url);

        const res = await fetch(url);
        if (!res.ok) {
            console.error('FAILED:', res.status, res.statusText);
            const text = await res.text();
            console.error('Body:', text);
        } else {
            const data = await res.json();
            console.log('SUCCESS! Settings:', data);
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
