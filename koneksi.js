import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';
import qr from 'qrcode-terminal';
import * as cheerio from 'cheerio';
import os from 'os';
import osu from 'os-utils';

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
        console.log('Pesan diterima:', text);

        // Pastikan pesan dimulai dengan '/'
        if (!text.startsWith('/')) {
            return; // Abaikan pesan tanpa tanda '/'
        }

        // Gunakan switch untuk menangani pesan
        switch (true) {
            case text.startsWith('/menu'): {
            const cpu = os.cpus()[0].model;
                const osType = os.type();
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;
                const ramUsage = (usedMem / totalMem * 100).toFixed(2);
                
                const menuMessage = `
*Menu Fitur Bot:*
/ipwhois <IP> - Menampilkan informasi tentang IP dari ipwho.is
/iproyal <IP> - Menampilkan informasi tentang IP dari iproyal.com
Informasi Server:
- OS: ${osType}
- CPU: ${cpu}
- Total RAM: ${(totalMem / (1024 * 1024)).toFixed(2)} MB
- Memori Terpakai: ${(usedMem / (1024 * 1024)).toFixed(2)} MB (${ramUsage}%)
- Memori Tersisa: ${(freeMem / (1024 * 1024)).toFixed(2)} MB`;
                await sock.sendMessage(msg.key.remoteJid, { text: menuMessage, quoted: msg });
                break;
            }
            case text.startsWith('/ipwhois'): {
                const ip = text.split(' ')[1]; // Ambil IP setelah /ipwhois
                if (!ip) {
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Silakan masukkan IP setelah /ipwhois. Contoh: /ipwhois 8.8.8.8', quoted: msg });
                    break;
                }

                try {
                    const response = await axios.get(`http://ipwho.is/${ip}`);
                    const data = response.data;
                    
                    let replyMessage = `IP : ${data.ip}\nContinent/Benua : ${data.continent}\nCode Benua : ${data.continent_code}\nCountry/Negara : ${data.country}\nCode Negara : ${data.country_code}\nRegion : ${data.region}\nCity : ${data.city}\nLatitude : ${data.latitude}\nLongitude : ${data.longitude}\nPostal Code : ${data.postal}\nASN : ${data.connection?.asn || 'N/A'}`;
                    
                    if (data.success) {
                        await sock.sendMessage(msg.key.remoteJid, { text: replyMessage, quoted: msg });
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: 'IP tidak ditemukan.', quoted: msg });
                    }
                } catch (error) {
                    console.error('Error saat menangani pesan:', error);
                }
                break;
            }
            case text.startsWith('/iproyal'): {
                const ip = text.split(' ')[1]; // Ambil IP setelah /iproyal
                if (!ip) {
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Silakan masukkan IP setelah /iproyal. Contoh: /iproyal 8.8.8.8', quoted: msg });
                    break;
                }

                try {
                    const res = await axios.get(`https://iproyal.com/ip-lookup/?ip=${ip}`);
                    const $ = cheerio.load(res.data);
                    const infoDivs = $('div.hero-bg-container > section.pb-40 > section.w-full > div.gap-x-20 > div.flex-row');

                    let result = [];

                    // Iterasi melalui setiap div dan ambil informasi yang dibutuhkan
                    infoDivs.each(function () {
                        const titleElements = $(this).find('div.font-semibold');
                        const valueElements = $(this).find('div.text-right');

                        if (titleElements.length === valueElements.length) {
                            titleElements.each(function (index) {
                                const title = $(this).text().trim().replace(/:/g, '');
                                const value = $(valueElements[index]).text().trim();
                                if (title && value) {
                                    result.push({ title: title, value: value });
                                }
                            });
                        }
                    });

                    let replyMessage = result.map(item => `${item.title}: ${item.value}`).join('\n');

                    if (replyMessage) {
                        await sock.sendMessage(msg.key.remoteJid, { text: replyMessage, quoted: msg });
                    } else {
                        await sock.sendMessage(msg.key.remoteJid, { text: 'IP tidak ditemukan.' });
                    }
                } catch (error) {
                    console.error('Error saat menangani pesan:', error);
                }
                break;
            }
            default: {
                // Tidak melakukan apa-apa jika perintah tidak dikenal
                break;
            }
        }
    });
}

startBot();
