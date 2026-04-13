(function(){
  const DB_NAME = 'cadastroDB';
  const STORE = 'fila';
  let db;

  // ======= LISTAS (edite aqui) =======
  // Substitua pelos nomes reais das suas 65 comuns
  const LISTA_COMUNS = [
    "Comum 01","Comum 02","Comum 03","Comum 04","Comum 05",
    "Comum 06","Comum 07","Comum 08","Comum 09","Comum 10",
    "Comum 11","Comum 12","Comum 13","Comum 14","Comum 15",
    "Comum 16","Comum 17","Comum 18","Comum 19","Comum 20",
    "Comum 21","Comum 22","Comum 23","Comum 24","Comum 25",
    "Comum 26","Comum 27","Comum 28","Comum 29","Comum 30",
    "Comum 31","Comum 32","Comum 33","Comum 34","Comum 35",
    "Comum 36","Comum 37","Comum 38","Comum 39","Comum 40",
    "Comum 41","Comum 42","Comum 43","Comum 44","Comum 45",
    "Comum 46","Comum 47","Comum 48","Comum 49","Comum 50",
    "Comum 51","Comum 52","Comum 53","Comum 54","Comum 55",
    "Comum 56","Comum 57","Comum 58","Comum 59","Comum 60",
    "Comum 61","Comum 62","Comum 63","Comum 64","Comum 65"
  ];

  // Substitua pelos 25 instrumentos oficiais do seu cadastro
  const LISTA_INSTRUMENTOS = [
    "Violino","Viola","Violoncelo","Contrabaixo",
    "Flauta","Flautim","Clarinete","Oboé","Fagote",
    "Trompete","Cornetim","Trompa","Trombone","Eufônio",
    "Tuba","Órgão","Piano","Teclado","Violão",
    "Guitarra","Harpa","Bandolim","Acordeon","Sax Alto",
    "Sax Tenor"
  ];
  // ======= FIM DAS LISTAS =======

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

  function popularSelect(el, itens){
    el.innerHTML = '<option value=\"\">— selecione —</option>' + itens.map(v=>`<option>${v}</option>`).join('');
  }

  // Máscara BR para telefone (dinâmica 10/11 dígitos)
  function mascararTelefone(value){
    const d = (value || '').replace(/\D/g,'').slice(0,11);
    if (d.length <= 10){
      // (11) 3456-7890
      return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*$/, function(_,a,b,c){
        return (a?`(${a}`+(a.length===2?') ':''): '') + (b?b:'') + (c?'-'+c:'');
      });
    } else {
      // (11) 93456-7890
      return d.replace(/^(\d{0,2})(\d{0,5})(\d{0,4}).*$/, function(_,a,b,c){
        return (a?`(${a}`+(a.length===2?') ':''): '') + (b?b:'') + (c?'-'+c:'');
      });
    }
  }

  async function sendToServer(payload){
    if (!window.WEBAPP_URL || window.WEBAPP_URL === 'https://script.google.com/macros/s/AKfycbzVQkJ6dK67D3llJc_4_brUTl3PuidyGasmHqFPkR3-sMXAWFEYhcCUE8LbHgVCv3vMLA/exec') {
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

  function validarFormulario(form){
    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const telefone = form.telefone.value.trim();
    const comum = form.comum.value.trim();

    if (!nome) {
      setStatus('Informe o nome.', false);
      form.nome.focus(); return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('E-mail inválido.', false);
      form.email.focus(); return false;
    }
    if (telefone && !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(telefone)) {
      setStatus('Telefone inválido. Use (11) 98888-7777.', false);
      form.telefone.focus(); return false;
    }
    if (!comum) {
      setStatus('Selecione a Comum/Congregação.', false);
      form.comum.focus(); return false;
    }
    return true;
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    const form = ev.target;

    if (!validarFormulario(form)) return;

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
    // Reaplica placeholder "— selecione —"
    form.comum.value = '';
    form.instrumento.value = '';
  }

  // Boot
  document.addEventListener('DOMContentLoaded', async ()=>{
    await openDB();
    await refreshQueueCount();
    updateConn();

    // Popular selects
    popularSelect(document.getElementById('comum'), LISTA_COMUNS);
    popularSelect(document.getElementById('instrumento'), LISTA_INSTRUMENTOS);

    // listeners
    const form = document.getElementById('cadastroForm');
    form.addEventListener('submit', handleSubmit);
    document.getElementById('syncBtn').addEventListener('click', trySync);
    window.addEventListener('online', ()=>{ updateConn(); trySync(); });
    window.addEventListener('offline', updateConn);

    // máscara telefone
    const tel = document.getElementById('telefone');
    tel.addEventListener('input', (e)=>{
      const v = e.target.value;
      const masked = mascararTelefone(v);
      if (v !== masked) {
        const pos = e.target.selectionStart;
        e.target.value = masked;
        // tentativa simples de manter caret próximo ao fim
        e.target.setSelectionRange(masked.length, masked.length);
      }
    });
  });
})();