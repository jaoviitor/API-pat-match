const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
    user: "cc973a98c659db",
    pass: "c9bde3a313babf"
    }
});

module.exports = transporter;