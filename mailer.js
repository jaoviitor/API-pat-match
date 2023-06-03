const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_SENHA
    }
});

module.exports = transporter;