const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let qrCodeBase64 = null;

client.on('qr', async (qr) => {
  console.log('Gerando novo QR code...'); // Adicione esta linha
  qrCodeBase64 = await qrcode.toDataURL(qr);
});

client.on('qr', async (qr) => {
  qrCodeBase64 = await qrcode.toDataURL(qr);
  console.log('QR code atualizado');
});

client.on('ready', () => {
  qrCodeBase64 = null; // QR não é mais necessário quando conectado
  console.log('WhatsApp is ready!');
});

client.initialize();

module.exports = { client, getQrCodeBase64: () => qrCodeBase64 };
