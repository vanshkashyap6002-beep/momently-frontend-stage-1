/* Every grade and mark below is drawn locally for Memory Studio. */
window.StudioPrint = (() => {
  const films = {
    Original: [1,1,0,0,0,0], 'Golden Hour': [.94,.98,15,6,-8,0],
    'Old Soul': [1.14,0,2,1,-1,12], 'Memory Fade': [.72,.55,12,7,4,3],
    'Film Diary': [1.04,.83,-3,6,-3,5], Dreamscape: [.78,.77,14,5,12,0],
    'Just Us': [1.015,1.025,2,1,0,0]
  };
  const frames = {'Classic White':['#fffaf0',''], 'Vintage Paper':['#decba8','Date stamp'],
    Romantic:['#f0d7d4','Heart'], 'Family Memories':['#f0dcc0','Star'],
    Botanical:['#dde2cd','Flower'], 'Minimal Champagne':['#f3ebdd',''],
    'Playful Doodles':['#f4ddb9','Arrow']};
  const marks=['Kiss mark','Ribbon bow','Autumn leaf','Diwali firecracker','Snowflake','Heart','Star','Flower','Arrow','Little note','Date stamp','Vintage label','Washi tape','Decorative corner','Handwritten message'];
  function canvas(w,h) {
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h)); return c;
  }
  function grade(canvas,name,strength) {
    if (!strength || name==='Original') return;
    const ctx=canvas.getContext('2d'), img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const p=img.data,[contrast,saturation,red,green,blue,grain]=films[name];
    let seed=139;
    for(let i=0;i<p.length;i+=4){
      const luma=.299*p[i]+.587*p[i+1]+.114*p[i+2];
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const neutral=(luma-128)*contrast+128+(seed/4294967296-.5)*grain;
      p[i]+=strength*(neutral+(p[i]-luma)*saturation*contrast+red-p[i]);
      p[i+1]+=strength*(neutral+(p[i+1]-luma)*saturation*contrast+green-p[i+1]);
      p[i+2]+=strength*(neutral+(p[i+2]-luma)*saturation*contrast+blue-p[i+2]);
    }
    ctx.putImageData(img,0,0);
  }
  function crop(ctx,img,x,y,w,h,item) {
    const scale=Math.max(w/img.width,h/img.height)*item.zoom;
    const sw=w/scale,sh=h/scale;
    ctx.drawImage(img,(img.width-sw)*item.x,(img.height-sh)*item.y,sw,sh,x,y,w,h);
  }
  function landscape(c,coast=false){
    const g=c.getContext('2d'),w=c.width,h=c.height;
    g.save();g.scale(w/500,h/400);g.fillStyle=coast?'#c3bb99':'#e4c692';g.fillRect(0,0,500,400);
    g.fillStyle='#f7deaa';g.beginPath();g.arc(348,85,34,0,Math.PI*2);g.fill();
    const palette=coast?['#afa988','#838e79','#667d72','#435f59','#304a43']:['#c49a7b','#ad826d','#8e7968','#606d5e','#374f45'];
    palette.forEach((color,i)=>{
      g.beginPath();g.moveTo(0,400);
      for(let x=0;x<=500;x+=2){
        const y=145+i*45+Math.sin(x/(54+i*8)+i*2)*27+Math.sin(x/28+i)*8+(coast?x/18:0);
        g.lineTo(x,y);
      }
      g.lineTo(500,400);g.fillStyle=color;g.fill();
    });
    for(let i=0;i<30;i++){
      const x=(i*173)%500,y=353+Math.sin(x/55)*16,sz=16+(i*7)%35;
      g.fillStyle='#30473d';g.fillRect(x,y-sz,2,sz+12);
      for(let j=1;j<=3;j++){g.beginPath();g.moveTo(x+1,y-sz+(j-1)*sz/4);g.lineTo(x-j*2.9,y-sz+j*sz/3);g.lineTo(x+j*3,y-sz+j*sz/3);g.fill();}
    }
    g.restore(); grade(c,'Film Diary',.72);
  }
  function mark(ctx,type,x,y,size,angle,state){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.scale(size,size);
    ctx.lineWidth=.045;ctx.lineJoin='round';ctx.strokeStyle='#713e3c';ctx.fillStyle='#b36762';ctx.beginPath();
    switch(type){
      case 'Kiss mark':
        ctx.fillStyle='#ad344b';
        ctx.fill(new Path2D('M-.54 0 Q-.17 -.43 0 -.22 Q.22 -.41 .54 -.08 Q.22 .05 0 -.015 Q-.27 .09 -.54 0 M-.48 .07 Q-.02 .52 .47 .015 Q.16 .12 -.02 .07 Q-.25 .14 -.48 .07'));
        break;
      case 'Ribbon bow':
        ctx.fillStyle='#9e485c';
        ctx.fill(new Path2D('M0 0 Q-.66 -.65 -.53 -.06 Q-.5 .24 -.04 .05 L-.37 .49 L-.18 .43 L-.11 .53 L.02 .09 L.16 .47 L.22 .38 L.39 .41 L.05 .03 Q.63 .23 .52 -.23 Q.44 -.47 0 0'));
        ctx.fillStyle='#dda5a5';ctx.fillRect(-.055,-.07,.11,.14);break;
      case 'Autumn leaf':
        ctx.fillStyle='#b55427';
        ctx.fill(new Path2D('M0 .39 L-.42 .11 L-.27 .08 L-.49 -.19 L-.24 -.15 L-.27 -.39 L-.09 -.24 L.02 -.55 L.14 -.25 L.33 -.38 L.29 -.12 L.49 -.17 L.33 .05 L.43 .08 Z'));
        ctx.strokeStyle='#73341c';ctx.stroke(new Path2D('M-.04 .53 L.02 -.35 M0 .18 L-.29 -.07 M0 .07 L.24 -.12'));break;
      case 'Diwali firecracker':
        ctx.fillStyle='#ab3433';ctx.fillRect(-.19,-.13,.38,.65);
        ctx.fillStyle='#efbd55';for(const y of [-.07,.27])ctx.fillRect(-.19,y,.38,.075);
        ctx.strokeStyle='#9b601a';ctx.stroke(new Path2D('M0 -.13 Q-.08 -.36 .1 -.32'));
        ctx.strokeStyle='#d78e23';ctx.translate(.13,-.35);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(.07,0);ctx.lineTo(.18,0);ctx.stroke();}break;
      case 'Snowflake':
        ctx.strokeStyle='#57889b';ctx.lineCap='round';
        for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.stroke(new Path2D('M0 0 L0 -.49 M-.13 -.35 L0 -.24 L.13 -.35 M-.085 -.44 L0 -.36 L.085 -.44'));}break;
      case 'Heart':ctx.moveTo(0,.45);ctx.bezierCurveTo(-1,-.18,-.43,-.8,0,-.32);ctx.bezierCurveTo(.43,-.8,1,-.18,0,.45);ctx.fill();break;
      case 'Star':
        for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.21:.49;ctx.lineTo(r*Math.cos(a),r*Math.sin(a));}ctx.closePath();ctx.stroke();break;
      case 'Flower':
        ctx.strokeStyle='#526747';ctx.moveTo(0,0);ctx.quadraticCurveTo(.13,.28,-.13,.55);ctx.stroke();
        for(let i=0;i<5;i++){ctx.rotate(Math.PI*2/5);ctx.beginPath();ctx.ellipse(0,-.19,.12,.2,0,0,Math.PI*2);ctx.fill();}break;
      case 'Arrow':ctx.moveTo(-.5,.25);ctx.quadraticCurveTo(.1,.4,.45,-.28);ctx.lineTo(.15,-.19);ctx.moveTo(.45,-.28);ctx.lineTo(.48,.05);ctx.stroke();break;
      case 'Decorative corner':ctx.moveTo(-.4,.35);ctx.lineTo(-.4,-.35);ctx.lineTo(.4,-.35);ctx.stroke();break;
      case 'Washi tape':ctx.fillStyle='#c5a265bf';ctx.fillRect(-.5,-.16,1,.32);ctx.strokeStyle='#fff7df';for(let i=-.43;i<.4;i+=.18){ctx.moveTo(i,.12);ctx.lineTo(i+.14,-.12);}ctx.stroke();break;
      default:{
        const label={'Date stamp':state.date||'UNDATED','Little note':'a little note','Vintage label':'KEEPSAKE','Handwritten message':state.message||'with love'}[type];
        ctx.fillStyle='#f7ead1';ctx.fillRect(-.63,-.23,1.26,.46);ctx.strokeRect(-.60,-.20,1.2,.4);
        ctx.fillStyle='#563c35';ctx.textAlign='center';ctx.font='italic .18px Georgia';ctx.fillText(label,0,.055,1.1);break;
      }
    }
    ctx.restore();
  }
  const collectionImages=new Map();
  const latestRender=new WeakMap();
  function loadCollection(folder){
    if(!collectionImages.has(folder)){
      const loading=Promise.all([0,1,2,3].map(async index=>{
        const image=new Image();
        image.src='/assets/studio-collections/'+folder+'/'+index+'.webp';
        await image.decode();
        return image;
      })).catch(error=>{collectionImages.delete(folder);throw error;});
      collectionImages.set(folder,loading);
    }
    return collectionImages.get(folder);
  }
  function decoratePaper(ctx,images,variant,openings,margin,gutter){
    const W=ctx.canvas.width,H=ctx.canvas.height;
    function place(index,x,y,w,h){
      const image=images[index];
      const scale=Math.min(w/image.width,h/image.height);
      const iw=image.width*scale,ih=image.height*scale;
      ctx.drawImage(image,x-iw/2,y-ih/2,iw,ih);
    }
    openings.forEach(({x,y,w,h},i)=>{
      // Side rails follow the photos, even in the centred last row of a collage.
      const left=x<margin+1, right=x+w>W-margin-1;
      const side=left?margin:gutter;
      if(variant || i%2===0)place(variant?2:0,x-side/2,y+h*.27,side*.98,h*.39);
      if(right)place(variant?1:0,x+w+margin/2,y+h*.77,margin*.99,h*.32);
      const rail=y<=margin+1?margin:Math.min(gutter,margin);
      const centre=variant?w*.29:w*(i%2?.70:.78);
      place(variant?3:1,x+centre,y-rail/2,w*(variant?.56:.33),rail*.98);
      if(variant)place(0,x+w*.81,y-rail/2,w*.18,rail*.85);
    });
    // End accents sit inside the outside rails, clear of the inscription.
    place(variant?2:0,margin/2,H-margin/2,margin,margin);
    place(variant?3:1,W-margin/2,margin/2,margin,margin);
  }
  async function render(target,s,longEdge,exporting=false){
    const ticket={};latestRender.set(target,ticket);
    const edition=window.StudioLayouts?.editions?.[s.theme];
    const images=edition && s.mode!=='photo'?await loadCollection(edition.folder):null;
    if(latestRender.get(target)!==ticket)return;
    const openings=[];
    const single=['photo','polaroid'].includes(s.mode),strip=s.mode==='strip';
    const count=single?1:Math.max(1,Math.min(6,s.positions||s.photos.length||1));
    const items=single?s.photos.slice(s.index,s.index+1):s.photos.slice(0,count);
    const cols=strip?(s.direction==='Horizontal'?count:1):(count<=2?count:count<=4?2:3);
    const rows=Math.ceil(count/cols),pad=s.mode==='photo'?0:s.border/100,gap=(s.spacing??3)/100;
    const bottom=s.mode==='photo'?0:(strip&&s.printShape==='2 × 6 inches'&&cols===1&&s.direction==='Horizontal'?.11:.21);
    const width=cols+pad*2+(cols-1)*gap;
    const fixed=strip && s.printShape==='2 × 6 inches';
    const height=fixed?width*(s.direction==='Horizontal'?1/3:3):rows/s.ratio+2*pad+(rows-1)*gap+bottom;
    const cellHeight=(height-2*pad-(rows-1)*gap-bottom)/rows;
    const topCaption=s.captionPlace==='Top'?bottom:0;
    const scale=longEdge/Math.max(width,height);
    target.width=Math.max(1,Math.round(width*scale));target.height=Math.max(1,Math.round(height*scale));
    const ctx=target.getContext('2d');ctx.fillStyle=s.background||s.paper;ctx.fillRect(0,0,target.width,target.height);
    for(let i=0;i<count;i++){
      const inRow=Math.min(cols,count-Math.floor(i/cols)*cols);
      const x=(pad+(cols-inRow)*(1+gap)/2+(i%cols)*(1+gap))*scale;
      const y=(pad+topCaption+Math.floor(i/cols)*(cellHeight+gap))*scale;
      const w=scale,h=scale*cellHeight,item=items[i];
      if(images)openings.push({x,y,w,h});
      const rim=pad*scale*.42;
      ctx.fillStyle=s.paper;ctx.fillRect(x-rim,y-rim,w+2*rim,h+2*rim);
      const drawTile=tile=>{
        ctx.save();
        if(s.corners==='Rounded'){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(w,h)*.075);ctx.clip();}
        ctx.drawImage(tile,x,y,w,h);ctx.restore();
      };
      if(!item){
        ctx.fillStyle='#d7cbb7';ctx.fillRect(x,y,w,h);ctx.fillStyle='#52483b';ctx.textAlign='center';ctx.font='italic '+Math.max(11,w*.055)+'px Georgia';ctx.fillText('Photo '+(i+1),x+w/2,y+h/2);continue;
      }
      const key=[Math.round(w),Math.round(h),item.zoom,item.x,item.y,item.film,item.strength,s.compare].join('/');
      if(!exporting && item.cachedKey===key){
        drawTile(item.cachedTile);continue;
      }
      const tile=canvas(w,h),g=tile.getContext('2d',{willReadFrequently:true});
      if(exporting && item.file){
        const url=URL.createObjectURL(item.file),image=new Image();
        try{image.src=url;await image.decode();crop(g,image,0,0,tile.width,tile.height,item);}
        finally{image.removeAttribute('src');URL.revokeObjectURL(url);}
      }else crop(g,exporting?item.source:item.preview,0,0,tile.width,tile.height,item);
      if(!s.compare || exporting) grade(tile,item.film,item.strength);
      drawTile(tile);
      if(exporting)tile.width=tile.height=1;
      else{
        if(item.cachedTile)item.cachedTile.width=item.cachedTile.height=1;
        item.cachedKey=key;item.cachedTile=tile;
      }
    }
    if(images)decoratePaper(ctx,images,edition.variant,openings,pad*scale,gap*scale);
    if(bottom){
      const base=(topCaption?pad:height-bottom-pad)*scale;
      ctx.fillStyle='#423329';ctx.textAlign='center';ctx.font='italic '+scale*.08+'px '+(s.font||'Georgia');ctx.fillText(s.caption,width*scale/2,base+.087*scale,width*scale*.83);
      ctx.font=scale*.047+'px Georgia';
      ctx.textAlign=({Left:'left',Right:'right'})[s.datePlace]||'center';
      const textX=ctx.textAlign==='left'?.1:ctx.textAlign==='right'?.9:.5;
      ctx.fillText([s.date,s.message].filter(Boolean).join('  ·  '),width*scale*textX,base+.165*scale,width*scale*.8);
      if(frames[s.frame][1])mark(ctx,frames[s.frame][1],pad*scale+.05*scale,base+.11*scale,.13*scale,-8,s);
    }
    if(strip&&s.filmEdge){
      ctx.fillStyle='#382b22';
      const edge=Math.max(2,Math.min(target.width,target.height)*.024);
      const horizontal=s.direction==='Horizontal',length=horizontal?target.width:target.height;
      for(let pos=edge;pos<length-edge;pos+=edge*3){
        if(horizontal){ctx.fillRect(pos,0,edge*1.7,edge);ctx.fillRect(pos,target.height-edge,edge*1.7,edge);}
        else{ctx.fillRect(0,pos,edge,edge*1.7);ctx.fillRect(target.width-edge,pos,edge,edge*1.7);}
      }
    }
    for(const d of s.art)mark(ctx,d.type,target.width*d.x/100,target.height*d.y/100,Math.min(target.width,target.height)*d.size/100,d.angle,s);
  }
  async function printDensity(blob,format){
    const bytes=new Uint8Array(await blob.arrayBuffer());
    if(format==='JPEG'){
      // Insert a JFIF density header when the encoder omits it.
      const header=Uint8Array.of(255,224,0,16,74,70,73,70,0,1,1,1,1,44,1,44,0,0);
      if(bytes[2]===255 && bytes[3]===224 && bytes[6]===74 && bytes[7]===70){
        bytes.set([1,1,44,1,44],13);return new Blob([bytes],{type:blob.type});
      }
      return new Blob([bytes.slice(0,2),header,bytes.slice(2)],{type:blob.type});
    }
    const chunk=new Uint8Array(21),v=new DataView(chunk.buffer);
    v.setUint32(0,9);chunk.set([112,72,89,115],4);
    v.setUint32(8,11811);v.setUint32(12,11811);chunk[16]=1;
    let crc=-1;for(const byte of chunk.subarray(4,17)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    v.setUint32(17,(crc^-1)>>>0);
    const parts=[bytes.slice(0,8)],view=new DataView(bytes.buffer);
    for(let pos=8;pos<bytes.length;){
      const end=pos+12+view.getUint32(pos),kind=view.getUint32(pos+4);
      if(kind!==0x70485973)parts.push(bytes.subarray(pos,end));
      if(kind===0x49484452)parts.push(chunk);
      pos=end;
    }
    return new Blob(parts,{type:blob.type});
  }
  async function download(s,edge,format){
    const c=canvas(1,1);await render(c,s,edge,true);
    try{
      const blob=await new Promise(resolve=>c.toBlob(resolve,format==='PNG'?'image/png':'image/jpeg',.94));
      if(!blob)throw Error('Could not create the file. Try a smaller size.');
      const url=URL.createObjectURL(s.mode==='strip'&&s.printShape==='2 × 6 inches'&&edge===1800?await printDensity(blob,format):blob),link=document.createElement('a');
      link.href=url;link.download='chermo-'+s.mode+'.'+(format==='PNG'?'png':'jpg');document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }finally{c.width=c.height=1;}
  }
  return {films,frames,marks,canvas,grade,crop,landscape,render,download};
})();
