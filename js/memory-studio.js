window.initStudio = function($, navigate) {
  const P=window.StudioPrint;
  let activePage='home',savedSignature='',exportedSignature='';
  const defaults={positions:4,spacing:3,corners:'Square',captionPlace:'Bottom',datePlace:'Centre',printShape:'Freeform',...StudioLayouts.style(Object.keys(StudioLayouts.themes)[0]),mode:'polaroid',photos:[],index:0,ratio:1,direction:'Vertical',frame:'Classic White',paper:'#fffaf0',border:5,caption:'',date:'',message:'',compare:false,art:[]};
  const state={...defaults,photos:[],art:[]};
  let markIndex=0,replaceIndex=null,busy=false,pending=0,statusTimer;
  const titles={polaroid:'Create a Polaroid',strip:'Make a photobooth strip',collage:'Create a memory collage',photo:'Edit a photograph'};
  const current=()=>state.photos[state.index];
  const option=name=>new Option(name,name);
  function notify(message){clearTimeout(statusTimer);$('status').textContent=message;statusTimer=setTimeout(()=>$('status').textContent='',6500);}
  const sample=P.canvas(96,72);
  P.landscape(sample);
  let revealRequested=false, endReveal=null;
  function revealPrint(){
    const dialog=$('print-reveal'), paper=$('final-proof'), mat=paper.parentElement;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    if(motion.matches || !dialog.showModal || !current() ||
      (['strip','collage'].includes(state.mode) && state.photos.length<state.positions))return;
    let timer,clickTimer,audio;
    function finish(){
      clearTimeout(timer);clearTimeout(clickTimer);
      motion.removeEventListener('change',finish);
      if(audio)audio.close().catch(()=>{});
      mat.append(paper);
      if(dialog.open)dialog.close();
      dialog.oncancel=null;$('skip-reveal').onclick=null;endReveal=null;
      if(activePage==='preview')$('download').focus({preventScroll:true});
    }
    endReveal=finish;
    try{
      $('paper-feed').append(paper);dialog.showModal();
      $('skip-reveal').onclick=finish;dialog.oncancel=e=>{e.preventDefault();finish();};
      motion.addEventListener('change',finish);
      timer=setTimeout(finish,5150);
      if(($('sound')?.checked??true) && window.AudioContext){
        audio=new AudioContext();clickTimer=setTimeout(()=>{
          if(audio.state!=='running')return;
          const motor=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;
          motor.type='triangle';motor.frequency.setValueAtTime(185,t);motor.frequency.exponentialRampToValueAtTime(70,t+.22);
          gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.22);
          motor.connect(gain).connect(audio.destination);motor.start(t);motor.stop(t+.23);
        },820);
      }
    }catch{finish();}
  }
  function proof(){
    remember();
    cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{
      const proofs={preview:'final-proof',editor:'proof',photobooth:'photobooth-proof',collage:'collage-proof'};
      if(activePage==='camera')$('camera-strip').hidden=state.mode!=='strip';
      if(activePage==='camera' && state.mode==='strip')proofs.camera='camera-strip';
      if(activePage==='photobooth'||activePage==='collage'){
        $(activePage+'-summary').textContent=state.positions+' photo positions'+(activePage==='photobooth'?' · '+state.direction:'')+' · '+state.theme.split(' · ').pop();
      }
      if(proofs[activePage]) P.render($(proofs[activePage]),state,680).then(()=>{
        if(activePage==='preview' && revealRequested){revealRequested=false;revealPrint();}
      }).catch(()=>notify('Preview could not be drawn. Try a smaller photograph.'));
      if(activePage==='preview'){
        $('download').disabled=busy || !current() || (['strip','collage'].includes(state.mode)&&state.photos.length<state.positions) || state.compare;
        $('preview-title').textContent=current()?'Your memory is ready.':'Make your first print';
        $('preview-status').textContent=!current()?'Choose photos at the editing desk to start your print.':(['strip','collage'].includes(state.mode)&&state.photos.length<state.positions?'This layout needs '+state.positions+' photos. Add photos or change the number of positions.':'');
      }
      if(activePage==='editor')$('proof-label').textContent=state.mode==='strip'?Math.min(state.positions,state.photos.length)+' of '+state.positions+' strip positions':'Print preview';
    });
  }
  const filmButtons=new Map();
  function thumbnail(target,img){
    P.crop(target.getContext('2d'),img,0,0,target.width,target.height,{zoom:1,x:.5,y:.5});
  }
  function sync(){
    if(activePage==='editor'){
      syncEditorPapers();
      for(const key of ['mode','ratio','direction','paper','frame','background','border','caption','date','message','spacing','corners','captionPlace','datePlace','positions','theme','printShape'])$(key).value=state[key];
      $('compare').checked=state.compare;
      const item=current();$('roll').replaceChildren();
      state.photos.forEach((p,i)=>{
        const b=document.createElement('button'),c=P.canvas(64,48);
        thumbnail(c,p.preview);b.append(c,document.createTextNode(String(i+1)));b.setAttribute('aria-label','Edit photograph '+(i+1));
        b.setAttribute('aria-pressed',String(i===state.index));b.onclick=()=>{state.index=i;sync();$('roll').children[i].focus();};$('roll').append(b);
      });
      for(const [name,b] of filmButtons){
        const c=b.firstChild;thumbnail(c,item?.preview||sample);P.grade(c,name,1);
        b.disabled=!item;b.setAttribute('aria-pressed',String(name===item?.film));
      }
      $('photo-actions').hidden=!item;$('earlier').disabled=state.index===0;$('later').disabled=state.index===state.photos.length-1;
      for(const [id,value] of Object.entries({zoom:item?.zoom||1,'pan-x':(item?.x??.5)*100,'pan-y':(item?.y??.5)*100,strength:(item?.strength??.8)*100})){
        $(id).value=value;$(id).disabled=!item;
      }
      $('direction-label').hidden=state.mode!=='strip';$('frame-panel').hidden=state.mode==='photo';
      $('files').disabled=busy || state.photos.length>=6;$('camera').disabled=busy || state.photos.length>=6;
    }
    for(const page of ['photobooth','collage']){
      for(const button of ($(page+'-papers')?.children||[])){
        button.setAttribute('aria-pressed',String(button.dataset.theme===state.theme));
      }
    }
    if(activePage==='preview'){
      $('size').querySelector('[value="print"]').disabled=state.mode!=='strip';
      if(state.mode!=='strip' && $('size').value==='print')$('size').value='1800';

    }
    if(activePage==='camera'){
      $('booth-files').disabled=busy || (state.photos.length>=6 && replaceIndex===null);
      $('roll-count').textContent=state.photos.length+' of 6 photos in your roll';
    }
    proof();
  }
  function setMode(mode){
    if(Object.hasOwn(titles,mode))state.mode=mode;
    sync();
  }
  function add(source,file,slot=replaceIndex){
    const preview=P.canvas(source.width*Math.min(1,720/Math.max(source.width,source.height)),source.height*Math.min(1,720/Math.max(source.width,source.height)));
    preview.getContext('2d').drawImage(source,0,0,preview.width,preview.height);
    const photo={id:crypto.randomUUID(),source:file?preview:source,preview,file,zoom:1,x:.5,y:.5,film:state.film||'Original',strength:.8};
    if(slot!==null){state.photos[slot]=photo;state.index=slot;replaceIndex=null;}
    else if(state.photos.length<6){state.photos.push(photo);state.index=state.photos.length-1;}
    sync();
  }
  function showShots(){
    const roll=$('developing-roll');if(!roll)return;
    const old=new Map(Array.from(roll.children,b=>[b.dataset.id,b]));
    roll.replaceChildren(...state.photos.map((item,i)=>{
      let button=old.get(item.id);
      if(!button){
        button=document.createElement('button');button.className='instant-print fresh';button.addEventListener('animationend',e=>{if(e.animationName==='develop-print')button.classList.remove('fresh');});button.dataset.id=item.id;
        const picture=P.canvas(180,160);thumbnail(picture,item.preview);
        const label=document.createElement('span');button.append(picture,label);
      }
      button.lastChild.textContent='Retake photo '+(i+1);
      button.onclick=()=>{camera?.close();replaceIndex=i;enableCamera();};
      return button;
    }));
    $('moment-caption').textContent=state.photos.length===4?'Four moments. One little memory.':'';
  }
  function enableCamera(){
    if(busy)return;
    if(state.photos.length>=6 && replaceIndex===null){notify('Your roll is full. Remove a photo at the editing desk first.');return;}
    if(replaceIndex===null && state.mode==='strip' && state.photos.length>=state.positions){notify('Your strip is complete. Select a photo to retake it, or continue to edit.');return;}
    const count=replaceIndex!==null?1:state.mode==='strip'?Math.max(1,state.positions-state.photos.length):Number($('capture-mode').value);
    if(replaceIndex===null && state.photos.length+count>6){notify('Start again or remove photos to make space for this sequence.');return;}
    camera.open(count);
  }
  // Read dimensions from the container before asking the browser to decode pixels.
  async function dimensions(file){
    if(file.size>24*1024*1024)throw Error('Choose photos smaller than 24 MB each.');
    const b=new DataView(await file.slice(0,1024*1024).arrayBuffer()),u=i=>b.getUint8(i);
    if(b.byteLength<30)throw Error('This image is incomplete.');
    if(b.getUint32(0)===0x89504e47 && b.getUint32(4)===0x0d0a1a0a)return [b.getUint32(16),b.getUint32(20)];
    if(b.getUint32(0)===0x52494646&&b.getUint32(8)===0x57454250){
      const kind=b.getUint32(12);
      if(kind===0x56503858)return [1+u(24)+(u(25)<<8)+(u(26)<<16),1+u(27)+(u(28)<<8)+(u(29)<<16)];
      if(kind===0x56503820)return [b.getUint16(26,true)&16383,b.getUint16(28,true)&16383];
      if(kind===0x5650384c){const bits=b.getUint32(21,true);return [1+(bits&16383),1+((bits>>>14)&16383)];}
    }
    if(b.getUint16(0)===0xffd8){
      let i=2;
      while(i+9<b.byteLength&&u(i)===255){
        while(i+1<b.byteLength&&u(i)===255)i++;
        const marker=u(i++);if(marker===0xda||i+7>b.byteLength)break;
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [b.getUint16(i+5),b.getUint16(i+3)];
        const length=b.getUint16(i);if(length<2)break;i+=length;
      }
    }
    throw Error('Choose a readable JPEG, PNG or WebP photograph.');
  }
  async function validatePhoto(file){
    if(!(file instanceof Blob))throw Error('Photo data is missing.');
    const [w,h]=await dimensions(file);
    if(!w||!h||w*h>40000000||Math.max(w,h)>14000)throw Error('Resize this photo to 40 megapixels or less, with each side under 14,001 pixels.');
  }
  async function importFiles(files){
    if(!files.length||busy)return;
    camera?.close();const origin=activePage;let slot=replaceIndex;
    busy=true;if($('desk'))$('desk').inert=true;notify('Preparing your photos…');let added=0,problem='';
    try{
      for(const file of files){
        if(state.photos.length===6&&slot===null){problem='The roll holds six photos.';break;}
        try{
          await validatePhoto(file);
          const image=new Image(),url=URL.createObjectURL(file);
          try{image.src=url;await image.decode();add(image,file,slot);slot=null;added++;}
          finally{image.removeAttribute('src');URL.revokeObjectURL(url);}
        }catch(err){problem=err.message||'Could not read a photograph.';}
      }
    }finally{busy=false;replaceIndex=null;if($('desk'))$('desk').inert=false;if(added && origin==='camera' && activePage===origin)await navigate('/memory-studio/editor/');sync();notify([added?added+' photo(s) added.':'',problem].filter(Boolean).join(' '));}
  };
  function move(step){
    const next=state.index+step;if(next<0||next>=state.photos.length)return;
    [state.photos[next],state.photos[state.index]]=[current(),state.photos[next]];state.index=next;sync();
  }
  const artFields={'art-x':'x','art-y':'y','art-size':'size','art-angle':'angle'};
  function artwork(){
    if(!$('art-controls'))return;
    const d=state.art[markIndex];$('art-controls').hidden=!d;$('art-index').replaceChildren();
    state.art.forEach((a,i)=>$('art-index').add(new Option((i+1)+' · '+a.type,i)));
    if(d){$('art-index').value=markIndex;for(const [id,key] of Object.entries(artFields))$(id).value=d[key];}
    proof();
  }
  let drag=null,camera=null;
  function placeDecoration(x,y){
    const decoration=state.art[markIndex];
    decoration.x=Math.max(0,Math.min(100,x));
    decoration.y=Math.max(0,Math.min(100,y));
    $('art-x').value=decoration.x;
    $('art-y').value=decoration.y;
    proof();
  }
  function finishDrag(){
    if(drag){drag=null;remember();}
  }
  const past=[],future=[];
  let previous=null,restoring=false;
  function snapshot(){
    const {photos,compare,index,...settings}=state;
    return {...settings,index,art:state.art.map(a=>({...a})),photos:photos.map(({cachedTile,cachedKey,...photo})=>({...photo}))};
  }
  function signature(s){
    return JSON.stringify(s,(key,value)=>['source','preview','file','index'].includes(key)?undefined:value);
  }
  function remember(){
    if(restoring || drag)return;
    const next=snapshot();
    if(previous && signature(previous)!==signature(next)){
      past.push(previous);if(past.length>20)past.shift();
      while(past.length>1 && new Set(past.flatMap(entry=>entry.photos.map(p=>p.source))).size>12)past.shift();future.length=0;
    }
    previous=next;if(!$('undo'))return;
    $('undo').disabled=!past.length;$('redo').disabled=!future.length;
  }
  function restore(s){
    restoring=true;Object.assign(state,s,{compare:false,photos:s.photos.map(p=>({...p})),art:s.art.map(a=>({...a}))});
    markIndex=0;state.index=Math.min(state.index,Math.max(0,state.photos.length-1));sync();artwork();restoring=false;previous=snapshot();remember();
  }
  function applyStyle(settings){
    Object.assign(state,settings,{art:settings.art.map(a=>({...a}))});for(const p of state.photos)p.film=settings.film;
    sync();artwork();
  }
  window.addEventListener('beforeunload',event=>{if(state.photos.length && ![savedSignature,exportedSignature].includes(signature(snapshot()))){event.preventDefault();event.returnValue='';}});
  const papers=Object.entries(StudioLayouts.editions);
  const collections=[...new Set(papers.map(([,paper])=>paper.collection))];
  function applyEditorPaper(name){
    const {theme,background,font,frame,paper,border,spacing}=StudioLayouts.style(name);
    Object.assign(state,{theme,background,font,frame,paper,border,spacing});
    sync();
  }
  function syncEditorPapers(){
    $('editor-papers').hidden=state.mode!=='polaroid';
    const selected=StudioLayouts.editions[state.theme];
    Array.from($('editor-collections').children).forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(collections[i]===selected?.collection));
    });
    Array.from($('editor-designs').children).forEach((button,i)=>{
      const [name,entry]=papers[i];
      button.hidden=entry.collection!==selected?.collection;
      button.setAttribute('aria-pressed',String(name===state.theme));
    });
  }
  let collectionIndex=collections.indexOf('Bows'), designIndex=0, samplePhoto;
  function selectedPaper(){return papers.filter(([,paper])=>paper.collection===collections[collectionIndex])[designIndex];}
  function showPaperImpressions(folder){
    const layer=$('paper-impressions');
    if(layer.dataset.collection===folder)return;
    let group=Array.from(layer.children).find(node=>node.dataset.folder===folder);
    if(!group){
      group=document.createElement('div');
      group.dataset.folder=folder;
      for(const index of [0,2,1,3,0]){
        const motif=new Image();
        motif.alt='';
        motif.src='/assets/studio-collections/'+folder+'/'+index+'.webp';
        group.append(motif);
      }
      layer.append(group);
    }
    layer.dataset.collection=folder;
    layer.parentElement.dataset.collection=folder;
    for(const child of layer.children)child.classList.toggle('visible',child===group);
  }
  async function displayPaper(){
    const [name,paper]=selectedPaper();
    showPaperImpressions(paper.folder);
    $('archive-select').value=collectionIndex;
    Array.from($('archive-list').children).forEach((button,i)=>button.setAttribute('aria-pressed',String(i===collectionIndex)));
    Array.from($('archive-designs').children).forEach((button,i)=>{
      button.textContent=papers.find(([,entry])=>entry.collection===paper.collection && entry.variant===i)[1].design;
      button.setAttribute('aria-pressed',String(i===designIndex));
    });
    try{
      if(!samplePhoto){
        const image=new Image();image.src='/memory-studio/train-afternoon.webp';
        samplePhoto=image.decode().then(()=>({source:image,preview:image,zoom:1,x:.5,y:.5,film:'Original',strength:0}));
      }
      const photo=await samplePhoto;
      if(selectedPaper()[0]!==name)return;
      await P.render($('archive-proof'),{...StudioLayouts.example('polaroid',[photo]),...StudioLayouts.style(name),caption:'The long way home'},760);
    }catch{samplePhoto=null;notify('The paper preview could not load. Please try again.');}
  }
  function chooseCollection(index){
    collectionIndex=(index+collections.length)%collections.length;designIndex=0;displayPaper();
  }
  function usePaper(){state.mode='polaroid';applyStyle(StudioLayouts.style(selectedPaper()[0]));}
  let formatPreviews;
  async function buildFormatPreviews(){
    const layer=$('format-floaters');
    const cards=Array.from(layer.parentElement.querySelectorAll('nav a'));
    const photos=await StudioLayouts.samples;
    await Promise.all(cards.map(card=>{
      const canvas=card.querySelector('canvas');
      const example=StudioLayouts.example(canvas.dataset.sample,photos);
      if(canvas.dataset.positions)example.positions=Number(canvas.dataset.positions);
      return P.render(canvas,example,360);
    }));
    const positions=[[4,15],[29,10],[64,9],[92,19],[7,76],[32,90],[69,87],[95,72],
      [16,48],[44,19],[55,93],[84,49],[2,46],[98,39]];
    positions.forEach(([x,y],i)=>{
      const source=cards[i%cards.length].querySelector('canvas');
      const tile=P.canvas(source.width,source.height);
      tile.getContext('2d').drawImage(source,0,0);
      const angle=Math.atan2(y-50,x-50);
      const style=tile.style;
      style.left=x+'%';style.top=y+'%';
      style.setProperty('--angle',(Math.random()*30-15)+'deg');
      style.setProperty('--duration',(7+Math.random()*6)+'s');
      style.setProperty('--delay',(-1-Math.random()*12)+'s');
      style.setProperty('--opacity',.4+Math.random()*.15);
      style.setProperty('--dx',70*Math.cos(angle)+'px');
      style.setProperty('--dy',70*Math.sin(angle)+'px');
      layer.append(tile);
    });
    let hovered=null,focused=null;
    function highlight(){
      const index=cards.indexOf(focused||hovered);
      layer.classList.toggle('highlight',index>=0);
      Array.from(layer.children).forEach((tile,i)=>tile.classList.toggle('matching',i%cards.length===index));
    }
    cards.forEach(card=>{
      card.onpointerenter=e=>{if(e.pointerType==='mouse'){hovered=card;highlight();}};
      card.onpointerleave=()=>{hovered=null;highlight();};
      card.onfocus=()=>{focused=card;highlight();};
      card.onblur=()=>{focused=null;highlight();};
    });
  }
  function bindFiles(id){
    $(id).onchange=e=>{const files=Array.from(e.target.files);e.target.value='';if(busy)return;if(id!=='booth-files')replaceIndex=id==='replacement'?state.index:null;importFiles(replaceIndex===null?files:files.slice(0,1));};
  }
  function mountEditor(){
    Object.keys(P.frames).forEach(name=>$('frame').add(option(name)));
    P.marks.forEach(name=>$('art').add(option(name)));
    for(const name of Object.keys(P.films)){
      const b=document.createElement('button'),c=P.canvas(72,50);b.append(c,document.createTextNode(name));
      b.onclick=()=>{if(current()){current().film=name;state.compare=false;$('compare').checked=false;sync();}};
      $('filters').append(b);filmButtons.set(name,b);
    }
    $('mode').onchange=e=>setMode(e.target.value);
    $('camera').onclick=()=>navigate('/memory-studio/camera/');
    $('replace').onclick=()=>navigate('/memory-studio/camera/',{replacePhoto:state.index});
    $('desk').ondragover=e=>e.preventDefault();
    $('desk').ondrop=e=>{e.preventDefault();importFiles(Array.from(e.dataTransfer.files));};
    $('earlier').onclick=()=>move(-1);$('later').onclick=()=>move(1);
    $('remove').onclick=()=>{state.photos.splice(state.index,1);state.index=Math.max(0,Math.min(state.index,state.photos.length-1));sync();};
    for(const [id,key,divisor] of [['zoom','zoom',1],['pan-x','x',100],['pan-y','y',100],['strength','strength',100]]){
      $(id).oninput=e=>{if(current()){current()[key]=Number(e.target.value)/divisor;proof();}};
    }
    $('compare').onchange=e=>{state.compare=e.target.checked;proof();};
    for(const key of ['ratio','direction','paper','border','caption','date','message','background','spacing','corners','captionPlace','datePlace','positions','printShape']){
      $(key).oninput=e=>{state[key]=['ratio','border','spacing','positions'].includes(key)?Number(e.target.value):e.target.value;proof();};
    }
    $('frame').onchange=e=>{state.frame=e.target.value;state.paper=P.frames[state.frame][0];$('paper').value=state.paper;proof();};
    $('add-art').onclick=()=>{if(state.art.length>=16){notify('Remove a decoration before adding another.');return;}
      state.art.push({type:$('art').value,x:75,y:80,size:14,angle:-8});markIndex=state.art.length-1;artwork();$('proof').focus();};
    $('remove-art').onclick=()=>{state.art.splice(markIndex,1);markIndex=Math.max(0,markIndex-1);artwork();};
    $('art-index').onchange=e=>{markIndex=Number(e.target.value);artwork();};
    for(const [id,key] of Object.entries(artFields))$(id).oninput=e=>{state.art[markIndex][key]=Number(e.target.value);proof();};
    const print=$('proof');
    print.onpointerdown=e=>{
      if(e.button!==0 || drag)return;
      const rect=print.getBoundingClientRect();
      const x=(e.clientX-rect.left)/rect.width*100;
      const y=(e.clientY-rect.top)/rect.height*100;
      const hit=state.art.findLastIndex(d=>{
        const dx=(x-d.x)*rect.width/100, dy=(y-d.y)*rect.height/100;
        const radius=Math.max(9,Math.min(rect.width,rect.height)*d.size/200);
        const angle=d.angle*Math.PI/180;
        return Math.abs(dx*Math.cos(angle)+dy*Math.sin(angle))<=radius &&
          Math.abs(dy*Math.cos(angle)-dx*Math.sin(angle))<=radius;
      });
      if(hit<0)return;
      markIndex=hit;artwork();print.focus({preventScroll:true});
      drag={id:e.pointerId,dx:state.art[hit].x-x,dy:state.art[hit].y-y};
      print.setPointerCapture(e.pointerId);
    };
    print.onpointermove=e=>{
      if(!drag || drag.id!==e.pointerId)return;
      const rect=print.getBoundingClientRect();
      placeDecoration((e.clientX-rect.left)/rect.width*100+drag.dx,
        (e.clientY-rect.top)/rect.height*100+drag.dy);
    };
    print.onlostpointercapture=finishDrag;
    print.onkeydown=e=>{
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      const decoration=state.art[markIndex];
      if(!delta || !decoration)return;
      e.preventDefault();
      const step=e.shiftKey?5:1;
      placeDecoration(decoration.x+delta[0]*step,decoration.y+delta[1]*step);
    };
    $('undo').onclick=()=>{if(past.length){future.push(snapshot());restore(past.pop());}};
    $('redo').onclick=()=>{if(future.length){past.push(snapshot());restore(future.pop());}};
    $('apply-all').onclick=()=>{if(current()){for(const photo of state.photos){photo.film=current().film;photo.strength=current().strength;}sync();}};
    $('reset-edits').onclick=()=>{if(!confirm('Reset filters, crops, artwork and layout settings?'))return;
      const previousReset=snapshot();const photos=state.photos.map(photo=>({...photo,film:'Original',strength:.8,x:.5,y:.5,zoom:1}));past.push(previousReset);future.length=0;restore({...defaults,photos});};
    for(const name of Object.keys(StudioLayouts.themes))$('theme').add(option(name));
    $('theme').onchange=e=>applyStyle(StudioLayouts.style(e.target.value));
    $('save-draft').onclick=async()=>{
      try{
        const draft=snapshot();draft.photos=await Promise.all(draft.photos.map(async({source,preview,file,...edit})=>{
          const original=file||await new Promise(resolve=>source.toBlob(resolve,'image/png'));
          if(!original)throw Error();return {...edit,file:original};
        }));
        await studioDraft('save',draft);savedSignature=signature(draft);notify('Draft saved on this device.');
      }catch{notify('Could not save this draft on your device. Download your print instead.');}
    };
    $('load-draft').onclick=async()=>{
      if(state.photos.length&&!confirm('Open your saved draft in place of this roll?'))return;
      try{
        const draft=await studioDraft('load');if(!draft){notify('There is no saved draft on this device.');return;}
        if(!Array.isArray(draft.photos)||draft.photos.length>6 || !Array.isArray(draft.art)||draft.art.length>16)throw Error('Invalid draft');
        for(const item of draft.photos)await validatePhoto(item.file);
        for(const item of draft.photos){
          const url=URL.createObjectURL(item.file),img=new Image();
          try{img.src=url;await img.decode();const size=Math.min(1,720/Math.max(img.width,img.height));
            item.preview=P.canvas(img.width*size,img.height*size);item.preview.getContext('2d').drawImage(img,0,0,item.preview.width,item.preview.height);item.source=item.preview;
          }finally{URL.revokeObjectURL(url);}
        }
        past.length=future.length=0;restore(draft);savedSignature=signature(snapshot());notify('Saved draft opened.');
      }catch{notify('Could not open the saved draft.');}
    };
    $('clear-session').onclick=async()=>{
      if(!confirm('Clear this roll and delete the saved draft on this device?'))return;
      camera?.close();past.length=future.length=0;restore({...defaults,photos:[],art:[]});showShots();
      try{await studioDraft('clear');savedSignature=exportedSignature='';notify('Studio and saved draft cleared.');}catch{notify('Roll cleared. Browser storage could not be cleared.');}
    };
    const editorCollections=$('editor-collections'),editorDesigns=$('editor-designs');
    for(const collection of collections){
      const [name,entry]=papers.find(([,paper])=>paper.collection===collection);
      const button=document.createElement('button'),icon=new Image();
      icon.src='/assets/studio-collections/'+entry.folder+'/0.webp';icon.alt='';
      button.append(icon,document.createTextNode(collection));
      button.onclick=()=>applyEditorPaper(name);
      editorCollections.append(button);
    }
    for(const [name,entry] of papers){
      const button=document.createElement('button');
      button.textContent=entry.design;
      button.onclick=()=>applyEditorPaper(name);
      editorDesigns.append(button);
    }
  }
  function mountHome(){
    collections.forEach((name,i)=>{
      const button=document.createElement('button'),img=new Image();
      const entry=papers.find(([,paper])=>paper.collection===name)[1];
      img.src='/assets/studio-collections/'+entry.folder+'/0.webp';img.alt='';
      button.append(img,document.createTextNode(name));button.onclick=()=>chooseCollection(i);
      $('archive-list').append(button);$('archive-select').add(new Option(name+' · '+(i+1)+' of 7',i));
    });
    for(let i=0;i<2;i++){
      const button=document.createElement('button');button.onclick=()=>{designIndex=i;displayPaper();};$('archive-designs').append(button);
    }
    $('archive-list').onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();chooseCollection(collectionIndex+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1));
      $('archive-list').children[collectionIndex].focus();
    };
    $('archive-select').onchange=e=>chooseCollection(Number(e.target.value));
    $('archive-prev').onclick=()=>chooseCollection(collectionIndex-1);
    $('archive-next').onclick=()=>chooseCollection(collectionIndex+1);
    let startTouch=null;
    $('archive-proof').onpointerdown=e=>{startTouch=[e.clientX,e.clientY];};
    $('archive-proof').onpointercancel=()=>{startTouch=null;};
    $('archive-proof').onpointerup=e=>{
      if(!startTouch)return;
      const dx=e.clientX-startTouch[0],dy=e.clientY-startTouch[1];startTouch=null;
      if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.5)chooseCollection(collectionIndex+(dx<0?1:-1));
    };
    $('archive-camera').onclick=async()=>{usePaper();await navigate('/memory-studio/camera/?mode=polaroid');if(activePage==='camera')enableCamera();};
    $('archive-upload').onclick=$('archive-choose').onclick=()=>$('archive-file').click();
    $('archive-file').onchange=async e=>{
      const files=Array.from(e.target.files);e.target.value='';if(!files.length)return;
      usePaper();await navigate('/memory-studio/editor/?mode=polaroid');if(activePage==='editor')await importFiles(files);
    };
  }
  function mountCamera(){
    camera=createStudioCamera(source=>{add(source,null);showShots();}, $);
    $('restart').onclick=()=>{if(state.photos.length&&!confirm('Start a new camera roll and clear these photos?'))return;
      camera?.close();state.photos=[];state.index=0;replaceIndex=null;sync();showShots();};
    $('capture-mode').onchange=()=>{state.mode=$('capture-mode').value==='4'?'collage':'polaroid';state.positions=Number($('capture-mode').value);sync();};
    $('enable-camera').onclick=enableCamera;
  }
  function mountPreview(){
    $('size').onchange=()=>{if($('size').value==='print')state.printShape='2 × 6 inches';proof();};
    $('download').onclick=async()=>{
      if(busy||state.compare||!current()||(['strip','collage'].includes(state.mode)&&state.photos.length<state.positions))return;
      busy=true;if($('desk'))$('desk').inert=true;notify('Preparing your download…');
      const print=snapshot();
      try{await P.download(print,$('size').value==='print'?1800:Number($('size').value),$('format').value);exportedSignature=signature(print);notify('Your print is ready. Download started.');}
      catch{notify('Could not export this print. Try a smaller size.');}
      finally{busy=false;if($('desk'))$('desk').inert=false;sync();}
    };
  }
  function mountLayouts(page){
    const mode=page==='photobooth'?'strip':'collage';
    StudioLayouts.samples.then(photos=>{

      const list=$(page+'-layouts');
      const gallery=$(page+'-papers');
      for(const [name,edition] of Object.entries(StudioLayouts.editions)){
        const button=document.createElement('button'), image=new Image();
        image.loading='lazy';image.alt='';image.width=160;image.height=160;
        image.src='/assets/studio-collections/'+edition.folder+'/preview-'+edition.variant+'.webp';
        button.dataset.theme=name;
        button.setAttribute('aria-pressed',String(state.theme===name));
        button.append(image,document.createTextNode(name));
        button.onclick=()=>applyStyle(StudioLayouts.style(name));
        gallery.append(button);
      }
      for(const layout of StudioLayouts.presets(mode)){
        const button=document.createElement('button'),c=P.canvas(1,1);
        const sampleState={...StudioLayouts.example(mode,photos),...layout,photos:photos.map(p=>({...p,film:layout.film}))};
        P.render(c,sampleState,210);button.append(c,document.createTextNode(layout.name));
        button.onclick=()=>{applyStyle(layout);for(const b of list.children)b.setAttribute('aria-pressed',String(b===button));};
        list.append(button);
      }
    });
  }
  const mounted=new Set();
  function mount(page){
    if(mounted.has(page))return;
    switch(page){
      case 'home': mountHome();break;
      case 'editor': mountEditor();artwork();bindFiles('files');bindFiles('replacement');break;
      case 'camera': mountCamera();bindFiles('booth-files');break;
      case 'preview': mountPreview();break;
      default: mountLayouts(page);bindFiles(page+'-files');
    }
    mounted.add(page);
  }
  return {
    leave(){finishDrag();revealRequested=false;endReveal?.();camera?.close();replaceIndex=null;},
    show(page,url,options={}){
      mount(page);activePage=page;revealRequested=page==='preview' && options.reveal===true;
      if(page==='preview'){state.compare=false;}
      if(page==='camera'){
        replaceIndex=options.replacePhoto??null;
        $('camera-status').textContent='Enable the camera or choose photos from your device.';
      }
      if(page==='photobooth'){
        state.mode='strip';
        const count=url.searchParams.get('positions');
        if(count==='3' || count==='4')state.positions=Number(count);
      }
      if(page==='collage')state.mode='collage';
      if(page==='camera'){
        const select=$('capture-mode');select.replaceChildren();
        if(url.searchParams.get('mode')==='polaroid')state.mode='polaroid';
        const counts=state.mode==='strip'?[state.positions]:[1,4];
        for(const n of counts)select.add(new Option(n+' photograph'+(n===1?'':'s'),n));
        select.value=state.mode==='strip'?state.positions:state.mode==='collage'&&state.positions===4?4:1;
        showShots();
      }
      setMode(url.searchParams.get('mode'));
      if(page==='home')displayPaper();
      if(page==='home')formatPreviews??=buildFormatPreviews().catch(()=>{
        formatPreviews=null;
        notify('Format previews could not load. You can still choose a format.');
      });

    }
  };
};
