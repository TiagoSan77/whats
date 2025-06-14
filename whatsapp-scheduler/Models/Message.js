const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    number: String,
    message: String,
    date: Date,
    sent: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);
