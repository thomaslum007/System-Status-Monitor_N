let selectedSource = null;
let selectedDest = null;
let filesToProcess = [];

// Navigation
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    item.classList.add('active');
    const pageId = item.getAttribute('data-page');
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'database') loadDb('employees');
    if (pageId === 'settings') loadDb('rules');
  });
});

// Main Page Actions
document.getElementById('btn-select-source').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    selectedSource = folder;
    document.getElementById('btn-select-source').innerText = `Source: ${folder.split('/').pop()}`;
    checkProcessReady();
  }
});

document.getElementById('btn-select-dest').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    selectedDest = folder;
    document.getElementById('btn-select-dest').innerText = `Dest: ${folder.split('/').pop()}`;
    checkProcessReady();
  }
});

function checkProcessReady() {
  const btn = document.getElementById('btn-process');
  btn.disabled = !(selectedSource && selectedDest);
}

document.getElementById('btn-process').addEventListener('click', async () => {
  const ocrEnabled = document.getElementById('chk-ocr').checked;
  const moveAfterRename = document.getElementById('chk-move').checked;
  
  // For demo/simplicity, we just pass the source folder as "files"
  // In real app, main process would glob the files
  // Here we'll just simulate selecting files for the sake of the demo
  const files = await window.api.selectFiles();
  if (!files || files.length === 0) return;

  document.getElementById('progress-container').style.display = 'block';
  document.getElementById('btn-process').disabled = true;

  const results = await window.api.processFiles({
    files,
    destination: selectedDest,
    ocrEnabled,
    moveAfterRename
  });

  updateQueueTable(results);
  updateStats(results);
  document.getElementById('btn-process').disabled = false;
});

window.api.onProgress((data) => {
  const percent = (data.current / data.total) * 100;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  addQueueRow(data.lastResult);
});

function addQueueRow(res) {
  const tbody = document.querySelector('#queue-table tbody');
  const row = tbody.insertRow(0);
  row.innerHTML = `
    <td>${res.originalName}</td>
    <td>${res.status}</td>
    <td>${res.employee}</td>
    <td>${res.classification}</td>
  `;
}

async function loadDb(type) {
  const data = await window.api.loadDb(type);
  const tbody = document.querySelector(`#${type === 'employees' ? 'db' : 'rules'}-table tbody`);
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = tbody.insertRow();
    Object.values(row).forEach(val => {
      const td = tr.insertCell();
      td.innerText = val;
    });
  });
}

function updateStats(results) {
    const total = results.length;
    const renamed = results.filter(r => r.status === 'Completed').length;
    const failed = results.filter(r => r.status === 'Failed' || r.status === 'Flagged').length;
    
    document.getElementById('stat-processed').innerText = total;
    document.getElementById('stat-renamed').innerText = renamed;
    document.getElementById('stat-failed').innerText = failed;
}
