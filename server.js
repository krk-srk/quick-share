const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let portals = {};

io.on('connection', (socket) => {
    socket.on('join-portal', (portalId) => {
        socket.join(portalId);
        const clients = io.sockets.adapter.rooms.get(portalId);
        io.to(portalId).emit('user-count', clients ? clients.size : 0);
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(room => {
            const clients = io.sockets.adapter.rooms.get(room);
            io.to(room).emit('user-count', clients ? clients.size - 1 : 0);
        });
    });
});

app.post('/api/portal/create', (req, res) => {
    const portalId = Math.random().toString(36).substring(2, 8).toUpperCase();
    portals[portalId] = { 
        id: portalId, 
        files: [], 
        password: req.body.password || null,
        ownerId: req.body.ownerId, 
        permissions: req.body.permissions,
        createdAt: Date.now() 
    };
    
    // Auto-destruct after 1 hour
    setTimeout(() => { 
        if (portals[portalId]) {
            io.to(portalId).emit('portal-closed', { reason: 'Expired' });
            delete portals[portalId];
        }
    }, 3600000);

    res.json({ success: true, portalId });
});

app.delete('/api/portal/:id/destroy', (req, res) => {
    const portal = portals[req.params.id];
    if (!portal || portal.ownerId !== req.body.ownerId) return res.status(403).json({ success: false });
    
    io.to(req.params.id).emit('portal-closed', { reason: 'Destroyed' });
    delete portals[req.params.id];
    res.json({ success: true });
});
// SECRET ADMIN ROUTE: Get all active portal data
// In a real app, you would protect this with a hardcoded Admin Password
app.get('/api/admin/dashboard', (req, res) => {
    const adminKey = req.query.key;
    if (adminKey !== "MY_SECRET_ADMIN_KEY") { // Change this to your own secret key
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const report = Object.values(portals).map(p => ({
        id: p.id,
        fileCount: p.files.length,
        ownerId: p.ownerId,
        createdAt: p.createdAt,
        expiresIn: Math.max(0, 3600000 - (Date.now() - p.createdAt))
    }));

    res.json({ success: true, portals: report });
});
// Add this at the top with your other variables
let globalHistory = []; 

// Inside app.post('/api/portal/:id/upload')
app.post('/api/portal/:id/upload', (req, res) => {
    const portal = portals[req.params.id];
    if (!portal) return res.status(404).json({ success: false });

    const file = { 
        id: Math.random().toString(36).substring(7), 
        fileName: req.body.fileName,
        fileSize: req.body.fileSize,
        fileType: req.body.fileType,
        data: req.body.data, 
        ts: Date.now() 
    };
    portal.files.push(file);

    // Store in history (limit to 100 entries)
    globalHistory.push({
        portalId: req.params.id,
        fileName: file.fileName,
        fileSize: (file.fileSize / 1024).toFixed(2) + " KB",
        timestamp: new Date().toLocaleTimeString()
    });
    if (globalHistory.length > 100) globalHistory.shift();

    io.to(req.params.id).emit('file-updated', portal.files.map(({data, ...rest}) => rest));
    res.json({ success: true });
});

// The Admin Route
app.get('/api/admin/dashboard', (req, res) => {
    const adminKey = req.query.key;
    // CRITICAL: This MUST match the key in admin.html
    if (adminKey !== "MY_SECRET_ADMIN_KEY") {
        return res.status(403).json({ success: false, error: "Invalid Admin Key" });
    }

    const activePortals = Object.values(portals).map(p => ({
        id: p.id,
        fileCount: p.files.length,
        ownerId: p.ownerId,
        createdAt: p.createdAt,
        expiresIn: Math.max(0, 3600000 - (Date.now() - p.createdAt))
    }));

    res.json({ 
        success: true, 
        portals: activePortals,
        history: globalHistory 
    });
});
app.post('/api/portal/:id/verify', (req, res) => {
    const portal = portals[req.params.id];
    if (!portal) return res.status(404).json({ success: false, error: "Portal not found" });
    const isOwner = req.body.userId === portal.ownerId;
    if (isOwner || !portal.password || portal.password === req.body.password || req.body.autoRetry) {
        res.json({ success: true, isOwner, permissions: portal.permissions, createdAt: portal.createdAt });
    } else res.json({ success: false, error: "Invalid Password" });
});

app.post('/api/portal/:id/upload', (req, res) => {
    const portal = portals[req.params.id];
    if (!portal) return res.status(404).json({ success: false });
    const file = { id: Math.random().toString(36).substring(7), ...req.body, ts: Date.now() };
    portal.files.push(file);
    io.to(req.params.id).emit('file-updated', portal.files.map(({data, ...rest}) => rest));
    res.json({ success: true });
});

app.get('/api/portal/:id/files', (req, res) => {
    const portal = portals[req.params.id];
    if (!portal) return res.status(404).json({ success: false });
    res.json({ success: true, files: portal.files.map(({data, ...rest}) => rest) });
});

app.get('/api/portal/:id/download/:fileId', (req, res) => {
    const file = portals[req.params.id]?.files.find(f => f.id === req.params.fileId);
    if (!file) return res.status(404).json({ success: false });
    res.json({ success: true, file });
});

app.delete('/api/portal/:id/file/:fileId', (req, res) => {
    const portal = portals[req.params.id];
    if (portal) {
        portal.files = portal.files.filter(f => f.id !== req.params.fileId);
        io.to(req.params.id).emit('file-updated', portal.files.map(({data, ...rest}) => rest));
    }
    res.json({ success: true });
});

server.listen(PORT, '0.0.0.0', () => console.log(`🚀 QuickShare Hub Active on ${PORT}`));
