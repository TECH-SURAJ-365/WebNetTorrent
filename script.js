document.addEventListener('DOMContentLoaded', function () {
    const client = new WebTorrent();

    document.getElementById('startMagnetButton').addEventListener('click', function () {
        const magnetLink = document.getElementById('magnetLink').value;
        if (magnetLink) {
            client.add(magnetLink, onTorrent);
        }
    });

    document.getElementById('startTorrentButton').addEventListener('click', function () {
        const fileInput = document.getElementById('torrentFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            client.add(file, onTorrent);
        }
    });

    function onTorrent(torrent) {
        const progressSection = document.getElementById('progressSection');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const fileListSection = document.getElementById('fileListSection');
        const fileList = document.getElementById('fileList');

        progressSection.style.display = 'block';

        torrent.on('download', () => {
            const percent = Math.round(torrent.progress * 100 * 100) / 100;
            progressBar.style.width = percent + '%';
            progressText.textContent = `${(torrent.downloaded / (1024 * 1024)).toFixed(2)} MB of ${(torrent.length / (1024 * 1024)).toFixed(2)} MB — ${torrent.timeRemaining / 1000} seconds remaining`;
        });

        torrent.on('done', () => {
            progressText.textContent = 'Download complete';
            progressBar.style.width = '100%';
        });

        fileListSection.style.display = 'block';
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
    }
});