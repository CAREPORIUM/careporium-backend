const transporter = {
    sendMail: async (mailOptions) => {
        const response = await fetch(
            'https://api.brevo.com/v3/smtp/email',
            {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Careporium',
                        email: process.env.EMAIL_FROM
                    },
                    to: Array.isArray(mailOptions.to)
                        ? mailOptions.to
                        : [{ email: mailOptions.to }],
                    subject: mailOptions.subject,
                    textContent: mailOptions.text,
                    ...(mailOptions.html && {
                        htmlContent: mailOptions.html
                    })
                })
            }
        );

        if (!response.ok) {
            const details = await response.text();

            console.error('Brevo API error:', {
                status: response.status,
                details
            });

            throw new Error('Email could not be sent.');
        }

        return {
            messageId: response.headers.get('x-message-id')
        };
    }
};

export { transporter };