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
console.log(database)
const app = express();

app.use(express.json());
app.use(cors());
// MongoDB
mongoose.connect(database, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));


// Endpoint para agendar mensagem
app.post('/schedule', async (req, res) => {
    const { number, message, date } = req.body;
    const msg = new Message({ number, message, date });
    await msg.save();
    res.send({ success: true });
});

// Agendador: verifica a cada minuto
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const messages = await Message.find({ sent: false, date: { $lte: now } });

    for (const msg of messages) {
        await client.sendMessage(`${msg.number}@c.us`, msg.message);
        msg.sent = true;
        await msg.save();
    }
});

app.post('/send-now', async (req, res) => {
    const { numbers, message } = req.body;

    if (!Array.isArray(numbers) || numbers.length === 0 || !message) {
        return res.status(400).send({ error: 'É necessário fornecer um array de números e uma mensagem.' });
    }

    const results = [];

    for (const number of numbers) {
        try {
            await client.sendMessage(`${number}@c.us`, message);
            results.push({ number, success: true });
        } catch (err) {
            console.error(`Erro ao enviar para ${number}:`, err);
            results.push({ number, success: false, error: 'Erro ao enviar a mensagem.' });
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


app.get('/qr', (req, res) => {
      const qr = getQrCodeBase64();
    if (qr) {
        return res.json({ qr }); // envia base64 do QR
    } else {
        return res.status(404).json({ error: 'QR Code não disponível ou já autenticado.' });
    }
});

app.post('/logout', async (req, res) => {
  try {
    await client.destroy();  // desconecta e limpa sessão
    res.send({ success: true, message: 'Dispositivo desconectado.' });
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).send({ success: false, error: 'Erro ao desconectar o dispositivo.' });
  }
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
