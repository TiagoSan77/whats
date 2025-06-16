const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { client, getQrCodeBase64 } = require('./whatsapp');
const Message = require('./Models/Message.js');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 3000;
const database = process.env.DATABASE_URI;

const app = express();

app.use(express.json());
app.use(cors());

// Conexão MongoDB
mongoose.connect(database)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// Função auxiliar para formatar número do WhatsApp
function formatarNumero(numero) {
  const limpo = numero.replace(/\D/g, '');
  return `${limpo}@c.us`;
}

// Endpoint para agendar mensagem
app.post('/schedule', async (req, res) => {
  let { number, message, date } = req.body;

  try {
    number = formatarNumero(number);

    if (!number.endsWith('@c.us')) {
      return res.status(400).json({ error: 'Número inválido.' });
    }

    const msg = new Message({ number, message, date });
    await msg.save();
    res.send({ success: true });
  } catch (err) {
    console.error('Erro ao agendar mensagem:', err);
    res.status(500).json({ error: 'Erro interno ao agendar.' });
  }
});

// Envio imediato
app.post('/send-now', async (req, res) => {
  const { numbers, message } = req.body;

  if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
    return res.status(400).send({ error: 'É necessário fornecer um array de números e uma mensagem.' });
  }

  const cleanedNumbers = numbers
    .flatMap(n => n.split(/\s+/))
    .filter(Boolean);

  const results = [];

  for (const numero of cleanedNumbers) {
    const chatId = formatarNumero(numero);
    try {
      await client.sendMessage(chatId, message);
      results.push({ number: numero, success: true });
    } catch (err) {
      console.error(`Erro ao enviar para ${numero}:`, err);
      results.push({ number: numero, success: false, error: 'Erro ao enviar a mensagem.' });
    }
  }

  res.send({
    success: true,
    total: results.length,
    enviados: results.filter(r => r.success).length,
    falhas: results.filter(r => !r.success),
    detalhes: results
  });
});

// QR Code
app.get('/qr', (req, res) => {
  const qr = getQrCodeBase64();
  if (qr) {
    return res.json({ qr });
  } else {
    return res.status(404).json({ error: 'QR Code não disponível ou já autenticado.' });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  try {
    await client.destroy();
    res.send({ success: true, message: 'Dispositivo desconectado.' });
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).send({ success: false, error: 'Erro ao desconectar o dispositivo.' });
  }
});

// AGENDAMENTO COM CRON
cron.schedule('* * * * *', async () => {
  console.log('⏰ Verificando mensagens agendadas...');
  const now = new Date();
  const messages = await Message.find({ sent: false, date: { $lte: now } });

  for (const msg of messages) {
    const chatId = formatarNumero(msg.number);

    try {
      await client.sendMessage(chatId, msg.message);
      msg.sent = true;
      await msg.save();
      console.log(`✅ Mensagem enviada para ${chatId}`);
    } catch (err) {
      console.error(`❌ Erro ao enviar para ${chatId}:`, err.message);
    }
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
