const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");
require('dotenv').config();

// Initialize MailerSend with your API key
// Ensure MAILERSEND_API_KEY is set in your .env file
const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sendEmail = async (options) => {
  // Define the sender
  const sender = new Sender(process.env.FROM_EMAIL, process.env.FROM_NAME);

  // Define the recipient(s) - MailerSend expects an array of recipients
  // If options.email is a single string, wrap it in an array
  const recipients = Array.isArray(options.email)
    ? options.email.map(email => new Recipient(email))
    : [new Recipient(options.email)];

  // Create email parameters
  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(options.subject)
    .setHtml(options.html || options.message) // Prioritize HTML, fallback to text if HTML not provided
    .setText(options.message); // Text version for clients that don't render HTML

  try {
    const response = await mailersend.email.send(emailParams);
    console.log('Email sent successfully via MailerSend!');
    // Log the response from the API for further success-side diagnostics
    console.log('MailerSend API Response:', response);
  } catch (error) {
    console.error('Error sending email via MailerSend:');

    // Check if the error object contains a response from the API
    if (error.response) {
      // Log detailed error information from the MailerSend API
      console.error('API Error Status:', error.response.status);
      console.error('API Error Message:', error.response.statusText);
      console.error('API Response Data:', error.response.data);
    } else {
      // Log a general error if no API response is available (e.g., network error)
      console.error('General Error Message:', error.message);
      console.error('Full Error Object:', error);
    }
    
    // Re-throw a more informative error to be handled by the caller
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;





// const nodemailer = require('nodemailer')
// const sgMail = require('@sendgrid/mail')
// require('dotenv').config();

// sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// /*const sendEmail = async options => {
//   // create reusable transporter object using the default SMTP transport
//   /*const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     auth: {
//       user: process.env.SMTP_EMAIL,
//       pass: process.env.SMTP_PASSWORD
//     }
//   })*

//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: true,
//     auth: {
//       user: process.env.SMTP_EMAIL,
//       pass: process.env.SMTP_PASSWORD
//     },
//   });  

//   // send mail with defined transport object
//   const message = {
//     from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`, // sender address
//     to: options.email, // list of receivers
//     subject: options.subject, // Subject line
//     text: options.message // plain text body
//   }

//   const info = await transporter.sendMail(message)

//   //console.log('Message sent: %s', info.messageId)
// }*/

// const sendEmail = async options => {
//   const message = {
//     to: options.email,
//     from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
//     subject: options.subject,
//     text: options.message,
//     html: options.html,
//   }

//   await sgMail.send(message)

//   // Send the email
//   /*try {
//     await sgMail.send(message)
//     console.log('Message sent successfully')
//   } catch (error) {
//     console.error('Error sending email:', error)
//     if (error.response) {
//       console.error('Error details:', error.response.body)
//     }
//   }*/
// }

// module.exports = sendEmail
