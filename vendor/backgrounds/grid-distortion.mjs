import{a as Z,b as qe,c as Ue,d as ye}from"./shared-SIGNVFDT.mjs";var x=Z(qe(),1);var j=Z(Ue(),1),He=`#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ye=`#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uField;
uniform vec2 uGrid;
uniform vec2 uCover;
uniform float uSoftness;
uniform float uChroma;
uniform float uReveal;
in vec2 vUv;
out vec4 outColor;

vec2 fieldAt(ivec2 cell) {
  return texelFetch(uField, clamp(cell, ivec2(0), ivec2(uGrid) - 1), 0).rg;
}

vec3 sampleImage(vec2 uv) {
  return texture(uImage, (uv - 0.5) * uCover + 0.5).rgb;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 g = uv * uGrid;
  vec2 blocky = fieldAt(ivec2(floor(g)));
  vec2 p = g - 0.5;
  ivec2 base = ivec2(floor(p));
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 soft = mix(
    mix(fieldAt(base), fieldAt(base + ivec2(1, 0)), f.x),
    mix(fieldAt(base + ivec2(0, 1)), fieldAt(base + ivec2(1, 1)), f.x),
    f.y
  );
  vec2 shift = mix(blocky, soft, uSoftness);
  float spread = uChroma * 0.35;
  vec3 color = vec3(
    sampleImage(uv - shift * (1.0 + spread)).r,
    sampleImage(uv - shift).g,
    sampleImage(uv - shift * (1.0 - spread)).b
  );
  outColor = vec4(color * uReveal, uReveal);
}`,ze=["drag","push","swirl"],Ve=18,Ie=1.6,I=(h,E,A)=>Math.min(A,Math.max(E,h)),Pe=(h,E,A)=>{let c=Math.imul(h,668265261)^Math.imul(E,374761393)^Math.imul(A,739982445);return c=Math.imul(c^c>>>15,2246822507),c=Math.imul(c^c>>>13,3266489909),((c^c>>>16)>>>0)/2147483648-1},De=(h,E,A)=>{let c=h.createShader(E);return c?(h.shaderSource(c,A),h.compileShader(c),h.getShaderParameter(c,h.COMPILE_STATUS)?c:(h.deleteShader(c),null)):null},$e=({imageSrc:h,grid:E=15,radius:A=.18,strength:c=.15,relaxation:Fe=.96,mode:ee="drag",softness:Se=0,chroma:Le=0,idle:Ge=.3,clickRipple:Ce=!0,intro:Ne=!0,className:te="",style:Be})=>{let oe=(0,x.useRef)(null),re=(0,x.useRef)(null),O=(0,x.useRef)(null),ne={grid:I(Math.round(E),2,120),radius:I(A,.01,1),strength:Math.max(0,c),relaxation:I(Fe,0,.995),mode:ze.includes(ee)?ee:"drag",softness:I(Se,0,1),chroma:I(Le,0,2),idle:I(Ge,0,1),clickRipple:Ce,intro:Ne},_=(0,x.useRef)(ne);return _.current=ne,(0,x.useEffect)(()=>{let b=oe.current,P=re.current,e=P?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!b||!P||!e)return;let z=De(e,e.VERTEX_SHADER,He),V=De(e,e.FRAGMENT_SHADER,Ye),v=e.createProgram();if(!z||!V||!v||(e.attachShader(v,z),e.attachShader(v,V),e.linkProgram(v),!e.getProgramParameter(v,e.LINK_STATUS)))return;e.useProgram(v);let ie=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,ie),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);let ae=e.getAttribLocation(v,"aPosition");e.enableVertexAttribArray(ae),e.vertexAttribPointer(ae,2,e.FLOAT,!1,0,0);let M={};for(let o of["uImage","uField","uGrid","uCover","uSoftness","uChroma","uReveal"])M[o]=e.getUniformLocation(v,o);e.uniform1i(M.uImage,0),e.uniform1i(M.uField,1);let $=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,$),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.MIRRORED_REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let se=e.createTexture();e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,se),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let C=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,l={x:0,y:0,px:0,py:0,inside:!1},t={width:1,height:1,cols:0,rows:0,sim:new Float32Array(0),out:new Float32Array(0),ripples:[],time:0,reveal:0,loaded:!1,imageAspect:1,request:0,lastMove:-10,phantom:1},D=0,N=0,k=!0,W=!0,K=()=>{let o=_.current.grid,n=Math.max(1,Math.round(o*t.height/t.width));o===t.cols&&n===t.rows||(t.cols=o,t.rows=n,t.sim=new Float32Array(o*n*2),t.out=new Float32Array(o*n*2),e.activeTexture(e.TEXTURE1),e.texImage2D(e.TEXTURE_2D,0,e.RG32F,o,n,0,e.RG,e.FLOAT,t.out))},Oe=()=>{let{sim:o,cols:n,rows:r,width:i,height:a}=t,d=Math.min(i,a)*.12;for(let u=0;u<r;u++)for(let m=0;m<n;m++){let f=(u*n+m)*2;o[f]=Pe(m+1,u+1,11)*d/i,o[f+1]=Pe(m+1,u+1,23)*d/a}},ce=(o,n,r,i,a,d)=>{let{sim:u,cols:m,rows:f,width:s,height:T}=t,p=Math.max(1,o.radius*s),w=s/m,R=T/f,U=Math.hypot(i,a),q=(.25+o.strength)*.4*s,J=Math.max(0,Math.floor((n-p)/w)),F=Math.min(m-1,Math.floor((n+p)/w)),S=Math.max(0,Math.floor((r-p)/R)),H=Math.min(f-1,Math.floor((r+p)/R));for(let y=S;y<=H;y++)for(let g=J;g<=F;g++){let L=(g+.5)*w-n,B=(y+.5)*R-r,G=Math.hypot(L,B);if(G>=p)continue;let Te=1-(G/p)**2,Re=o.strength*Ve*d*Te*Te,ge=i,xe=a;if(o.mode!=="drag"){let _e=G>0?L/G:0,be=G>0?B/G:0;ge=o.mode==="push"?_e*U:-be*U,xe=o.mode==="push"?be*U:_e*U}let Y=(y*m+g)*2,Me=u[Y]*s+ge*Re,we=u[Y+1]*T+xe*Re,Q=Math.hypot(Me,we),Ae=Q>0?q*Math.tanh(Q/q)/Q:0;u[Y]=Me*Ae/s,u[Y+1]=we*Ae/T}},le=o=>[t.width*(.5+.34*Math.sin(o*.43)+.08*Math.sin(o*1.21+1.7)),t.height*(.5+.3*Math.sin(o*.61+.9)+.08*Math.cos(o*1.03+.4))],ke=(o,n)=>{let{sim:r}=t,i=Math.pow(o.relaxation,n*60),a=0;for(let s=0;s<r.length;s++)r[s]*=i,Math.abs(r[s])<1e-5?r[s]=0:a=Math.max(a,Math.abs(r[s]));if(o.strength<=0)return a;let d=l.x-l.px,u=l.y-l.py;l.px=l.x,l.py=l.y,l.inside&&(d||u)&&(t.lastMove=t.time,ce(o,l.x,l.y,d,u,1),a=Math.max(a,.001));let m=C?0:o.idle,f=t.time-t.lastMove>2.5;if(t.phantom=I(t.phantom+(f?n:-n*3),0,1),m>0&&t.phantom>0){let[s,T]=le(t.time),[p,w]=le(t.time-n);ce(o,s,T,s-p,T-w,m*.6*t.phantom*t.phantom)}return a},ue=o=>{let{sim:n,out:r,cols:i,rows:a,width:d,height:u,time:m}=t;if(r.set(n),t.ripples.length){let f=d/i,s=u/a,T=Math.hypot(d,u),p=Math.max(f,s)*1.2+T*.03,w=d*(.03+o.strength*.3);t.ripples=t.ripples.filter(R=>m-R.start<Ie);for(let R of t.ripples){let U=(m-R.start)/Ie,q=U*T*.75,J=(1-U)**2;for(let F=0;F<a;F++)for(let S=0;S<i;S++){let H=(S+.5)*f-R.x,y=(F+.5)*s-R.y,g=Math.hypot(H,y),L=Math.exp(-(((g-q)/p)**2))*J;if(L<.002||g===0)continue;let B=(F*i+S)*2;r[B]+=H/g*(L*w/d),r[B+1]+=y/g*(L*w/u)}}}},he=()=>{let{width:o,height:n}=t,r=o/n,i=r>t.imageAspect?[1,t.imageAspect/r]:[r/t.imageAspect,1];e.viewport(0,0,P.width,P.height),e.activeTexture(e.TEXTURE1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,t.cols,t.rows,e.RG,e.FLOAT,t.out);let a=_.current;e.uniform2f(M.uGrid,t.cols,t.rows),e.uniform2f(M.uCover,i[0],i[1]),e.uniform1f(M.uSoftness,a.softness),e.uniform1f(M.uChroma,a.chroma),e.uniform1f(M.uReveal,t.reveal),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLES,0,3)},me=o=>{if(D=0,!W||!k)return;let n=_.current,r=N?Math.min(.05,(o-N)/1e3):1/60;N=o,t.time+=r,K(),t.loaded&&(t.reveal=C?1:Math.min(1,t.reveal+r/.6));let i=ke(n,r);ue(n),he(),i>0||t.ripples.length>0||n.idle>0&&!C||t.reveal<1?D=requestAnimationFrame(me):N=0},X=()=>{D||!W||!k||(D=requestAnimationFrame(me))},We=o=>{let n=++t.request;if(!o)return;let r=new Image;r.crossOrigin="anonymous",r.decoding="async",r.onload=()=>{!W||n!==t.request||(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,$),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,r),e.generateMipmap(e.TEXTURE_2D),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),t.imageAspect=r.naturalWidth/Math.max(1,r.naturalHeight),K(),_.current.intro&&!C&&Oe(),t.loaded=!0,X())},r.src=o},de=o=>{let n=b.getBoundingClientRect(),r=o.clientX-n.left,i=o.clientY-n.top,a=r>=0&&i>=0&&r<=n.width&&i<=n.height;a&&!l.inside&&(l.px=r,l.py=i),l.x=r,l.y=i,l.inside=a,a&&X()},fe=o=>{if(!_.current.clickRipple||C)return;let n=b.getBoundingClientRect(),r=o.clientX-n.left,i=o.clientY-n.top;r<0||i<0||r>n.width||i>n.height||(t.ripples.push({x:r,y:i,start:t.time}),t.ripples.length>4&&t.ripples.shift(),X())},pe=()=>{let o=Math.min(window.devicePixelRatio||1,2);t.width=Math.max(1,b.clientWidth),t.height=Math.max(1,b.clientHeight),P.width=Math.round(t.width*o),P.height=Math.round(t.height*o),K(),D||(ue(_.current),he()),X()};O.current={load:We,wake:X};let Ee=new ResizeObserver(pe);Ee.observe(b);let ve=new IntersectionObserver(o=>{k=o.some(n=>n.isIntersecting),k&&(N=0,X())});return ve.observe(b),window.addEventListener("pointermove",de,{passive:!0}),window.addEventListener("pointerdown",fe,{passive:!0}),pe(),()=>{W=!1,cancelAnimationFrame(D),O.current=null,Ee.disconnect(),ve.disconnect(),window.removeEventListener("pointermove",de),window.removeEventListener("pointerdown",fe),e.deleteTexture($),e.deleteTexture(se),e.deleteBuffer(ie),e.deleteProgram(v),e.deleteShader(z),e.deleteShader(V)}},[]),(0,x.useEffect)(()=>{O.current?.load(h)},[h]),(0,x.useEffect)(()=>{O.current?.wake()}),(0,j.jsx)("div",{ref:oe,className:`distortion-container${te?` ${te}`:""}`,style:Be,children:(0,j.jsx)("canvas",{ref:re,className:"distortion-container__canvas","aria-hidden":"true"})})},Xe=$e;function tt(h,E){return ye(Xe,h,{imageSrc:"/assets/background-presets/grid-distortion-image.webp",grid:15,radius:.18,strength:.15,relaxation:.96,mode:"drag",softness:0,chroma:0,idle:.3,clickRipple:!0,intro:!0},E)}export{tt as mountBackground};
