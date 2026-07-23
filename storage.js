(() => {
  const DB_NAME = 'xenothCompendiumDB';
  const STORE = 'compendium';
  const KEY = 'activeZip';
  const $ = (selector) => document.querySelector(selector);

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readRecord() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function writeRecord(file) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({
        blob: file.slice(0, file.size, file.type || 'application/zip'),
        name: file.name,
        size: file.size,
        installedAt: new Date().toISOString()
      }, KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
  }

  async function deleteRecord() {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function displayRecord(record) {
    const status = $('#storageStatus');
    const remove = $('#removeCompendium');
    if (!record) {
      status.textContent = 'No compendium installed';
      remove.hidden = true;
      return;
    }
    status.textContent = `${record.name} · ${(record.size / 1048576).toFixed(1)} MB · stored on this device`;
    remove.hidden = false;
  }

  async function restore() {
    try {
      const record = await readRecord();
      displayRecord(record);
      if (!record?.blob || typeof window.loadZip !== 'function') return;
      $('#statusText').textContent = 'Restoring installed compendium…';
      const file = new File([record.blob], record.name || 'xenoth.zip', { type: record.blob.type || 'application/zip' });
      await window.loadZip(file);
      $('#statusText').textContent += ' Stored locally.';
    } catch (error) {
      console.error(error);
      $('#statusText').textContent = 'Stored compendium could not be restored. Select the ZIP again.';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const input = $('#zipInput');
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await writeRecord(file);
        displayRecord(await readRecord());
      } catch (error) {
        console.error(error);
        alert('The compendium loaded, but this browser could not store the ZIP permanently.');
      }
    });

    $('#removeCompendium').addEventListener('click', async () => {
      if (!confirm('Remove the locally installed compendium from this browser?')) return;
      await deleteRecord();
      displayRecord(null);
      location.reload();
    });

    restore();
  });
})();
