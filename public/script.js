document.addEventListener('DOMContentLoaded', function () {
    const client = new WebTorrent();
    let player;

    const trackers = [
        'wss://tracker.btorrent.xyz',
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.webtorrent.io',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://open.demonii.com:1337/announce',
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.leechers-paradise.org:6969/announce'
    ];

    function startTorrent(torrentId) {
        if (!torrentId) {
            alert('Invalid torrent identifier. Please provide a valid .torrent file or magnet link.');
            return;
        }

        if (typeof torrentId === 'string' && !isValidMagnetLink(torrentId)) {
            alert('Invalid magnet link. Please provide a valid magnet link.');
            return;
        } else if (torrentId instanceof Uint8Array && torrentId.length === 0) {
            alert('Invalid .torrent file. Please upload a valid .torrent file.');
            return;
        }

        console.log('Adding torrent:', torrentId);
        
        try {
            client.add(torrentId, { announce: trackers }, torrent => {
                displayFiles(torrent);
                updateDownloadProgress(torrent);

                torrent.files.forEach(file => {
                    if (!isMediaFile(file.name)) {
                        file.priority = 1;
                    }
                });
            }).on('error', err => {
                console.error('Error adding torrent:', err);
                alert('Invalid torrent. Please upload a valid .torrent file or provide a valid magnet link.');
            });
        } catch (error) {
            console.error('Caught error while adding torrent:', error);
            alert('Caught error while adding torrent. Please check the console for details.');
        }
    }

    function isValidMagnetLink(link) {
        return link.startsWith('magnet:?');
    }

    function isMediaFile(filename) {
        const mediaExtensions = ['.mp4', '.mkv', '.mp3', '.webm'];
        return mediaExtensions.some(ext => filename.endsWith(ext));
    }

    document.getElementById('startMagnetButton').addEventListener('click', function () {
        const magnetLink = document.getElementById('magnetLink').value;
        if (!isValidMagnetLink(magnetLink)) {
            return alert('Invalid magnet link. Please enter a valid magnet link.');
        }
        startTorrent(magnetLink);
    });

    document.getElementById('torrentFile').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.torrent')) {
            return alert('Please upload a valid .torrent file.');
        }

        console.log('Selected file:', file);

        const reader = new FileReader();
        reader.onload = function (e) {
            const torrentData = new Uint8Array(e.target.result);
            console.log('Read torrent file:', torrentData);
            startTorrent(torrentData);
        };
        reader.onerror = function (e) {
            console.error('Error reading torrent file:', e);
            alert('Error reading torrent file. Please try again.');
        };
        reader.readAsArrayBuffer(file);
    });

    function displayFiles(torrent) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        torrent.files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';

            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            listItem.appendChild(fileName);

            const downloadButton = document.createElement('button');
            downloadButton.className = 'btn btn-primary btn-sm';
            downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
            downloadButton.onclick = () => downloadFile(file);
            listItem.appendChild(downloadButton);

            if (isMediaFile(file.name)) {
                const streamButton = document.createElement('button');
                streamButton.className = 'btn btn-success btn-sm';
                streamButton.innerHTML = '<i class="fas fa-play"></i> Stream';
                streamButton.onclick = () => streamFile(file);
                listItem.appendChild(streamButton);
            }

            fileList.appendChild(listItem);
        });
    }

    function updateDownloadProgress(torrent) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        setInterval(() => {
            const percent = (torrent.progress * 100).toFixed(2);
            progressBar.style.width = `${percent}%`;

            const downloaded = (torrent.downloaded / 1024 / 1024).toFixed(2);
            const total = (torrent.length / 1024 / 1024).toFixed(2);
            const timeRemaining = torrent.timeRemaining / 1000;
            progressText.textContent = `${downloaded} MB of ${total} MB — ${timeRemaining.toFixed(2)} seconds remaining.`;
        }, 1000);
    }

    function downloadFile(file) {
        const blobStream = file.createReadStream();
        const chunks = [];

        blobStream.on('data', chunk => {
            chunks.push(chunk);
        });

        blobStream.on('end', () => {
            const blob = new Blob(chunks, { type: file.type });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = file.name;
            link.click();
            URL.revokeObjectURL(link.href);
        });

        blobStream.on('error', err => {
            console.error('Error downloading file:', err);
            alert('Error downloading file. Please try again.');
        });
    }

    function streamFile(file) {
        const videoPlayer = document.getElementById('videoPlayer');
        const unmuteButton = document.getElementById('unmuteButton');

        videoPlayer.innerHTML = '';

        const videoElement = document.createElement('video');
        videoElement.controls = true;
        videoElement.style.width = '100%';
        videoPlayer.appendChild(videoElement);

        const mediaSource = new MediaSource();
        videoElement.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', () => {
            const sourceBuffer = mediaSource.addSourceBuffer(`video/${file.name.endsWith('.mp4') ? 'mp4' : 'webm'}`);
            const stream = file.createReadStream();

            stream.on('data', chunk => {
                if (!sourceBuffer.updating) {
                    sourceBuffer.appendBuffer(chunk);
                }
            });

            stream.on('end', () => {
                mediaSource.endOfStream();
                unmuteButton.style.display = 'block';
                unmuteButton.onclick = () => {
                    videoElement.muted = false;
                    unmuteButton.style.display = 'none';
                };
            });

            stream.on('error', err => {
                console.error('Error streaming file:', err);
                alert('Error streaming file. Please try again.');
            });
        });
    }

    client.on('error', err => {
        console.error('WebTorrent error:', err);
    });

    client.on('warning', err => {
        console.warn('WebTorrent warning:', err);
    });
});