(function(){
  const DB_NAME = 'cadastroDB';
  const STORE = 'fila';
  let db;

  // Utilitário: abrir IndexedDB
  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, { keyPath: 'uuid' });
          os.createIndex('byTime','createdAt');
        }
      };
      req.onsuccess = ()=>{ db = req.result; resolve(db); };
      req.onerror = ()=> reject(req.error);
    });
  }

  function putQueue(record){
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }

  function getAllQueued(){
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = ()=> resolve(req.result || []);
      req.onerror = ()=> reject(req.error);
    });
  }

  function deleteFromQueue(uuid){
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(uuid);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }

  // UI helpers
  const $ = (sel)=> document.querySelector(sel);
  const statusEl = $('#status');
  const connChip = $('#connChip');
  const queueChip = $('#queueChip');

  function setStatus(msg, ok){
    statusEl.textContent = msg;
    statusEl.classList.toggle('good', !!ok);
    statusEl.classList.toggle('bad', ok===false);
  }

  function updateConn(){
    connChip.textContent = `Status: ${navigator.onLine ? 'online' : 'offline'}`;
  }

  async function refreshQueueCount(){
    const items = await getAllQueued();
    queueChip.textContent = `Fila: ${items.length}`;
  }

  function uuid(){
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  async function sendToServer(payload){
    if (!window.WEBAPP_URL || window.WEBAPP_URL === 'WEBAPP_URL_AQUI') {
      throw new Error('Configure a WEBAPP_URL no index.html');
    }
    const body = new URLSearchParams(payload).toString(); // simples → evita preflight
    const res = await fetch(window.WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if(!res.ok) throw new Error('Falha HTTP');
    const json = await res.json().catch(()=>({}));
    if(!json.ok) throw new Error(json.error || 'Erro desconhecido');
  }

  async function trySync(){
    const items = await getAllQueued();
    if(items.length===0) return;
    setStatus(`Sincronizando ${items.length} registro(s)...`);
    for (const item of items) {
      try {
        await sendToServer(item);
        await deleteFromQueue(item.uuid);
      } catch (err) {
        console.warn('Falha ao enviar item da fila', err);
        // Interrompe no primeiro erro para tentar depois
        break;
      }
    }
    await refreshQueueCount();
    setStatus('Sincronização concluída.', true);
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    const form = ev.target;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const id = uuid();
    const record = { uuid: id, createdAt: Date.now(), ...payload };

    // Se online, tenta enviar; em erro ou offline → guarda na fila
    try {
      if(navigator.onLine){
        await sendToServer(record);
        setStatus('Cadastro enviado com sucesso!', true);
      } else {
        throw new Error('offline');
      }
    } catch (err) {
      await putQueue(record);
      await refreshQueueCount();
      setStatus('Sem internet. Registro salvo na fila para sincronizar depois.', false);
    }

    form.reset();
  }

  // Boot
  document.addEventListener('DOMContentLoaded', async ()=>{
    await openDB();
    await refreshQueueCount();
    updateConn();

    // listeners
    document.getElementById('cadastroForm').addEventListener('submit', handleSubmit);
    document.getElementById('syncBtn').addEventListener('click', trySync);
    window.addEventListener('online', ()=>{ updateConn(); trySync(); });
    window.addEventListener('offline', updateConn);
  });
})();