// Initialize WebTorrent client
const client = new WebTorrent();

// Tab switching function
function openTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
}

// Function to add a torrent (magnet link or .torrent file)
function addTorrent() {
    const magnetInput = document.getElementById('magnetInput');
    const torrentFileInput = document.getElementById('torrentFile');
    const torrentList = document.getElementById('torrentList');
    const status = document.getElementById('status');

    let torrentData;
    if (torrentFileInput.files && torrentFileInput.files.length > 0) {
        torrentData = torrentFileInput.files[0];
        status.textContent = 'Processing .torrent file...';
    } else {
        const magnetURI = magnetInput.value.trim();
        if (!magnetURI) {
            status.textContent = 'Please enter a magnet link or upload a .torrent file';
            return;
        }
        if (!magnetURI.startsWith('magnet:')) {
            status.textContent = 'Invalid magnet link: Must start with "magnet:"';
            return;
        }
        torrentData = magnetURI;
        status.textContent = 'Processing magnet link...';
    }

    client.add(torrentData, {
        announce: [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.fastcast.nz'
        ]
    }, (torrent) => {
        const torrentItem = document.createElement('div');
        torrentItem.className = 'torrent-item';
        torrentItem.innerHTML = `
            <h3>${torrent.name || 'Unknown Torrent'}</h3>
            <p>Size: ${torrent.length ? (torrent.length / 1024 / 1024).toFixed(2) : 'N/A'} MB</p>
            <p>Progress: <span class="progress">0%</span></p>
            <p>Speed: <span class="speed">0 KB/s</span></p>
        `;
        torrentList.appendChild(torrentItem);

        torrent.on('metadata', () => {
            status.textContent = `Metadata received for: ${torrent.name}`;
            const sizeElement = torrentItem.querySelector('p:nth-child(2)');
            sizeElement.textContent = `Size: ${(torrent.length / 1024 / 1024).toFixed(2)} MB`;
        });

        torrent.on('download', () => {
            const progress = torrentItem.querySelector('.progress');
            const speed = torrentItem.querySelector('.speed');
            progress.textContent = `${Math.round(torrent.progress * 100)}%`;
            speed.textContent = `${(torrent.downloadSpeed / 1024).toFixed(2)} KB/s`;
            status.textContent = `Downloading: ${torrent.name}`;
        });

        torrent.on('done', () => {
            status.textContent = `Finished downloading: ${torrent.name}`;
            torrent.files.forEach(file => {
                file.getBlobURL((err, url) => {
                    if (!err) {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = file.name;
                        link.textContent = `Download ${file.name}`;
                        torrentItem.appendChild(link);
                    } else {
                        status.textContent = `Error generating download link: ${err.message}`;
                    }
                });
            });
        });

        torrent.on('error', (err) => {
            status.textContent = `Torrent error: ${err.message}`;
        });
    });

    client.on('error', (err) => {
        status.textContent = `Client error: ${err.message}`;
    });
}

// Function to create a torrent
function createTorrent() {
    const filesInput = document.getElementById('filesToTorrent');
    const torrentNameInput = document.getElementById('torrentName');
    const trackersInput = document.getElementById('torrentTrackers');
    const createStatus = document.getElementById('createStatus');

    const files = filesInput.files;
    if (files.length === 0) {
        createStatus.textContent = 'Please select at least one file.';
        return;
    }

    const options = {
        name: torrentNameInput.value || 'MyTorrent',
        announce: trackersInput.value
            ? trackersInput.value.split(',').map(t => t.trim())
            : ['wss://tracker.openwebtorrent.com'],
        createdBy: 'WebNetTorrent'
    };

    createStatus.textContent = 'Creating torrent...';

    // Use the standalone createTorrent function from the create-torrent library
    createTorrent(files, options, (err, torrent) => {
        if (err) {
            createStatus.textContent = `Error creating torrent: ${err.message}`;
            return;
        }

        const blob = new Blob([torrent], { type: 'application/x-bittorrent' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${options.name}.torrent`;
        a.textContent = 'Download .torrent file';
        createStatus.innerHTML = '';
        createStatus.appendChild(a);
    });
}

// Clean up when page is closed
window.onbeforeunload = () => {
    client.destroy();
};