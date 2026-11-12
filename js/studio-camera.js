window.createStudioCamera = function(onPhoto,el = id=>document.getElementById(id)){
  const video=el('video'),still=el('still'),status=el('camera-status');
  let stream=null,generation=0,facing='user',total=1,shot=0,paused=false,skip=false;
  let audio=null, shutterBuffer=null, playing=0;
  let manualAdvance=null;
  function stop(){
    manualAdvance?.(false);
    if(stream)stream.getTracks().forEach(track=>track.stop());
    stream=null;video.srcObject=null;video.classList?.remove('live');
  }
  function close(){
    const restoreFocus=['pause','skip-shot','cancel-shot'].some(id=>el(id)===document.activeElement);
    generation++;stop();still.width=still.height=1;el('count').textContent='';
    sequenceControls(false);el('shutter').disabled=true;el('switch').disabled=true;el('enable-camera').hidden=false;
    el('capture-mode').disabled=false;
    if(restoreFocus && !document.hidden)el('enable-camera').focus();
    releaseAudio();
  }
  function sequenceControls(active){
    for(const id of ['pause','skip-shot','cancel-shot'])el(id).hidden=!active;
  }
  async function start(){
    const trigger=document.activeElement;
    const focusShutter=[el('enable-camera'),el('switch')].includes(trigger);
    const current=++generation;stop();el('count').textContent='';
    el('shutter').disabled=true;el('switch').disabled=true;
    el('enable-camera').hidden=true;el('capture-mode').disabled=true;
    status.textContent='Allow camera access to use the viewfinder, or choose a gallery photo.';
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1440}}});
      if(current!==generation){media.getTracks().forEach(t=>t.stop());return;}
      stream=media;video.srcObject=stream;await video.play();
      if(current!==generation)return;
      video.classList?.add('live');
      el('shutter').disabled=false;el('switch').disabled=false;
      if(focusShutter && [document.body,trigger].includes(document.activeElement))el('shutter').focus();
      status.textContent=total>1?'Start a sequence of '+total+' photos. Choose your timing between shots.':'Ready for your photograph.';
      el('shutter').textContent=total>1?'Start '+total+' photos':'Take photo';
      stream.getVideoTracks?.()[0]?.addEventListener('ended',()=>{if(current===generation){close();status.textContent='Camera disconnected. Your captured photos are in the roll.';}});

    }catch(error){
      if(current!==generation)return;
      close();
      const messages={
        NotAllowedError:'Camera access was blocked. Allow Camera for this site in your browser and Windows camera privacy settings. In an embedded browser, try opening this page in Chrome or Edge.',
        NotFoundError:'No camera was found. Connect a camera or choose photos from your device.',
        NotReadableError:'The camera could not start. Close other apps using it, then try again.',
        OverconstrainedError:'This camera cannot use the requested settings. Try switching cameras.'
      };
      status.textContent=messages[error.name]||'Camera access needs a supported browser on localhost or HTTPS. You can choose gallery photos here.';

    }
  }
  async function waitForShot(seconds,token){
    let time=seconds*1000;
    let last=performance.now();
    while(time>0 && token===generation){
      el('count').textContent=paused?'Paused':String(Math.ceil(time/1000));
      await new Promise(resolve=>setTimeout(resolve,80));
      const now=performance.now();
      if(!paused)time-=now-last;
      last=now;
      if(skip){skip=false;break;}
    }
    el('count').textContent='';
    return token===generation;
  }
  function releaseAudio(){
    if(audio && !playing){
      audio.close().catch(()=>{});
      audio=null;
    }
  }
  async function prepareSound(){
    if(!el('sound').checked)return;
    try{
      const Context=window.AudioContext || window.webkitAudioContext;
      const context=audio || (audio=new Context());
      await context.resume();
      if(!shutterBuffer){
        const response=await fetch('/memory-studio/shutter.ogg');
        if(response.ok)shutterBuffer=await context.decodeAudioData(await response.arrayBuffer());
      }
    }catch{/* Audio availability must never interrupt a photograph. */}
  }
  function clickSound(){
    if(!audio || !shutterBuffer || !el('sound').checked)return;
    const sound=audio.createBufferSource();
    sound.buffer=shutterBuffer;
    sound.connect(audio.destination);
    sound.start();
    playing++;
    sound.onended=()=>{
      playing--;
      if(!stream)releaseAudio();
    };
  }
  async function waitForManualShot(token){
    el('pause').hidden=true;
    el('skip-shot').textContent='Take next photo';
    status.textContent='Ready for photo '+(shot+1)+' of '+total+'. Take it when you are ready.';
    el('skip-shot').focus();
    const advance=await new Promise(resolve=>{
      manualAdvance=resolve;
    });
    manualAdvance=null;
    return advance && token===generation;
  }
  async function capture(){
    if(!stream || el('shutter').disabled)return;
    const token=generation;
    const focusSequence=document.activeElement===el('shutter');
    el('shutter').disabled=true;
    el('skip-shot').textContent='Take next now';
    await prepareSound();
    if(token!==generation)return;
    el('shutter').disabled=true;el('switch').disabled=true;
    paused=false;skip=false;el('pause').textContent='Pause';sequenceControls(true);
    if(focusSequence && [document.body,el('shutter')].includes(document.activeElement))el('pause').focus();
    try{
      for(shot=0;shot<total;shot++){
        status.textContent='Photo '+(shot+1)+' of '+total;
        const delay=el(shot?'interval':'timer').value;
        if(delay==='manual'){
          if(!await waitForManualShot(token))return;
        }else{
          el('pause').hidden=false;
          el('skip-shot').textContent='Take next now';
          if(!await waitForShot(Number(delay),token))return;
        }
        if(!video.videoWidth || video.readyState<2)throw Error();
        const photo=document.createElement('canvas');photo.width=video.videoWidth;photo.height=video.videoHeight;
        photo.getContext('2d').drawImage(video,0,0);
        onPhoto(photo); // Retain the original before animating or scheduling the next exposure.
        clickSound();
        if(el('flash').checked){video.parentElement.classList.remove('flash');void video.offsetWidth;video.parentElement.classList.add('flash');}
      }
      close();status.textContent='Your photographs are ready. Select a print to retake it, or continue to edit.';
    }catch{close();status.textContent='Capture interrupted. Your completed photographs are safe in the roll.';}
  }
  el('switch').onclick=()=>{facing=facing==='user'?'environment':'user';start();};
  el('shutter').onclick=capture;
  el('pause').onclick=()=>{paused=!paused;el('pause').textContent=paused?'Resume':'Pause';};
  el('skip-shot').onclick=()=>{if(manualAdvance){manualAdvance(true);return;}paused=false;skip=true;el('pause').textContent='Pause';};
  el('cancel-shot').onclick=()=>{close();status.textContent='Session cancelled. Completed shots are in your roll.';};
  window.addEventListener('pagehide',close);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  return {open(count){total=count;shot=0;start();},close};
};
