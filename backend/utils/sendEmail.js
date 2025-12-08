const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Cria o "transporte" (o carteiro)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Se usar outro, mude aqui
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Configura o e-mail
    const message = {
        from: `Se Mexe <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // Envia
    await transporter.sendMail(message);
};

module.exports = sendEmail;