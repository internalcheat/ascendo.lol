// Small, bounded formatting grammar. User content is always text, never HTML.
export function appendRichBio(container,bio,{align='center'}={},safeUrl){
 const doc=container.ownerDocument;container.dataset.richBio='true';container.style.textAlign=align;
 function inline(parent,text,depth=0){
  if(depth>4){parent.append(doc.createTextNode(text));return;}
  const pattern=/\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*/g;
  let start=0;
  for(const match of text.matchAll(pattern)){
   parent.append(doc.createTextNode(text.slice(start,match.index)));let node;
   if(match[1]!==undefined){try{node=doc.createElement('a');node.href=safeUrl(match[2],false);node.target='_blank';node.rel='noopener noreferrer';inline(node,match[1],depth+1);}catch{node=doc.createTextNode(match[0]);}}
   else{node=doc.createElement(match[3]!==undefined?'strong':match[4]!==undefined?'u':'em');inline(node,match[3]??match[4]??match[5],depth+1);}
   parent.append(node);start=match.index+match[0].length;
  }
  parent.append(doc.createTextNode(text.slice(start)));
 }
 for(const line of bio.split('\n')){
  if(!line.trim()){const space=doc.createElement('div');space.className='bio-line-space';space.setAttribute('aria-hidden','true');container.append(space);continue;}
  const quote=line.startsWith('> '),node=doc.createElement(quote?'blockquote':'p');inline(node,quote?line.slice(2):line);container.append(node);
 }
}
