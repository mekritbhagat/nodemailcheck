'use strict';

const amqplib = require('amqplib/callback_api');
const config = require('./config');
amqplib.connect(config.amqp, (err, connection) => {
    if (err) {
        console.error(err.stack);
        return process.exit(1);
    }
    connection.createChannel((err, channel) => {
        if (err) {
            console.error(err.stack);
            return process.exit(1);
        }
        channel.assertQueue(config.queue, {
            durable: true
        }, err => {
            if (err) {
                console.error(err.stack);
                return process.exit(1);
            }
            let sender = (content, next) => {
                let sent = channel.sendToQueue(config.queue, Buffer.from(JSON.stringify(content)), {
                    persistent: true,
                    contentType: 'application/json'
                });
                if (sent) {
                    return next();
                } else {
                    channel.once('drain', () => next());
                }
            };
            let sent = 0;
            let sendNext = () => {
                if (sent >= 100) {
                    console.log('All messages sent!');
                    return channel.close(() => connection.close());
                }
                sent++;
                sender({
                    to: 'recipient@example.com',
                    subject: 'Test message #' + sent,
                    text: 'hello world!'
                }, sendNext);
            };

            sendNext();

        });
    });
});