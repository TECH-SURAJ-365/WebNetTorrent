document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('startMagnetButton').addEventListener('click', function () {
        const magnetLink = document.getElementById('magnetLink').value;
        fetch('/add-torrent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ torrentId: magnetLink })
        }).then(response => response.json())
        .then(data => {
            console.log('Torrent added:', data);
            displayFiles(data.files, data.infoHash);
        }).catch(error => {
            console.error('Error adding torrent:', error);
        });
    });

    function displayFiles(files, infoHash) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';

            const fileName = document.createElement('span');
            fileName.textContent = file;
            listItem.appendChild(fileName);

            const downloadButton = document.createElement('button');
            downloadButton.className = 'btn btn-primary btn-sm';
            downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
            downloadButton.onclick = () => downloadFile(infoHash, file);
            listItem.appendChild(downloadButton);

            fileList.appendChild(listItem);
        });
    }

    function downloadFile(infoHash, fileName) {
        window.location.href = `/download/${infoHash}/${fileName}`;
    }
});