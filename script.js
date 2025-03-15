document.addEventListener('DOMContentLoaded', function () {
    const client = new WebTorrent();
    let player;

    // Add more reliable trackers
    const trackers = [
        'wss://tracker.btorrent.xyz',
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.webtorrent.io',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://open.demonii.com:1337/announce',
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.leechers-paradise.org:6969/announce'
    ];

    // Function to start torrent with additional trackers
    function startTorrent(torrentId) {
        if (!torrentId) {
            alert('Invalid torrent identifier. Please provide a valid .torrent file or magnet link.');
            return;
        }

        // Check if torrentId is a valid magnet link or Uint8Array
        if (typeof torrentId === 'string' && !isValidMagnetLink(torrentId)) {
            alert('Invalid magnet link. Please provide a valid magnet link.');
            return;
        } else if (torrentId instanceof Uint8Array && torrentId.length === 0) {
            alert('Invalid .torrent file. Please upload a valid .torrent file.');
            return;
        }

        // Debugging: Log the torrent ID
        console.log('Starting torrent:', torrentId);

        client.add(torrentId, { announce: trackers }, torrent => {
            console.log('Torrent added successfully:', torrent);
            displayFiles(torrent);
            updateDownloadProgress(torrent);

            // Prioritize downloading for non-media files
            torrent.files.forEach(file => {
                if (!isMediaFile(file.name)) {
                    file.priority = 1; // High priority for non-media files
                }
            });
        }).on('error', err => {
            console.error('Error adding torrent:', err);
            alert('Invalid torrent. Please upload a valid .torrent file or provide a valid magnet link.');
        });
    }

    // Check if a magnet link is valid
    function isValidMagnetLink(link) {
        return link.startsWith('magnet:?');
    }

    // Check if a file is a media file
    function isMediaFile(filename) {
        const mediaExtensions = ['.mp4', '.mkv', '.mp3', '.webm'];
        return mediaExtensions.some(ext => filename.endsWith(ext));
    }

    // Handle Magnet Link
    document.getElementById('startMagnetButton').addEventListener('click', function () {
        const magnetLink = document.getElementById('magnetLink').value;
        if (!isValidMagnetLink(magnetLink)) {
            return alert('Invalid magnet link. Please enter a valid magnet link.');
        }
        startTorrent(magnetLink);
    });

    // Handle Torrent File Upload
    document.getElementById('torrentFile').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.torrent')) {
            return alert('Please upload a valid .torrent file.');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                // Convert the file data to a Uint8Array
                const torrentData = new Uint8Array(e.target.result);

                // Debugging: Log the torrent data
                console.log('Torrent data:', torrentData);

                // Validate the torrent data
                if (torrentData.length === 0) {
                    throw new Error('The .torrent file is empty or invalid.');
                }

                // Start the torrent
                startTorrent(torrentData);
            } catch (err) {
                console.error('Error reading .torrent file:', err);
                alert('Error reading .torrent file. Please upload a valid file.');
            }
        };

        reader.onerror = function (err) {
            console.error('FileReader error:', err);
            alert('Error reading the file. Please try again.');
        };

        // Read the file as an ArrayBuffer
        reader.readAsArrayBuffer(file);
    });

    // Display Files in the Torrent
    function displayFiles(torrent) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = ''; // Clear previous list

        torrent.files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';

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
            if (isMediaFile(file.name)) {
                const streamButton = document.createElement('button');
                streamButton.className = 'btn btn-success btn-sm';
                streamButton.innerHTML = '<i class="fas fa-play"></i> Stream';
                streamButton.onclick = () => {
                    if (file.downloaded === file.length) {
                        streamFile(file);
                    } else {
                        console.error('File is not fully downloaded:', file.name);
                        alert('File is not fully downloaded. Please wait for the download to complete.');
                    }
                };
                listItem.appendChild(streamButton);
            }

            fileList.appendChild(listItem);
        });
    }

    // Update Download Progress
    function updateDownloadProgress(torrent) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        // Update progress every second
        setInterval(() => {
            const percent = (torrent.progress * 100).toFixed(2);
            progressBar.style.width = `${percent}%`; // Update progress bar width

            const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2);
            const total = (torrent.length / 1024 / 1024).toFixed(2);
            const timeRemaining = torrent.timeRemaining / 1000;
            progressText.textContent = `${downloaded} MB of ${total} MB — ${timeRemaining.toFixed(2)} seconds remaining.`;
        }, 1000); // Update every second
    }

    // Download File
    function downloadFile(file) {
        const blobStream = file.createReadStream(); // Create a readable stream
        const chunks = [];

        blobStream.on('data', chunk => {
            chunks.push(chunk); // Collect chunks of the file
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
        });

        blobStream.on('error', err => {
            console.error('Error downloading file:', err);
            alert('Error downloading file. Please try again.');
        });
    }

    // Stream File
    function streamFile(file) {
        const videoPlayer = document.getElementById('videoPlayer');
        const unmuteButton = document.getElementById('unmuteButton');

        // Clear previous video source
        videoPlayer.innerHTML = '';

        // Create a new video element
        const videoElement = document.createElement('video');
        videoElement.controls = true; // Add controls to the video element
        videoElement.style.width = '100%'; // Make the video responsive
        videoPlayer.appendChild(videoElement);

        // Debugging: Log the file being streamed
        console.log('Streaming file:', file.name);

        // Create a readable stream from the file
        const stream = file.createReadStream();
        const chunks = [];

        // Collect chunks of the file
        stream.on('data', chunk => {
            chunks.push(chunk);
        });

        // When the stream ends, create a Blob and set it as the video source
        stream.on('end', () => {
            const blob = new Blob(chunks, { type: file.type });
            const objectURL = URL.createObjectURL(blob);

            // Set the video source
            videoElement.src = objectURL;

            // Show unmute button
            unmuteButton.style.display = 'block';
            unmuteButton.onclick = () => {
                videoElement.muted = false;
                unmuteButton.style.display = 'none';
            };

            // Debugging: Log successful rendering
            console.log('File rendered successfully:', file.name);
        });

        // Handle stream errors
        stream.on('error', err => {
            console.error('Error streaming file:', err);
            alert('Error streaming file. Please try again.');
        });
    }

    // Debugging
    client.on('error', err => {
        console.error('WebTorrent error:', err);
    });

    client.on('warning', err => {
        console.warn('WebTorrent warning:', err);
    });
});