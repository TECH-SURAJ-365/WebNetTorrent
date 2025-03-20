document.addEventListener('DOMContentLoaded', function () {
    const client = new WebTorrent();

    // Show disclaimer modal on page load
    const disclaimerModal = document.getElementById('disclaimerModal');
    const closeModal = document.getElementsByClassName('close')[0];
    const acceptDisclaimer = document.getElementById('acceptDisclaimer');

    // Display the modal
    disclaimerModal.style.display = 'block';

    // Close the modal when the user clicks on the close button
    closeModal.onclick = function () {
        disclaimerModal.style.display = 'none';
    };

    // Close the modal when the user clicks on the accept button
    acceptDisclaimer.onclick = function () {
        disclaimerModal.style.display = 'none';
    };

    // Close the modal when the user clicks anywhere outside of the modal
    window.onclick = function (event) {
        if (event.target === disclaimerModal) {
            disclaimerModal.style.display = 'none';
        }
    };

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

    document.getElementById('createTorrentButton').addEventListener('click', function () {
        const fileInput = document.getElementById('createTorrentFiles');
        if (fileInput.files.length > 0) {
            createTorrent(fileInput.files);
        }
    });

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        const hDisplay = h > 0 ? `${h}h ` : "";
        const mDisplay = m > 0 ? `${m}m ` : "";
        const sDisplay = s > 0 ? `${s}s` : "";
        return `${hDisplay}${mDisplay}${sDisplay}`.trim();
    }

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
                    const timeRemaining = formatTime(torrent.timeRemaining / 1000);
                    progressText.textContent = `${downloadedMB} MB of ${totalMB} MB — ${timeRemaining} remaining`;
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

    function createTorrent(files) {
        createTorrent(files, (err, torrent) => {
            if (err) {
                console.error('Failed to create torrent:', err);
                return;
            }

            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([torrent], { type: 'application/x-bittorrent' }));
            link.download = 'created.torrent';
            link.click();

            console.log('Torrent created successfully');
        });
    }
});