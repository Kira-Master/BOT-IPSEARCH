import axios from 'axios';
import * as cheerio from 'cheerio';

export const iproyal = async (ip) => {
    try {
        const res = await axios.get(`https://iproyal.com/ip-lookup/?ip=${ip}`);
        
        // Gunakan cheerio untuk mem-parsing HTML dari respons
        const $ = cheerio.load(res.data);
        
        // Pilih elemen yang sesuai dengan struktur HTML yang disebutkan
        const infoDivs = $('div.hero-bg-container > section.pb-40 > section.w-full > div.gap-x-20 > div.flex-row');

        let result = [];

        // Iterasi melalui setiap div dan ambil informasi yang dibutuhkan
        infoDivs.each(function() {
            const titleElements = $(this).find('div.font-semibold');
            const valueElements = $(this).find('div.text-right');
            
            titleElements.each(function(index) {
                const title = $(this).text().trim().replace(/:/g, '');
                const value = $(valueElements[index]).text().trim();
                
                if (title && value) {
                    result.push({ title, value });
                }
            });
        });

        // Tampilkan hasil
        if (result.length > 0) {
            console.log('Informasi yang diambil:', result);
        } else {
            console.log('Informasi tidak ditemukan.');
        }

    } catch (error) {
        if (error.response) {
            console.error(`Gagal mengambil data dari iproyal. Status code: ${error.response.status}`);
        } else {
            console.error('Terjadi kesalahan:', error.message);
        }
    }
}

// Contoh penggunaan
iproyal('103.6.78.9');
