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
        origin: [
            "https://192.168.100.87:3000",
            "https://192.168.100.87:4200"
        ],
        methods: ["GET", "POST"]
    }
});

const users = new Map();
const channelMembers = new Map();
const channelScreenSharerId = new Map(); // channelId -> userId currently sharing

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('register', ({ userId }) => {
        if (!userId) return;
        const id = String(userId);
        users.set(id, socket.id);
        socket.userId = id;
        console.log(`Registered user ${id} -> ${socket.id}`);
    });

    socket.on('join-channel', ({ channelId }) => {
        if (!socket.userId || !channelId) return;
        const members = channelMembers.get(channelId) ?? new Set();
        members.add(socket.userId);
        channelMembers.set(channelId, members);
        socket.join(`channel-${channelId}`);
        console.log(`User ${socket.userId} joined channel ${channelId}`);
    });

    socket.on('leave-channel', ({ channelId }) => {
        if (!socket.userId || !channelId) return;
        const members = channelMembers.get(channelId);
        if (members) {
            members.delete(socket.userId);
            if (members.size === 0) {
                channelMembers.delete(channelId);
            }
        }
        socket.leave(`channel-${channelId}`);
        console.log(`User ${socket.userId} left channel ${channelId}`);
    });

    socket.on('start-channel-call', (payload) => {
        if (!payload.channelId || !payload.from) return;
        console.log('Starting channel call', payload.channelId, 'from', payload.from);
        const members = channelMembers.get(payload.channelId);
        if (!members) return;

        for (const memberId of members) {
            if (memberId === payload.from) continue;
            const targetSocketId = users.get(memberId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('channel-call-request', payload);
            }
        }
    });

    socket.on('channel-ready', (payload) => {
        if (!payload.to || !payload.from) return;
        const targetSocketId = users.get(payload.to);
        console.log('Channel participant ready', payload.from, '->', payload.to, 'channel', payload.channelId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('channel-ready', payload);
        }
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

    // Mesh: when a peer is ready, broadcast to whole channel so all others connect too
    socket.on('channel-peer-joined', (payload) => {
        if (!payload.from || !payload.channelId) return;
        console.log(`Peer ${payload.from} joined channel meeting ${payload.channelId}`);
        socket.to(`channel-${payload.channelId}`).emit('channel-peer-joined', payload);
    });

    socket.on('screen-share-started', (payload) => {
        const { from, to, channelId } = payload;
        if (!from) return;
        console.log(`Screen share started by ${from}`);

        if (channelId) {
            // Enforce only one sharer per channel
            const current = channelScreenSharerId.get(channelId);
            if (current && current !== from) {
                socket.emit('screen-share-blocked', { channelId, sharerId: current });
                return;
            }
            channelScreenSharerId.set(channelId, from);
            socket.to(`channel-${channelId}`).emit('screen-share-started', payload);
        } else if (to) {
            const targetSocketId = users.get(to);
            if (targetSocketId) io.to(targetSocketId).emit('screen-share-started', payload);
        }
    });

    socket.on('screen-share-stopped', (payload) => {
        const { from, to, channelId } = payload;
        if (!from) return;
        console.log(`Screen share stopped by ${from}`);

        if (channelId) {
            if (channelScreenSharerId.get(channelId) === from) {
                channelScreenSharerId.delete(channelId);
            }
            socket.to(`channel-${channelId}`).emit('screen-share-stopped', payload);
        } else if (to) {
            const targetSocketId = users.get(to);
            if (targetSocketId) io.to(targetSocketId).emit('screen-share-stopped', payload);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        if (socket.userId) {
            users.delete(socket.userId);
            for (const [channelId, members] of channelMembers.entries()) {
                members.delete(socket.userId);
                if (members.size === 0) {
                    channelMembers.delete(channelId);
                }
            }
            // Release any screen share this user held
            for (const [channelId, sharerId] of channelScreenSharerId.entries()) {
                if (sharerId === socket.userId) {
                    channelScreenSharerId.delete(channelId);
                    io.to(`channel-${channelId}`).emit('screen-share-stopped', { from: socket.userId, channelId });
                }
            }
        }
    });
});


server.listen(3000, () => console.log('Server running on https://192.168.100.87:3000'));