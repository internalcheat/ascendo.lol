const squarePattern=/^[a-h][1-8]$/,ns='http://www.w3.org/2000/svg';
export function squarePoint(square,orientation='w'){
  if(!squarePattern.test(square))return null;
  const file=square.charCodeAt(0)-97,rank=Number(square[1])-1;
  return orientation==='b'?{x:7.5-file,y:rank+.5}:{x:file+.5,y:7.5-rank};
}
export function pointSquare(x,y,rect,orientation='w'){
  if(!rect||![x,y,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0||x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
  const col=Math.floor((x-rect.left)/rect.width*8),row=Math.floor((y-rect.top)/rect.height*8);
  return String.fromCharCode(97+(orientation==='b'?7-col:col))+(orientation==='b'?row+1:8-row);
}
export class BoardMarks {
  items=new Map();
  toggle(from,to=from){
    if(!squarePattern.test(from)||!squarePattern.test(to))return null;
    const key=from+':'+to;if(this.items.delete(key))return false;
    if(this.items.size>=64)this.items.delete(this.items.keys().next().value);
    this.items.set(key,{from,to});return true;
  }
  clear(){this.items.clear();}
}

export class BoardAnnotations {
  constructor({board,layer,enabled=()=>true,onStart=()=>{},onChange=()=>{}}){
    Object.assign(this,{board,layer,enabled,onStart,onChange});this.marks=new BoardMarks();this.orientation='w';this.mode=false;this.gesture=null;this.anchor=null;this.preview=null;this.position=null;this.suppressClick=false;
    const win=board.ownerDocument.defaultView;this.events=new win.AbortController();const options={capture:true,signal:this.events.signal};
    board.addEventListener('pointerdown',e=>this.down(e),options);board.addEventListener('pointermove',e=>this.move(e),options);board.addEventListener('pointerup',e=>this.up(e),options);
    board.addEventListener('pointercancel',e=>{if(e.pointerId===this.gesture?.id)this.cancelGesture();},options);
    board.addEventListener('contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();},options);
    board.addEventListener('click',e=>{if(this.mode||(this.suppressClick&&e.detail!==0)){const synthetic=e.detail===0,cell=e.target.closest('.square');this.suppressClick=false;e.preventDefault();e.stopImmediatePropagation();if(synthetic&&cell)this.select(cell.dataset.square);}},options);
    board.addEventListener('focusin',e=>{const cell=e.target.closest('.square');if(this.mode&&this.anchor&&cell){this.preview={from:this.anchor,to:cell.dataset.square};this.render();}},options);
    board.ownerDocument.addEventListener('visibilitychange',()=>{if(board.ownerDocument.hidden)this.cancelGesture();},{signal:this.events.signal});
    win.addEventListener('pagehide',e=>{this.cancelGesture();if(!e.persisted)this.dispose();},{signal:this.events.signal});
    win.addEventListener('resize',()=>this.cancelGesture(),{signal:this.events.signal});
    if(win.ResizeObserver){this.observer=new win.ResizeObserver(entries=>{const r=entries[0]?.contentRect,g=this.gesture;if(g&&r&&(Math.abs(r.width-g.rect.width)>.5||Math.abs(r.height-g.rect.height)>.5))this.cancelGesture();});this.observer.observe(board);}
  }
  get hasState(){return this.mode||this.marks.items.size>0||Boolean(this.gesture||this.anchor);}
  notify(text=''){this.onChange({mode:this.mode,count:this.marks.items.size,text});}
  setMode(value){
    if(value&&!this.enabled())return;this.cancelGesture();this.anchor=null;this.mode=Boolean(value);
    if(this.mode){this.board.dataset.annotating='true';this.onStart();}else delete this.board.dataset.annotating;
    this.notify(this.mode?'Annotation mode on. Drag or select two squares.':'Annotation mode off.');
  }
  setOrientation(value){if(value!==this.orientation){this.cancelGesture();this.anchor=null;this.orientation=value==='b'?'b':'w';}this.render();}
  reconcile(game){
    const key=JSON.stringify([game.room,game.side,game.state.round,game.state.fen,game.state.moves]);
    if(this.position!==null&&key!==this.position)this.clear(false);this.position=key;
  }
  toggle(from,to){
    const added=this.marks.toggle(from,to);if(added===null)return;
    this.render();this.notify(from===to?`${from} highlight ${added?'added':'removed'}.`:`Arrow ${from} to ${to} ${added?'added':'removed'}.`);
  }
  clear(announce=true){this.cancelGesture();this.anchor=null;this.preview=null;this.marks.clear();this.render();this.notify(announce?'Board annotations cleared.':'');}
  cancelGesture(){
    const g=this.gesture;this.gesture=null;this.preview=null;this.anchor=null;
    if(g)try{if(this.board.hasPointerCapture(g.id))this.board.releasePointerCapture(g.id);}catch{}
    this.render();
  }
  down(event){
    if(!this.enabled())return;
    if(this.gesture){event.preventDefault();event.stopImmediatePropagation();return;}
    this.suppressClick=false;
    if(event.isPrimary===false){if(this.mode){event.preventDefault();event.stopImmediatePropagation();}return;}
    if(event.button!==2&&!(this.mode&&event.button===0))return;
    const rect=this.board.getBoundingClientRect(),from=pointSquare(event.clientX,event.clientY,rect,this.orientation);if(!from)return;
    event.preventDefault();event.stopImmediatePropagation();this.onStart();const priorAnchor=event.button===0?this.anchor:null;this.anchor=null;this.preview={from:priorAnchor||from,to:from};this.gesture={id:event.pointerId,button:event.button,from:priorAnchor||from,clicked:from,priorAnchor,rect,x:event.clientX,y:event.clientY,moved:false};
    this.board.setPointerCapture(event.pointerId);this.render();
  }
  move(event){
    const g=this.gesture;if(!g||g.id!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();if(Math.hypot(event.clientX-g.x,event.clientY-g.y)>6)g.moved=true;const to=pointSquare(event.clientX,event.clientY,g.rect,this.orientation);
    if(to!==this.preview?.to){this.preview=to?{from:g.from,to}:null;this.render();}
  }
  up(event){
    const g=this.gesture;if(!g||g.id!==event.pointerId)return;
    event.preventDefault();event.stopImmediatePropagation();const rect=this.board.getBoundingClientRect();
    if(['left','top','width','height'].some(key=>Math.abs(rect[key]-g.rect[key])>.5)){this.cancelGesture();this.suppressClick=g.button===0;return;}
    const to=pointSquare(event.clientX,event.clientY,g.rect,this.orientation);this.cancelGesture();this.suppressClick=g.button===0;
    if(g.button===0&&!g.moved&&to===g.clicked){this.anchor=g.priorAnchor;this.select(to);}else if(to)this.toggle(g.from,to);
  }
  select(square){
    if(!this.mode||!this.enabled()||!squarePattern.test(square))return;
    if(!this.anchor){this.onStart();this.anchor=square;this.preview={from:square,to:square};this.render();this.notify(`Start ${square}. Select another square for an arrow, or the same square for a highlight.`);}
    else{const from=this.anchor;this.anchor=null;this.preview=null;this.toggle(from,square);}
  }
  key(event){
    if(!this.mode||!['Enter',' '].includes(event.key))return false;
    const cell=event.target.closest('.square');if(!cell)return false;
    event.preventDefault();event.stopPropagation();if(!event.repeat)this.select(cell.dataset.square);return true;
  }
  render(){
    const doc=this.layer.ownerDocument,fragment=doc.createDocumentFragment();
    const element=(tag,attributes)=>{const n=doc.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))n.setAttribute(key,String(value));return n;};
    const paint=({from,to},preview=false)=>{
      const a=squarePoint(from,this.orientation),b=squarePoint(to,this.orientation);if(!a||!b)return;
      const group=element('g',{'data-annotation':from===to?'square':'arrow','data-from':from,'data-to':to,...(preview?{'data-preview':'true'}:{})});
      if(from===to){const rect={x:a.x-.44,y:a.y-.44,width:.88,height:.88,rx:.07};group.append(element('rect',{...rect,class:'annotation-square-shadow'}),element('rect',{...rect,class:'annotation-square'}));}
      else{
        const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,base={x:b.x-ux*.32,y:b.y-uy*.32};
        const path=`M ${a.x} ${a.y} L ${base.x} ${base.y}`;
        group.append(element('path',{d:path,class:'annotation-shadow'}),element('path',{d:path,class:'annotation-shaft'}),element('polygon',{points:`${b.x},${b.y} ${base.x-uy*.2},${base.y+ux*.2} ${base.x+uy*.2},${base.y-ux*.2}`,class:'annotation-head'}));
      }
      fragment.append(group);
    };
    for(const mark of this.marks.items.values())paint(mark);if(this.preview)paint(this.preview,true);this.layer.replaceChildren(fragment);
  }
  dispose(){this.cancelGesture();this.events.abort();this.observer?.disconnect();this.marks.clear();this.layer.replaceChildren();}
}
