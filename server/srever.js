const express = require('express');
const fs = require('fs');
const https = require('https');
const socketIo = require('socket.io');
const path = require('path');

const app = express();

// Load SSL certificate and key with correct path
const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost+2.pem'))
};

const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: {
       origin: "https://192.168.100.87:4200",  // Update with HTTPS URL
        methods: ["GET", "POST"]
    }
});

const users = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('register', ({ userId }) => {
        if (!userId) return;
        const id = Number(userId);
        users.set(id, socket.id);
        socket.userId = id;
        console.log(`Registered user ${id} -> ${socket.id}`);
    });

    socket.on('offer', (payload) => {
        console.log('Received offer', payload.from, '->', payload.to);
        const targetSocketId = users.get(payload.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('offer', payload);
        }
    });

    socket.on('answer', (payload) => {
        console.log('Received answer', payload.from, '->', payload.to);
        const targetSocketId = users.get(payload.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer', payload);
        }
    });

    socket.on('candidate', (payload) => {
        console.log('Received candidate', payload.from, '->', payload.to);
        const targetSocketId = users.get(payload.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('candidate', payload);
        }
    });

    socket.on('hangup', (payload) => {
        console.log('Received hangup', payload.from, '->', payload.to);
        const targetSocketId = users.get(payload.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('hangup', payload);
        }
    });

    socket.on('reject', (payload) => {
        console.log('Received reject', payload.from, '->', payload.to);
        const targetSocketId = users.get(payload.to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('reject', payload);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        if (socket.userId) {
            users.delete(socket.userId);
        }
    });
});


server.listen(3000, () => console.log('Server running on https://192.168.100.87:3000'));