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

// Function to format speed (convert KB/s to MB/s if >= 1024 KB/s)
function formatSpeed(speedInKB) {
    if (speedInKB >= 1024) {
        return `${(speedInKB / 1024).toFixed(2)} MB/s`;
    }
    return `${speedInKB.toFixed(2)} KB/s`;
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
            <div class="file-list">
                <h4>Files:</h4>
                <ul class="files"></ul>
            </div>
        `;
        torrentList.appendChild(torrentItem);

        // Populate file list once metadata is available
        torrent.on('metadata', () => {
            console.log('Metadata received:', torrent.files);
            status.textContent = `Metadata received for: ${torrent.name}`;
            const sizeElement = torrentItem.querySelector('p:nth-child(2)');
            sizeElement.textContent = `Size: ${(torrent.length / 1024 / 1024).toFixed(2)} MB`;

            // Display list of files
            const fileList = torrentItem.querySelector('.files');
            fileList.innerHTML = '';
            torrent.files.forEach(file => {
                const li = document.createElement('li');
                li.textContent = `${file.name} (${(file.length / 1024 / 1024).toFixed(2)} MB)`;
                li.setAttribute('data-file-name', file.name);
                fileList.appendChild(li);
            });
        });

        torrent.on('download', () => {
            const progress = torrentItem.querySelector('.progress');
            const speed = torrentItem.querySelector('.speed');
            const progressValue = Math.round(torrent.progress * 100);
            progress.textContent = `${progressValue}%`;
            speed.textContent = formatSpeed(torrent.downloadSpeed / 1024);
            status.textContent = `Downloading: ${torrent.name}`;
        });

        torrent.on('done', () => {
            console.log('Download completed:', torrent.files);
            status.textContent = `Download Complete: ${torrent.name}`;
            const speed = torrentItem.querySelector('.speed');
            speed.textContent = '0 KB/s';
            const fileList = torrentItem.querySelector('.files');
            if (fileList.children.length === 0) {
                torrent.files.forEach(file => {
                    const li = document.createElement('li');
                    li.textContent = `${file.name} (${(file.length / 1024 / 1024).toFixed(2)} MB)`;
                    li.setAttribute('data-file-name', file.name);
                    fileList.appendChild(li);
                });
            }
            torrent.files.forEach(file => {
                const li = Array.from(fileList.children).find(item => item.getAttribute('data-file-name') === file.name);
                if (li) {
                    file.getBlobURL((err, url) => {
                        if (!err) {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = file.name;
                            link.textContent = 'Download';
                            link.className = 'download-link';
                            li.appendChild(link);
                        } else {
                            status.textContent = `Error generating download link: ${err.message}`;
                        }
                    });
                }
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