import{a as Te,b as Bt,c as lt,d as ut}from"./shared-SIGNVFDT.mjs";var _=Te(Bt(),1);var _e=Te(lt(),1),Lt=24e5,Pe=31.5,H=256,dt=["#5227FF","#FF9FFC","#B497CF"],ft={capsule:0,sphere:1,box:2,tetrahedron:3},ht={conic:0,radial:1,random:2},Ut=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aParticle;
layout(location = 2) in vec4 aSeed;
uniform vec2 uSize;
uniform float uPixel;
uniform vec2 uCursor;
uniform float uRing;
uniform float uBand;
uniform float uParticle;
uniform float uAmbient;
uniform float uTime;
uniform float uPulse;
uniform float uVariance;
uniform float uDepth;
uniform float uShape;
uniform float uColorMode;
uniform float uStops;
uniform float uHue;
uniform float uReveal;
uniform float uStreak;
uniform float uCharge;
out vec2 vLocal;
out vec2 vBounds;
out float vU;
out float vAlpha;
out float vSoft;

void main() {
  vec2 rel = aParticle.xy - uCursor;
  float dist = length(rel);
  vec2 radial = dist > 1e-3 ? rel / dist : vec2(1.0, 0.0);
  vec2 dir = radial;
  float speed = length(aParticle.zw);
  float streak = clamp(speed / uStreak, 0.0, 2.5);
  if (speed > 1e-3) {
    vec2 heading = aParticle.zw / speed * sign(dot(aParticle.zw, radial) + 1e-4);
    dir = normalize(mix(radial, heading, smoothstep(0.0, 1.0, streak)));
  }
  float ring = exp(-pow((dist - uRing) / uBand, 2.0));
  float z = aSeed.x;
  float depth = 1.0 + z * 0.32 * uDepth;
  float pulse = 1.0 + sin(uTime * uPulse + aSeed.y) * 0.22 * uVariance;
  float grow = uAmbient + (1.0 - uAmbient) * ring;
  float size = uParticle * depth * pulse * (0.85 + 0.3 * aSeed.w) * (1.0 + uCharge * 0.25 * ring);
  vec2 bounds;
  if (uShape < 0.5) {
    float width = size * 0.17 * mix(0.55, 1.0, ring);
    bounds = vec2(max(width, size * 0.5 * grow) * (1.0 + streak * 1.2), width);
  } else if (uShape < 1.5) {
    bounds = vec2(size * 0.22 * mix(0.45, 1.0, grow));
  } else {
    bounds = vec2(size * 0.26 * mix(0.45, 1.0, grow));
  }
  float soft = 1.0 + max(-z, 0.0) * 1.6 * uDepth;
  vec2 local = aCorner * (bounds + soft * 1.5 / uPixel);
  vec2 world = aParticle.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;
  gl_Position = vec4(world.x / uSize.x * 2.0 - 1.0, 1.0 - world.y / uSize.y * 2.0, 0.0, 1.0);
  vLocal = local * uPixel;
  vBounds = bounds * uPixel;
  vSoft = soft;
  if (uColorMode < 0.5) {
    vU = atan(radial.y, radial.x) / 6.28318530718 + uHue + (aSeed.z - 0.5) * 0.06;
  } else if (uColorMode < 1.5) {
    vU = clamp(dist / (uRing * 2.4), 0.0, 1.0) + (aSeed.z - 0.5) * 0.06;
  } else {
    vU = floor(aSeed.z * uStops) / max(uStops - 1.0, 1.0);
  }
  float fog = 1.0 - max(-z, 0.0) * 0.35 * uDepth;
  vAlpha = mix(uAmbient, 1.0, ring) * fog * uReveal;
}`,Ct=`#version 300 es
precision highp float;
uniform sampler2D uPalette;
uniform float uShape;
uniform float uColorMode;
uniform float uOpacity;
in vec2 vLocal;
in vec2 vBounds;
in float vU;
in float vAlpha;
in float vSoft;
out vec4 fragColor;

void main() {
  vec2 p = vLocal;
  float d;
  if (uShape < 0.5) {
    float r = vBounds.y;
    d = length(vec2(max(abs(p.x) - max(vBounds.x - r, 0.0), 0.0), p.y)) - r;
  } else if (uShape < 1.5) {
    d = length(p) - vBounds.x;
  } else if (uShape < 2.5) {
    float r = vBounds.x * 0.28;
    vec2 q = abs(p) - (vBounds - r);
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  } else {
    float r = vBounds.x * 1.15;
    vec2 q = vec2(r * 0.5774 - p.x, abs(p.y));
    d = max(dot(q, vec2(0.5, 0.8660254)) - r * 0.5, -q.x - r * 0.5) * 1.2;
  }
  float alpha = clamp(0.5 - d / vSoft, 0.0, 1.0) * vAlpha * uOpacity;
  if (alpha < 0.002) discard;
  vec3 color = texture(uPalette, vec2(uColorMode < 0.5 ? fract(vU) : vU, uColorMode < 0.5 ? 0.25 : 0.75)).rgb;
  fragColor = vec4(color * alpha, alpha);
}`,F=(n,i,c)=>Math.min(c,Math.max(i,n)),Dt=n=>{let i=String(n||"").trim(),c=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(i);if(c){let g=c[1].length===3?c[1].replace(/./g,h=>h+h):c[1];return[0,2,4].map(h=>parseInt(g.slice(h,h+2),16)/255)}let r=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(i);return r?[r[1],r[2],r[3]].map(g=>F(parseFloat(g)/255,0,1)):null},It=n=>n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4),zt=n=>n<=.0031308?n*12.92:1.055*Math.pow(Math.max(n,0),1/2.4)-.055,mt=n=>{let[i,c,r]=n.map(It),g=Math.cbrt(.4122214708*i+.5363325363*c+.0514459929*r),h=Math.cbrt(.2119034982*i+.6806995451*c+.1073969566*r),y=Math.cbrt(.0883024619*i+.2817188376*c+.6299787005*r);return[.2104542553*g+.793617785*h-.0040720468*y,1.9779984951*g-2.428592205*h+.4505937099*y,.0259040371*g+.7827717662*h-.808675766*y]},Ot=([n,i,c])=>{let r=Math.pow(n+.3963377774*i+.2158037573*c,3),g=Math.pow(n-.1055613458*i-.0638541728*c,3),h=Math.pow(n-.0894841775*i-1.291485548*c,3);return[4.0767416621*r-3.3077115913*g+.2309699292*h,-1.2684380046*r+2.6097574011*g-.3413193965*h,-.0041960863*r-.7034186147*g+1.707614701*h].map(y=>F(zt(y),0,1))},Xt=(n,i)=>{let c=[];n.forEach(h=>{let y=Dt(h);if(!y)return;let x=mt(y),D=Math.atan2(x[2],x[1])*180/Math.PI,S=F(1-Math.abs(D-85)/40,0,1),B=.62+.14*S*S*(3-2*S);if(i&&x[0]>B){let T=1+(x[0]-B)*1.6;c.push([B,x[1]*T,x[2]*T])}else c.push(x)}),c.length||c.push(mt(i?[.1,.1,.12]:[1,1,1]));let r=new Uint8Array(H*2*4);return[[...c,c[0]],c.length>1?c:[c[0],c[0]]].forEach((h,y)=>{for(let x=0;x<H;x++){let D=x/(H-(y===0?0:1))*(h.length-1),S=Math.min(Math.floor(D),h.length-2),B=D-S,T=B*B*(3-2*B),P=h[S],I=h[S+1],he=Math.hypot(P[1],P[2])*(1-T)+Math.hypot(I[1],I[2])*T,J=P[1]+(I[1]-P[1])*T,Q=P[2]+(I[2]-P[2])*T,ee=Math.hypot(J,Q),te=ee>1e-4?he/ee:0,me=Ot([P[0]+(I[0]-P[0])*T,J*te,Q*te]);for(let k=0;k<3;k++)r[(y*H+x)*4+k]=Math.round(me[k]*255);r[(y*H+x)*4+3]=255}}),r},kt=n=>()=>{n|=0,n=n+1831565813|0;let i=Math.imul(n^n>>>15,1|n);return i=i+Math.imul(i^i>>>7,61|i)^i,((i^i>>>14)>>>0)/4294967296},pt=(n,i,c)=>{let r=n.createShader(i);return r?(n.shaderSource(r,c),n.compileShader(r),n.getShaderParameter(r,n.COMPILE_STATUS)?r:(console.error(n.getShaderInfoLog(r)),n.deleteShader(r),null)):null},Yt=n=>{let i=pt(n,n.VERTEX_SHADER,Ut),c=pt(n,n.FRAGMENT_SHADER,Ct),r=i&&c?n.createProgram():null;if(!i||!c||!r)return i&&n.deleteShader(i),c&&n.deleteShader(c),null;if(n.attachShader(r,i),n.attachShader(r,c),n.linkProgram(r),n.deleteShader(i),n.deleteShader(c),!n.getProgramParameter(r,n.LINK_STATUS))return console.error(n.getProgramInfoLog(r)),n.deleteProgram(r),null;let g={},h=n.getProgramParameter(r,n.ACTIVE_UNIFORMS);for(let y=0;y<h;y++){let x=n.getActiveUniform(r,y);x&&(g[x.name]=n.getUniformLocation(r,x.name))}return{program:r,uniforms:g}},Nt=({count:n=1500,magnetRadius:i=9,ringRadius:c=7,waveSpeed:r=.4,waveAmplitude:g=1,waveCount:h=3,particleSize:y=.9,lerpSpeed:x=.05,color:D,colors:S=dt,colorMode:B="conic",colorSpeed:T=.05,autoAnimate:P=!0,particleVariance:I=1,rotationSpeed:he=0,depthFactor:J=1,pulseSpeed:Q=3,particleShape:ee="capsule",fieldStrength:te=10,ambient:me=.25,interactive:k=!0,clickBurst:xt=!0,intro:yt=!0,lightMode:Be=!1,opacity:gt=1,maxDevicePixelRatio:wt=2,className:Le="",style:At})=>{let Ue=(0,_.useRef)(null),Ce=(0,_.useRef)(null),pe=(0,_.useRef)(null),[De,Mt]=(0,_.useState)(0),Ie=D?[D]:Array.isArray(S)&&S.length?S:dt,ze={count:F(Math.round(n),1,2e4),magnet:Math.max(0,i),ring:Math.max(0,c),waveSpeed:r,waveAmplitude:Math.max(0,g),waveCount:Math.max(0,Math.round(h)),size:Math.max(0,y),follow:F(x,.001,1),palette:Ie,paletteKey:`${Ie.join(",")}|${Be}`,colorMode:ht[B]??ht.conic,colorSpeed:T,autoAnimate:P,variance:Math.max(0,I),rotation:he,depth:Math.max(0,J),pulse:Q,shape:ft[ee]??ft.capsule,tightness:Math.max(0,te),ambient:F(me,0,1),interactive:k,clickBurst:xt,intro:yt,light:Be,opacity:F(gt,0,1),maxRatio:F(wt,.5,3)},Y=(0,_.useRef)(ze);return Y.current=ze,(0,_.useEffect)(()=>{pe.current?.()}),(0,_.useEffect)(()=>{let W=Ue.current,E=Ce.current;if(!W||!E)return;let e=E.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),ne=e?Yt(e):null;if(!e||!ne)return;let K=window.matchMedia("(prefers-reduced-motion: reduce)").matches,ve=e.createVertexArray();e.bindVertexArray(ve);let Oe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,Oe),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let oe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,oe),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(1,1);let xe=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,xe),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,4,e.FLOAT,!1,0,0),e.vertexAttribDivisor(2,1);let ae=e.createTexture();e.bindTexture(e.TEXTURE_2D,ae),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE);let M={width:1,height:1,ratio:1},d={x:0,y:0,vx:0,vy:0,tx:0,ty:0,ready:!1},p={x:0,y:0,inside:!1,down:!1,moved:-1/0},R=null,Xe="",z=0,ke=0,U=0,N=Y.current.intro&&!K&&De===0?0:1/0,O=0,re=0,ye=!0,ge=document.visibilityState!=="hidden",we=!1,bt=t=>{t.paletteKey!==Xe&&(Xe=t.paletteKey,e.bindTexture(e.TEXTURE_2D,ae),e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,H,2,0,e.RGBA,e.UNSIGNED_BYTE,Xt(t.palette,t.light)))},Rt=(t,o,s,m)=>{let v=kt(1337),w=.06,l=o*(1+w*2),V=s*(1+w*2),L=Math.max(1,Math.ceil(Math.sqrt(t*l/V))),X=Math.max(1,Math.ceil(t/L)),A=Array.from({length:L*X},(a,b)=>b);for(let a=A.length-1;a>0;a--){let b=Math.floor(v()*(a+1));[A[a],A[b]]=[A[b],A[a]]}let C=Array.from({length:t},()=>v()*2-1).sort((a,b)=>a-b),f={total:t,width:o,height:s,homeX:new Float32Array(t),homeY:new Float32Array(t),band:new Float32Array(t),phase:new Float32Array(t),agility:new Float32Array(t),delay:new Float32Array(t),orbit:new Float32Array(t),x:new Float32Array(t),y:new Float32Array(t),vx:new Float32Array(t),vy:new Float32Array(t),particles:new Float32Array(t*4),seeds:new Float32Array(t*4)};for(let a=0;a<t;a++){let b=A[a],Z=-o*w+(b%L+.5+(v()-.5)*.85)/L*l,j=-s*w+(Math.floor(b/L)+.5+(v()-.5)*.85)/X*V;f.homeX[a]=Z,f.homeY[a]=j,f.band[a]=v()*2-1,f.phase[a]=v()*Math.PI*2,f.agility[a]=.75+v()*.5,f.delay[a]=v(),m&&a<m.total?(f.x[a]=m.x[a]/m.width*o,f.y[a]=m.y[a]/m.height*s,f.vx[a]=m.vx[a],f.vy[a]=m.vy[a],f.orbit[a]=m.orbit[a]):(f.x[a]=Z,f.y[a]=N===0?j+s*(.45+f.delay[a]*.4):j),f.seeds[a*4]=C[a],f.seeds[a*4+1]=f.phase[a],f.seeds[a*4+2]=v(),f.seeds[a*4+3]=v()}return e.bindBuffer(e.ARRAY_BUFFER,xe),e.bufferData(e.ARRAY_BUFFER,f.seeds,e.STATIC_DRAW),e.bindBuffer(e.ARRAY_BUFFER,oe),e.bufferData(e.ARRAY_BUFFER,f.particles.byteLength,e.DYNAMIC_DRAW),f},Ae=()=>{let t=Y.current,o=W.getBoundingClientRect(),s=Math.max(1,o.width),m=Math.max(1,o.height),v=Math.min(window.devicePixelRatio||1,t.maxRatio,Math.sqrt(Lt/(s*m))),w=Math.max(1,Math.round(s*v)),l=Math.max(1,Math.round(m*v));(E.width!==w||E.height!==l)&&(E.width=w,E.height=l),M.width=s,M.height=m,M.ratio=w/s,d.ready||(d.x=d.tx=s/2,d.y=d.ty=m/2,d.ready=!0),(!R||R.total!==t.count||Math.abs(R.width-s)>.5||Math.abs(R.height-m)>.5)&&(R=Rt(t.count,s,m,R))},Et=(t,o)=>{if(!R)return;let s=M.height/Pe,m=t.ring*s*(1-.38*U),v=Math.max(t.magnet*s,1),w=5/(t.tightness+.1)*s,l=t.waveAmplitude*s*.5,V=2.2+t.follow*80,L=(t.rotation+U*3)*(K?.3:1),X=M.width/2,A=M.height/2,C=v*.18,{homeX:f,homeY:a,band:b,phase:Z,agility:j,delay:Ft,orbit:je,x:Me,y:be,vx:se,vy:ce,particles:le,seeds:Tt,total:Pt}=R;for(let u=0;u<Pt;u++){let Je=1-Tt[u*4]*.12*t.depth,Qe=X+(d.x-X)*Je,et=A+(d.y-A)*Je,tt=f[u],nt=a[u]+Math.sin(z*.7+Z[u])*s*.12*t.waveAmplitude,Re=tt-Qe,Ee=nt-et,Se=Math.sqrt(Re*Re+Ee*Ee),Fe=1-F((Se-(v-C))/(C*2),0,1),ue=Fe*Fe*(3-2*Fe),q=je[u]+L*ue*o;q-=Math.atan2(Math.sin(q),Math.cos(q))*(1-ue)*Math.min(1,o*2.5),je[u]=q;let ot=tt,at=nt;if(ue>0||Math.abs(q)>1e-4){let G=Math.atan2(Ee,Re)+q,_t=l*(.6*Math.sin(G*t.waveCount-z*t.waveSpeed*2)+.4*Math.sin(Z[u]+z*t.waveSpeed*1.3)),ct=Se+(m+_t+b[u]*w-Se)*ue;ot=Qe+Math.cos(G)*ct,at=et+Math.sin(G)*ct}let de=N<Ft[u]*.9?0:V*j[u],rt=1.64*de,it=de*de,st=Math.min(4,Math.max(1,Math.ceil(de*o*2))),fe=o/st;for(let G=0;G<st;G++)se[u]+=((ot-Me[u])*it-se[u]*rt)*fe,ce[u]+=((at-be[u])*it-ce[u]*rt)*fe,Me[u]+=se[u]*fe,be[u]+=ce[u]*fe;le[u*4]=Me[u],le[u*4+1]=be[u],le[u*4+2]=se[u],le[u*4+3]=ce[u]}},St=(t,o)=>{if(!R)return;let s=M.height/Pe,m=Math.max(t.magnet,t.ring)*s*1.8,{x:v,y:w,vx:l,vy:V,agility:L,total:X}=R;for(let A=0;A<X;A++){let C=v[A]-d.x,f=w[A]-d.y,a=Math.sqrt(C*C+f*f)+.001,b=s*110*o*Math.exp(-Math.pow(a/m,2))*L[A];l[A]+=C/a*b,V[A]+=f/a*b}},Ye=t=>{if(O=0,we||!R)return;let o=Y.current;bt(o);let s=F((t-re)/1e3||0,0,1/30);re=Math.max(re,t);let m=K?.3:1;z+=s*m,ke+=s*o.colorSpeed*m,N<3&&(N+=s),U=p.down?Math.min(1,U+s/.9):Math.max(0,U-s*4);let v=performance.now()-p.moved>2e3||!p.inside;o.autoAnimate&&!K&&(v||!o.interactive)?(d.tx=M.width/2+Math.sin(z*.5)*(M.width/4),d.ty=M.height/2+Math.cos(z)*(M.height/4)):o.interactive&&p.inside&&(d.tx=p.x,d.ty=p.y),d.vx+=((d.tx-d.x)*49-d.vx*14)*s,d.vy+=((d.ty-d.y)*49-d.vy*14)*s,d.x+=d.vx*s,d.y+=d.vy*s,Et(o,s);let w=M.height/Pe;e.viewport(0,0,E.width,E.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(ne.program),e.bindVertexArray(ve),e.bindBuffer(e.ARRAY_BUFFER,oe),e.bufferSubData(e.ARRAY_BUFFER,0,R.particles);let l=ne.uniforms;e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,ae),e.uniform1i(l.uPalette,0),e.uniform2f(l.uSize,M.width,M.height),e.uniform1f(l.uPixel,M.ratio),e.uniform2f(l.uCursor,d.x,d.y),e.uniform1f(l.uRing,o.ring*w*(1-.38*U)),e.uniform1f(l.uBand,Math.max(w*6,1)),e.uniform1f(l.uParticle,o.size*w*.6),e.uniform1f(l.uAmbient,o.ambient),e.uniform1f(l.uTime,z),e.uniform1f(l.uPulse,o.pulse),e.uniform1f(l.uVariance,o.variance),e.uniform1f(l.uDepth,o.depth),e.uniform1f(l.uShape,o.shape),e.uniform1f(l.uColorMode,o.colorMode),e.uniform1f(l.uStops,o.palette.length),e.uniform1f(l.uHue,ke),e.uniform1f(l.uReveal,N<3?F(N/.6,0,1):1),e.uniform1f(l.uStreak,w*30),e.uniform1f(l.uCharge,U),e.uniform1f(l.uOpacity,o.opacity),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,R.total),ye&&ge&&(O=requestAnimationFrame(Ye))},$=()=>{O||we||!ye||!ge||(re=performance.now(),O=requestAnimationFrame(Ye))};pe.current=()=>{Ae(),$()};let Ne=t=>{let o=W.getBoundingClientRect();return{x:t.clientX-o.left,y:t.clientY-o.top,inside:t.clientX>=o.left&&t.clientX<=o.right&&t.clientY>=o.top&&t.clientY<=o.bottom}},Ve=t=>{let o=Ne(t);p.inside=o.inside,o.inside&&(p.x=o.x,p.y=o.y,p.moved=performance.now())},qe=t=>{let o=Y.current,s=Ne(t);!s.inside||!o.interactive||(p.x=s.x,p.y=s.y,p.inside=!0,p.moved=performance.now(),o.clickBurst&&!K&&(p.down=!0))},ie=t=>{p.down&&St(Y.current,.45+U),p.down=!1,t.pointerType!=="mouse"&&(p.inside=!1)},Ge=()=>{p.inside=!1,p.down=!1};window.addEventListener("pointermove",Ve,{passive:!0}),window.addEventListener("pointerdown",qe,{passive:!0}),window.addEventListener("pointerup",ie,{passive:!0}),window.addEventListener("pointercancel",ie,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ge);let He=t=>{t.preventDefault(),we=!0,cancelAnimationFrame(O),O=0},We=()=>Mt(t=>t+1);E.addEventListener("webglcontextlost",He),E.addEventListener("webglcontextrestored",We);let Ke=new ResizeObserver(()=>{Ae(),$()});Ke.observe(W);let $e=new IntersectionObserver(t=>{ye=t.some(o=>o.isIntersecting),$()});$e.observe(W);let Ze=()=>{ge=document.visibilityState!=="hidden",$()};return document.addEventListener("visibilitychange",Ze),Ae(),$(),()=>{cancelAnimationFrame(O),pe.current=null,Ke.disconnect(),$e.disconnect(),window.removeEventListener("pointermove",Ve),window.removeEventListener("pointerdown",qe),window.removeEventListener("pointerup",ie),window.removeEventListener("pointercancel",ie),document.documentElement.removeEventListener("pointerleave",Ge),document.removeEventListener("visibilitychange",Ze),E.removeEventListener("webglcontextlost",He),E.removeEventListener("webglcontextrestored",We),e.isContextLost()||(e.deleteBuffer(Oe),e.deleteBuffer(oe),e.deleteBuffer(xe),e.deleteTexture(ae),e.deleteVertexArray(ve),e.deleteProgram(ne.program))}},[De]),(0,_e.jsx)("div",{ref:Ue,className:`antigravity${Le?` ${Le}`:""}`,style:At,children:(0,_e.jsx)("canvas",{ref:Ce,className:"antigravity__canvas","aria-hidden":"true"})})},vt=Nt;function $t(n,i){return ut(vt,n,{colors:["#5227FF","#FF9FFC","#B497CF"],colorMode:"conic",colorSpeed:.05,particleShape:"capsule",count:1500,particleSize:.9,particleVariance:1,magnetRadius:9,ringRadius:7,fieldStrength:10,waveAmplitude:1,waveCount:3,waveSpeed:.4,rotationSpeed:0,pulseSpeed:3,depthFactor:1,ambient:.25,lerpSpeed:.05},i)}export{$t as mountBackground};
