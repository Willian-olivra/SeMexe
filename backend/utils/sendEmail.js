const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const message = {
        from: `Se Mexe <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    await transporter.sendMail(message);
};

module.exports = sendEmail;