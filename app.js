const API_BASE = 'http://ec2-13-53-174-228.eu-north-1.compute.amazonaws.com/api';
let socket, currentUser, activeRoomId, isOwner = false, portalPermissions = {}, timerInterval;

function initApp() {
    const savedUID = localStorage.getItem('qs_uid');
    currentUser = { uid: savedUID || 'u-' + Math.random().toString(36).substring(7) };
    if(!savedUID) localStorage.setItem('qs_uid', currentUser.uid);

    try { 
        // Updated socket connection to your EC2 instance
        socket = io('http://ec2-13-53-174-228.eu-north-1.compute.amazonaws.com'); 
        socket.on('user-count', (count) => {
            document.getElementById('user-count-display').innerText = `${count} Online`;
        });
        socket.on('portal-closed', (data) => {
            showToast(`Portal ${data.reason}.`);
            setTimeout(() => { localStorage.removeItem('qs_active'); location.reload(); }, 2500);
        });
    } catch(e) { console.error("Socket Error"); }

    const savedPortal = localStorage.getItem('qs_active');
    if(savedPortal) restoreSession(savedPortal);
    else updateRecentList();
}

// --- FIXED DELETE FUNCTION ---
window.deleteFile = async (fileId) => {
    if (!confirm("Delete this file?")) return;
    try {
        const res = await fetch(`${API_BASE}/portal/${activeRoomId}/file/${fileId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            showToast("File deleted");
            // Server will emit 'file-updated' via socket
        }
    } catch (e) {
        showToast("Delete failed.");
    }
};

// --- FIXED SHARE LOGIC ---
window.sharePortalNative = async () => {
    const joinUrl = window.location.origin + window.location.pathname + "?join=" + activeRoomId;
    
    // Note: Native share requires HTTPS. EC2 http:// links will fallback to copy.
    if (navigator.share && window.isSecureContext) {
        try {
            await navigator.share({
                title: 'QuickShare',
                text: `Join my portal: ${activeRoomId}`,
                url: joinUrl
            });
        } catch (err) {
            window.copyPortalLink();
        }
    } else {
        window.copyPortalLink();
    }
};

window.copyPortalLink = () => {
    const joinUrl = window.location.origin + window.location.pathname + "?join=" + activeRoomId;
    navigator.clipboard.writeText(joinUrl).then(() => {
        showToast("Link Copied!");
    }).catch(() => {
        // Legacy copy fallback
        const el = document.createElement('textarea');
        el.value = joinUrl;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast("Link Copied!");
    });
};

// --- PORTAL MANAGEMENT ---
async function restoreSession(id) {
    try {
        const res = await fetch(`${API_BASE}/portal/${id}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, autoRetry: true })
        });
        const data = await res.json();
        if(data.success) { 
            isOwner = data.isOwner; 
            portalPermissions = data.permissions; 
            enterPortal(id, data.createdAt); 
        } else {
            localStorage.removeItem('qs_active');
            updateRecentList();
        }
    } catch(e) { console.error("Restore Failed"); }
}

window.createPortal = async () => {
    const pass = document.getElementById('create-password').value;
    const perms = { 
        canUpload: document.getElementById('perm-upload').checked, 
        canDownload: document.getElementById('perm-download').checked, 
        canDelete: document.getElementById('perm-delete').checked 
    };
    try {
        const res = await fetch(`${API_BASE}/portal/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerId: currentUser.uid, password: pass, permissions: perms })
        });
        const data = await res.json();
        if(data.success) { 
            isOwner = true; 
            portalPermissions = { canUpload: true, canDownload: true, canDelete: true }; 
            enterPortal(data.portalId, Date.now()); 
        }
    } catch(e) { showToast("Portal creation failed."); }
};

window.joinPortal = async (manualId = null) => {
    const id = (manualId || document.getElementById('join-input').value).toUpperCase();
    if(!id) return;
    const pass = manualId ? null : prompt("Enter PIN:");
    try {
        const res = await fetch(`${API_BASE}/portal/${id}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, password: pass })
        });
        const data = await res.json();
        if(data.success) { 
            isOwner = data.isOwner; 
            portalPermissions = data.permissions; 
            enterPortal(id, data.createdAt); 
        } else showToast(data.error);
    } catch(e) { showToast("Connection failed."); }
};

function enterPortal(id, createdAt) {
    activeRoomId = id;
    localStorage.setItem('qs_active', id);
    addToRecent(id);
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-portal').classList.remove('hidden');
    document.getElementById('portal-id-display').innerText = id;

    const badge = document.getElementById('role-badge');
    badge.innerText = isOwner ? "Owner" : "Guest";
    badge.className = `text-[9px] font-black px-2 py-0.5 rounded uppercase ${isOwner ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`;

    if(isOwner) document.getElementById('owner-live-controls').classList.remove('hidden');
    document.getElementById('upload-section-container').classList.toggle('hidden', !(isOwner || portalPermissions.canUpload));

    socket.emit('join-portal', id);
    socket.on('file-updated', renderFiles);
    
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { 
        text: window.location.origin + window.location.pathname + "?join=" + id, 
        width: 64, 
        height: 64 
    });
    
    startCountdown(createdAt);
    fetchFiles();
}

function startCountdown(createdAt) {
    if (timerInterval) clearInterval(timerInterval);
    const display = document.getElementById('timer-display');
    timerInterval = setInterval(() => {
        const remaining = 3600000 - (Date.now() - createdAt);
        if (remaining <= 0) { clearInterval(timerInterval); display.innerText = "EXPIRED"; return; }
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function renderFiles(files) {
    const list = document.getElementById('file-list');
    const canDown = isOwner || portalPermissions.canDownload;
    const canDel = isOwner || portalPermissions.canDelete;
    list.innerHTML = files.map(f => `
        <div class="flex justify-between p-4 bg-white border rounded-2xl items-center shadow-sm">
            <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-sm font-bold truncate">${f.fileName}</span>
            </div>
            <div class="flex gap-2">
                ${canDown ? `<button onclick="downloadFile('${f.id}', '${f.fileName}')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">GET</button>` : ''}
                ${canDel ? `<button onclick="deleteFile('${f.id}')" class="text-red-600 font-mono p-2">✕</button>` : ''}
            </div>
        </div>`).join('');
}

async function fetchFiles() {
    const res = await fetch(`${API_BASE}/portal/${activeRoomId}/files`);
    const data = await res.json();
    renderFiles(data.files);
}

window.uploadFiles = async (files) => {
    for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/portal/${activeRoomId}/upload`);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = () => showToast("Shared!");
            xhr.send(JSON.stringify({ fileName: file.name, fileSize: file.size, fileType: file.type, data: e.target.result.split(',')[1] }));
        };
        reader.readAsDataURL(file);
    }
};

window.downloadFile = async (id, name) => {
    const res = await fetch(`${API_BASE}/portal/${activeRoomId}/download/${id}`);
    const data = await res.json();
    const byteCharacters = atob(data.file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], {type: data.file.fileType});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
};

window.destroyPortal = async () => {
    if(!isOwner || !confirm("Destroy portal?")) return;
    const res = await fetch(`${API_BASE}/portal/${activeRoomId}/destroy`, { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ownerId: currentUser.uid }) 
    });
    if((await res.json()).success) { localStorage.removeItem('qs_active'); location.reload(); }
};

function addToRecent(id) {
    let recent = JSON.parse(localStorage.getItem('qs_recent') || '[]');
    recent = [id, ...recent.filter(i => i !== id)].slice(0, 3);
    localStorage.setItem('qs_recent', JSON.stringify(recent));
}

function updateRecentList() {
    const list = JSON.parse(localStorage.getItem('qs_recent') || '[]');
    const container = document.getElementById('recent-list');
    const section = document.getElementById('recent-portals-section');
    if (list.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    container.innerHTML = list.map(id => `
        <button onclick="joinPortal('${id}')" class="w-full p-4 bg-white border rounded-2xl text-left flex justify-between items-center shadow-sm">
            <span class="font-black tracking-widest text-slate-700">${id}</span>
            <span class="text-[9px] font-bold text-blue-600 uppercase">Join →</span>
        </button>`).join('');
}

window.exitPortal = () => { if(confirm("Exit?")) { localStorage.removeItem('qs_active'); location.reload(); } };

function showToast(m) {
    const t = document.getElementById('toast'); t.innerText = m; t.style.opacity = 1;
    setTimeout(() => t.style.opacity = 0, 3000);
}

initApp();
