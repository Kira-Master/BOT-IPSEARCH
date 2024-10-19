import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import qr from 'qrcode-terminal';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        getMessage: async (key) => {
            return { conversation: 'Hello' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr: qrCode } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect && lastDisconnect.error instanceof Boom &&
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Connected');
        }

        if (qrCode) {
            qr.generate(qrCode, { small: true });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const text = msg.message.conversation || '';
        console.log('Received message:', text);

        // Gunakan switch untuk menangani pesan
        switch (true) {
            case text.startsWith('/getip'): {
                const ip = text.split(' ')[1]; // Ambil IP setelah /getip
                if (!ip) {
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Silakan masukkan IP setelah /getip. Contoh: /getip 8.8.8.8' });
                    break;
                }

                try {
                    const response = await axios.get(`http://ipwho.is/${ip}`);
                    const data = response.data;
                    console.log(data);
                    
                    let replyMessage = `IP : ${data.ip}\nContinent/Benua : ${data.continent}\nCode Benua : ${data.continent_code}\nCountry/Negara : ${data.country}\nCode Negara : ${data.country_code}\nRegion : ${data.region}\nCity : ${data.city}\nLatitude : ${data.latitude}\nLongitude : ${data.longitude}\nPostal Code : ${data.postal}\nASN : ${data.connection?.asn || 'N/A'}`;
                    
                    if (data.success) {
                        await sock.sendMessage(msg.key.remoteJid, { text: replyMessage });
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: 'IP tidak ditemukan.' });
                        console.log('IP tidak ditemukan.');
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
                break;
            }
            default: {
                // Jika pesan tidak mengandung "/getip"
                //await sock.sendMessage(msg.key.remoteJid, { text: 'GUNAKAN */getip* untuk menggunakan fitur getip.' });
                break;
            }
        }
    });
}

startBot();
