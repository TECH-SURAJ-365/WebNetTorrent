const client = new WebTorrent();
let player;

// Add more trackers
const trackers = [
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.fastcast.nz',
    'udp://tracker.opentrackr.org:1337/announce' // Fallback UDP tracker
];

// Function to start torrent with additional trackers
function startTorrent(torrentId) {
    client.add(torrentId, { announce: trackers }, torrent => {
        displayFiles(torrent);

        // Prioritize downloading for non-media files
        torrent.files.forEach(file => {
            if (!file.name.endsWith('.mp4') && !file.name.endsWith('.mkv') && !file.name.endsWith('.mp3')) {
                file.priority = 1; // High priority for non-media files
            }
        });
    }).on('error', err => {
        console.error('Error adding torrent:', err);
        alert('Invalid torrent. Please try again.');
    });
}

// Handle Magnet Link
function startMagnet() {
    const magnetLink = document.getElementById('magnetLink').value;
    if (!magnetLink) return alert('Please enter a magnet link.');
    startTorrent(magnetLink);
}

// Handle Torrent File Upload
document.getElementById('torrentFile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const torrentData = new Uint8Array(e.target.result);
        startTorrent(torrentData);
    };
    reader.readAsArrayBuffer(file);
});

// Display Files in the Torrent
function displayFiles(torrent) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear previous list

    torrent.files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item animate__animated animate__fadeIn';

        // File name
        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        listItem.appendChild(fileName);

        // Download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'btn btn-primary btn-sm';
        downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadButton.onclick = () => downloadFile(file);
        listItem.appendChild(downloadButton);

        // Stream button for media files
        if (file.name.endsWith('.mp4') || file.name.endsWith('.mkv') || file.name.endsWith('.mp3')) {
            const streamButton = document.createElement('button');
            streamButton.className = 'btn btn-success btn-sm';
            streamButton.innerHTML = '<i class="fas fa-play"></i> Stream';
            streamButton.onclick = () => streamFile(file);
            listItem.appendChild(streamButton);
        }

        fileList.appendChild(listItem);
    });
}

// Download File
function downloadFile(file) {
    const downloadProgress = document.getElementById('downloadProgress');
    const progressBar = document.getElementById('progressBar');

    if (!downloadProgress || !progressBar) {
        console.error('Progress elements not found in the DOM.');
        alert('Error: Progress elements not found. Please refresh the page.');
        return;
    }

    downloadProgress.style.display = 'block'; // Show progress bar

    const blobStream = file.createReadStream(); // Create a readable stream
    const chunks = [];

    blobStream.on('data', chunk => {
        chunks.push(chunk); // Collect chunks of the file

        // Update progress bar
        const percent = (chunks.length / file.numChunks) * 100;
        progressBar.style.width = `${percent}%`;
    });

    blobStream.on('end', () => {
        // Combine chunks into a single Blob
        const blob = new Blob(chunks, { type: file.type });

        // Create a download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();

        // Clean up the object URL
        URL.revokeObjectURL(link.href);

        // Hide progress bar
        downloadProgress.style.display = 'none';
        progressBar.style.width = '0%';
    });

    blobStream.on('error', err => {
        console.error('Error downloading file:', err);
        alert('Error downloading file. Please try again.');

        // Hide progress bar on error
        downloadProgress.style.display = 'none';
        progressBar.style.width = '0%';
    });
}

// Stream File
function streamFile(file) {
    const videoPlayerContainer = document.getElementById('videoPlayer');
    videoPlayerContainer.innerHTML = ''; // Clear previous player

    // Create a video element
    const videoElement = document.createElement('video');
    videoElement.controls = true; // Add controls to the video element
    videoElement.style.width = '100%'; // Make the video responsive
    videoPlayerContainer.appendChild(videoElement);

    // Render the file to the video element
    file.renderTo(videoElement, { controls: true }, err => {
        if (err) {
            console.error('Error rendering file:', err);
            alert('Error streaming file. Please try again.');
            return;
        }

        // Initialize Plyr
        player = new Plyr(videoElement, {
            controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen']
        });

        // Handle Plyr errors
        player.on('error', err => {
            console.error('Plyr error:', err);
            alert('Error initializing video player. Please try again.');
        });
    });
}

// Debugging
client.on('error', err => {
    console.error('WebTorrent error:', err);
});

client.on('warning', err => {
    console.warn('WebTorrent warning:', err);
});