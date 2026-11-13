window.StudioLayouts=(()=>{
  // Each theme pairs a paper stock, inscription style and original drawn motif.
  const themes={
    'Everyday · Ordinary Magic':['Classic White','#f4ecda','Georgia','Decorative corner','Original'],
    'Couples · Love Notes':['Romantic','#f4d9da','cursive','Heart','Dreamscape'],
    'Friends · The Good Old Days':['Playful Doodles','#ecdcb7','sans-serif','Arrow','Golden Hour'],
    'Birthday · Celebration Strip':['Family Memories','#eed3b5','cursive','Star','Just Us'],
    'Family · Generations':['Vintage Paper','#e3d8c3','Georgia','Little note','Memory Fade'],
    'Travel · Postcards From Somewhere':['Botanical','#dadcc7','monospace','Date stamp','Film Diary'],
    'Everyday · Film Diary':['Minimal Champagne','#e1dece','monospace','Vintage label','Old Soul']
  };
  const illustrated={
    'Kiss marks':['#f4dfdc','Kiss mark'],
    'Kisses, bows & hearts':['#f6e5de','Kiss mark','Ribbon bow','Heart'],
    'Bows':['#f2dfdd','Ribbon bow'],
    'Hearts':['#efd9d6','Heart'],
    'Autumn leaves':['#efdfbd','Autumn leaf'],
    'Diwali firecrackers':['#f7e0ad','Diwali firecracker'],
    'Winter snowflakes':['#e0ebee','Snowflake']
  };
  for(const [name,[paper,motif]] of Object.entries(illustrated)){
    themes[name]=['Classic White',paper,'Georgia',motif,'Original'];
  }
  const names=Object.keys(themes);
  const collections=[
    ['Kiss marks','kiss','First Impression','Love Letters'],
    ['Kisses, bows & hearts','scrapbook','Boudoir Note','Ribbon Diary'],
    ['Bows','bows','Silk Knot','Velvet Garland'],
    ['Hearts','hearts','Embroidered Valentine','Heirloom Lace'],
    ['Autumn leaves','leaves','Pressed Specimen','October Walk'],
    ['Diwali firecrackers','diwali','Saffron Spark','Festival Brocade'],
    ['Winter snowflakes','winter','First Frost','Silver Filigree']
  ];
  const editions=Object.create(null);
  for(const [collection,folder,...designs] of collections){
    designs.forEach((design,variant)=>{
      const name=collection+' · '+design;
      editions[name]={collection,folder,design,variant};
      themes[name]=themes[collection];
    });
  }
  function style(theme){
    const [frame,background,font,motif,film]=themes[theme];
    if(editions[theme])return {theme,frame,background,font,film,paper:background,border:10,spacing:12,art:[]};
    if(illustrated[theme]){
      const [paper,...motifs]=illustrated[theme];
      const placements=[[5,7,11,-20],[13,3,7,12],[96,17,8,20],[4,87,9,-16],[88,94,11,12],[96,88,7,-22]];
      return {theme,frame,background,font,film,paper,art:placements.map(([x,y,size,angle],i)=>({type:motifs[i%motifs.length],x,y,size,angle}))};
    }
    return {theme,frame,background,font,film,paper:StudioPrint.frames[frame][0],
      art:[{type:motif,x:92,y:94,size:10,angle:-8}]};
  }
  const strips=[
    ['Classic two',2],['Classic three',3],['Classic four',4],['Extended six',6],
    ['Vertical'],['Horizontal',null,0,'Horizontal'],['Romantic',null,1],['Vintage film',null,6],
    ['Black and white',null,6,'Horizontal'],['Minimalist',null,0,'Horizontal'],
    ['Couples',null,1],['Friends',null,2],['Birthday',null,3],['Family',null,4],['Travel diary',null,5]
  ];
  function presets(mode){
    const rows=mode==='strip'?strips:[['Single Polaroid',1],['Two-photo memories',2,1],['Three-photo scrapbook',3,5],['Four-photo board',4,2],['Six-photo board',6,4]];
    return rows.map(([name,positions,theme=0,direction='Vertical'])=>({
      name,mode,direction,...(positions?{positions}:{}),
      ...style(names[theme]),filmEdge:name==='Vintage film',corners:name==='Romantic'||name==='Birthday'?'Rounded':'Square',spacing:name==='Minimalist'?1:name==='Vertical'?7:3
    }));
  }
  const samples=new Promise(resolve=>{
    const image=new Image();
    function finish(loaded){
      const photos=Array.from({length:6},(_,i)=>{
        const c=StudioPrint.canvas(200,160);
        if(loaded){const side=image.height*.45; c.getContext('2d').drawImage(image,image.width*(.42+i*.073),image.height*(.12+(i%3)*.16),side,side*.8,0,0,200,160);}
        else StudioPrint.landscape(c,i%2);
        return {preview:c,source:c,film:'Original',strength:.8,x:.5,y:.5,zoom:1};
      });
      resolve(photos);
    }
    image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src='/memory-studio/studio-camera.webp';
  });
  function example(mode,photos){
    return {mode,photos,index:0,positions:mode==='strip'?4:3,ratio:1,direction:'Vertical',border:5,spacing:4,caption:'A day to keep',date:'',message:'',...style(names[0])};
  }
  samples.then(photos=>document.querySelectorAll('[data-sample]').forEach(c=>StudioPrint.render(c,example(c.dataset.sample,photos),240)));
  return {themes,editions,style,presets,samples,example};
})();
