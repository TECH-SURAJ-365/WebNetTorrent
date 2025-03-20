document.addEventListener('DOMContentLoaded', function () {
    const client = new WebTorrent();

    document.getElementById('startMagnetButton').addEventListener('click', function () {
        const magnetLink = document.getElementById('magnetLink').value;
        if (magnetLink) {
            addTorrent(magnetLink);
        }
    });

    document.getElementById('startTorrentButton').addEventListener('click', function () {
        const fileInput = document.getElementById('torrentFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            addTorrent(file);
        }
    });

    function addTorrent(torrentIdOrFile) {
        // Check if the torrent is already added
        if (client.get(torrentIdOrFile)) {
            console.log('Torrent already added:', torrentIdOrFile);
            return;
        }

        try {
            client.add(torrentIdOrFile, function (torrent) {
                const progressSection = document.getElementById('progressSection');
                const progressBar = document.getElementById('progressBar');
                const progressText = document.getElementById('progressText');
                const fileListSection = document.getElementById('fileListSection');
                const fileList = document.getElementById('fileList');

                progressSection.style.display = 'block';

                torrent.on('download', () => {
                    const percent = Math.round(torrent.progress * 100);
                    progressBar.style.width = percent + '%';
                    const downloadedMB = (torrent.downloaded / (1024 * 1024)).toFixed(2);
                    const totalMB = (torrent.length / (1024 * 1024)).toFixed(2);
                    const timeRemaining = (torrent.timeRemaining / 1000).toFixed(2);
                    progressText.textContent = `${downloadedMB} MB of ${totalMB} MB — ${timeRemaining} seconds remaining`;
                });

                torrent.on('done', () => {
                    progressText.textContent = 'Download complete';
                    progressBar.style.width = '100%';

                    // Enable download buttons
                    const downloadButtons = document.querySelectorAll('.download-button');
                    downloadButtons.forEach(button => {
                        button.disabled = false;
                    });
                });

                torrent.on('error', (err) => {
                    console.error('Torrent error:', err);
                    progressText.textContent = 'Error occurred: ' + err.message;
                });

                torrent.on('noPeers', (announceType) => {
                    console.warn('No peers found for torrent:', announceType);
                    progressText.textContent = 'No peers found. Please check the magnet link or torrent file.';
                });

                // Handle torrent metadata fetched event
                torrent.on('metadata', () => {
                    console.log('Metadata fetched for torrent:', torrent.name);
                    fileListSection.style.display = 'block';
                    fileList.innerHTML = '';
                    torrent.files.forEach(file => {
                        const listItem = document.createElement('li');
                        listItem.className = 'list-group-item';

                        const fileName = document.createElement('span');
                        fileName.textContent = file.name;
                        listItem.appendChild(fileName);

                        const downloadButton = document.createElement('button');
                        downloadButton.className = 'btn btn-primary btn-sm download-button';
                        downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
                        downloadButton.disabled = true; // Disable button until download is complete
                        downloadButton.onclick = () => {
                            file.getBlobURL((err, url) => {
                                if (err) throw err;
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.name;
                                a.click();
                            });
                        };
                        listItem.appendChild(downloadButton);

                        fileList.appendChild(listItem);
                    });
                });

                // Ensure metadata is fetched for uploaded torrent files
                if (torrent.infoHash) {
                    torrent.emit('metadata');
                }
            });
        } catch (error) {
            console.error('Failed to add torrent:', error);
            const progressText = document.getElementById('progressText');
            progressText.textContent = 'Failed to add torrent: ' + error.message;
        }
    }
});