const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const client = require('./whatsapp');
const Message = require('./Models/Message.js');

const app = express();
app.use(express.json());

// MongoDB
mongoose.connect('mongodb+srv://teste123:1nqly4SssvbF9GWt@cluster0.51trz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

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
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).send({ error: 'Número e mensagem são obrigatórios.' });
    }

    try {
        await client.sendMessage(`${number}@c.us`, message);
        res.send({ success: true, message: 'Mensagem enviada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, error: 'Erro ao enviar a mensagem.' });
    }
});


app.listen(3000, () => {
    console.log('Server started on port 3000');
});
