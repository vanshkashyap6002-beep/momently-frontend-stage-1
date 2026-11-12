/* Keep the photo roll in this tab while the URL and visible page change together. */
(() => {
  const mast=document.querySelector('.mast');
  const navigation=mast.querySelector('nav');
  const menu=document.createElement('dialog');
  menu.className='studio-menu';
  menu.id='studio-menu';
  menu.setAttribute('aria-label','Site menu');
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='studio-menu-toggle';
  toggle.setAttribute('aria-label','Open navigation menu');
  toggle.setAttribute('aria-controls',menu.id);
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-haspopup','dialog');
  toggle.append(document.createElement('span'));
  const closeButton=document.createElement('button');
  closeButton.type='button';
  closeButton.className='studio-menu-close';
  closeButton.textContent='×';
  closeButton.setAttribute('aria-label','Close navigation menu');
  menu.append(closeButton,navigation.cloneNode(true));
  mast.append(toggle,menu);
  toggle.onclick=()=>{menu.showModal();toggle.setAttribute('aria-expanded','true');};
  closeButton.onclick=()=>menu.close();
  menu.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
  menu.addEventListener('click',event=>{
    if(event.target.closest('a') || (event.target===menu && event.clientX<menu.getBoundingClientRect().left))menu.close();
  });
  const closeMenu=()=>{if(menu.open)menu.close();};
  matchMedia('(max-width: 740px)').addEventListener('change',closeMenu);
  window.addEventListener('popstate',closeMenu);
  window.addEventListener('pagehide',closeMenu);
  const main=document.getElementById('main');
  const initial=main.querySelector('[data-page]');
  const pages=new Map([[initial.dataset.page,initial]]);
  const names=['home','camera','editor','preview','photobooth','collage'];
  const titles={home:'Memory Studio',camera:'Vintage camera',editor:'Edit your memory',preview:'Your print',photobooth:'CHERMO Photobooth',collage:'Memory Collage'};
  const ids=new Map([['status',document.getElementById('status')]]);
  function register(panel){
    for(const node of panel.querySelectorAll('[id]'))ids.set(node.id,node);
  }
  register(initial);
  const editor=window.initStudio(id=>ids.get(id),navigate);
  let sequence=0;
  function route(url){
    const path=url.pathname.replace(/\/index\.html$/,'/').replace(/\/$/,'');
    if(path==='/memory-studio')return 'home';
    const name=path.split('/').pop();
    return path==='/memory-studio/'+name && names.includes(name)?name:null;
  }
  async function loadPage(page){
    if(pages.has(page))return pages.get(page);
    const response=await fetch('/memory-studio/'+(page==='home'?'':page+'/'));
    if(!response.ok)throw Error('Page unavailable');
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const panel=doc.querySelector('[data-page="'+page+'"]');
    if(!panel)throw Error('Invalid page');
    return document.adoptNode(panel);
  }
  async function navigate(destination,options={}){
    const ticket=++sequence,url=new URL(destination,location.href),page=route(url);
    if(!page)return;
    try{
      const panel=await loadPage(page);
      if(ticket!==sequence)return;
      if(!pages.has(page)){pages.set(page,panel);register(panel);}
      if(document.getElementById('status').querySelector('button'))document.getElementById('status').replaceChildren();
      editor.leave();
      if(!options.restore && url.href!==location.href)history.pushState({studioDepth:(history.state?.studioDepth||0)+1},'',url);
      main.replaceChildren(pages.get(page));
      document.body.dataset.view=page;document.title=titles[page]+' · CHERMO Memory Studio';
      editor.show(page,url,options);
      if(!options.initial){main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
    }catch(error){
      if(ticket!==sequence)return;
      const status=document.getElementById('status');
      const retry=document.createElement('button');
      retry.textContent='Retry';
      retry.onclick=()=>navigate(destination,options);
      status.replaceChildren('Could not open '+titles[page]+'. ',retry);
    }
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[data-route]');
    if(!link || e.button!==0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)return;
    e.preventDefault();
    if(link.hasAttribute('data-back') && history.state?.studioDepth>0){history.back();return;}
    navigate(link.href,{reveal:link.closest('[data-page=editor]') !== null && route(new URL(link.href))==='preview'});
  });
  window.addEventListener('popstate',()=>navigate(location.href,{restore:true}));
  document.body.dataset.view=initial.dataset.page;
  navigate(location.href,{restore:true,initial:true});
})();
