window.studioDraft=async function(action,value){
  const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('chermo-memory-studio',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('drafts');
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',action==='load'?'readonly':'readwrite'),store=tx.objectStore('drafts');
      const request=action==='load'?store.get('current'):action==='clear'?store.delete('current'):store.put(value,'current');
      tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
    });
  }finally{db.close();}
};
