import{a as j,b as He,c as ve,d as xe}from"./shared-SIGNVFDT.mjs";var E=j(He(),1);var K=j(ve(),1),We=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,k=`#version 300 es
precision highp float;
const float PI = 3.14159265;
const float TAU = 6.28318531;
const float HALF_PI = 1.5707963;
`,Ee=`
uniform vec2 uView;
uniform vec2 uOffset;
uniform float uRotation;
uniform float uFocalLength;
uniform float uTime;
uniform float uSpeed1;
uniform float uSpeed2;
uniform float uDir2;
uniform float uBend1;
uniform float uBend2;
uniform float uThickness;
uniform vec3 uHeat;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uCore;
uniform float uRange;

vec4 traceLight(vec2 pixel) {
  vec2 coord = pixel + uOffset - 0.5 * uView;
  float c = cos(uRotation);
  float sn = sin(uRotation);
  coord = mat2(c, -sn, sn, c) * coord;
  vec3 u = normalize(vec3(coord / uView.y, uFocalLength));
  vec3 o = vec3(0.0, 0.0, -7.0);
  float t = uTime * PI;
  float t1 = t * 0.7;
  float t2 = t * 0.9;
  float tSpeed1 = t * uSpeed1;
  float tSpeed2 = t * uSpeed2 * uDir2;
  float s = 1.0;
  float d = 0.0;
  vec2 k = vec2(0.0);
  for (int i = 0; i < 14; ++i) {
    vec3 p = o + u * d;
    p.x -= 15.0;
    float px = p.x;
    float swell = uHeat.y * exp(-pow((px - uHeat.x) / uHeat.z, 2.0));
    float wob1 = uBend1 + swell * (0.16 + 0.2 * uBend1) + sin(t1 + px * 0.8) * 0.1;
    float wob2 = uBend2 + swell * (0.16 + 0.2 * uBend2) + cos(t2 + px * 1.1) * 0.1;
    vec2 a = sin(vec2(px, px + HALF_PI) + tSpeed1) * wob1;
    vec2 b = cos(vec2(px, px + HALF_PI) + tSpeed2) * wob2;
    float cut = px + uThickness;
    k.x = max(cut, length(p.yz - a) - uThickness);
    k.y = max(cut, length(p.yz - b) - uThickness);
    s = min(s, min(k.x, k.y));
    if (s < 0.001 || d > 300.0) break;
    d += s * 0.7;
  }
  vec3 raw = max(cos(d * TAU) - s * sqrt(d) - vec3(k, 0.0), 0.0);
  float field = max(raw.r, max(raw.g, raw.b));
  raw.gb += 0.1;
  raw = raw * 0.4 + raw.brg * 0.6 + raw * raw;
  float lum = dot(raw, vec3(0.299, 0.587, 0.114));
  float w1 = max(0.0, 1.0 - k.x * 2.0) + 0.0001;
  float w2 = max(0.0, 1.0 - k.y * 2.0) + 0.0001;
  vec3 base = (uColor1 * w1 + uColor2 * w2) / (w1 + w2);
  float soft = smoothstep(0.03, 0.36, field);
  float hot = smoothstep(0.32, 0.8, field);
  vec3 light = base * lum * 2.6 * soft + mix(base, vec3(1.0), 0.55) * hot * uCore * 2.0;
  return vec4(light * uRange, field);
}
`,Ge=`${k}
${Ee}
uniform vec2 uScale;
out vec4 outColor;
void main() {
  outColor = traceLight(gl_FragCoord.xy * uScale);
}`,Ve=`${k}
${Ee}
uniform vec2 uScale;
uniform sampler2D uCoarse;
uniform vec2 uCoarseSize;
uniform vec2 uFineSize;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uFineSize;
  vec2 pos = uv * uCoarseSize - 0.5;
  ivec2 cell = ivec2(floor(pos));
  ivec2 last = ivec2(uCoarseSize) - 1;
  float a = texelFetch(uCoarse, clamp(cell, ivec2(0), last), 0).a;
  float b = texelFetch(uCoarse, clamp(cell + ivec2(1, 0), ivec2(0), last), 0).a;
  float c = texelFetch(uCoarse, clamp(cell + ivec2(0, 1), ivec2(0), last), 0).a;
  float d = texelFetch(uCoarse, clamp(cell + ivec2(1, 1), ivec2(0), last), 0).a;
  float high = max(max(a, b), max(c, d));
  float low = min(min(a, b), min(c, d));
  if (high > 0.02 && low < 0.4) outColor = traceLight(gl_FragCoord.xy * uScale);
  else outColor = texture(uCoarse, uv);
}`,ze=`${k}
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 sum = texture(uSource, uv) * 4.0;
  sum += texture(uSource, uv - uTexel);
  sum += texture(uSource, uv + uTexel);
  sum += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  sum += texture(uSource, uv - vec2(uTexel.x, -uTexel.y));
  outColor = sum / 8.0;
}`,Ne=`${k}
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform vec2 uTarget;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec2 h = uTexel * 0.5;
  vec4 sum = texture(uSource, uv + vec2(-h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(h.x * 2.0, 0.0));
  sum += texture(uSource, uv + vec2(0.0, -h.y * 2.0));
  sum += texture(uSource, uv + vec2(0.0, h.y * 2.0));
  sum += texture(uSource, uv + vec2(-h.x, h.y)) * 2.0;
  sum += texture(uSource, uv + h) * 2.0;
  sum += texture(uSource, uv + vec2(h.x, -h.y)) * 2.0;
  sum += texture(uSource, uv - h) * 2.0;
  outColor = sum / 12.0 + texture(uBase, uv);
}`,qe=`${k}
uniform sampler2D uLight;
uniform sampler2D uBloom;
uniform vec2 uResolution;
uniform float uExposure;
uniform float uGlow;
uniform float uCore;
uniform float uPresence;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
uniform float uTime;
uniform float uLightMode;
uniform vec3 uLens;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float smootherstep(float edge, float x) {
  float t = clamp(x / max(edge, 0.0001), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 offset = gl_FragCoord.xy - uLens.xy;
  float lens = uLens.z * exp(-dot(offset, offset) / (uResolution.y * uResolution.y * 0.045));
  vec4 source = texture(uLight, uv);
  vec3 hdr = source.rgb * uExposure * uPresence * (1.0 + lens * 0.35);
  hdr += texture(uBloom, uv).rgb * uExposure * uPresence * uGlow * (0.18 + lens * 0.08);
  float edge = uFade * 0.5;
  float mask = smootherstep(edge, uv.x) * smootherstep(edge, 1.0 - uv.x) * smootherstep(edge, uv.y) * smootherstep(edge, 1.0 - uv.y);
  float grain = (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  float peak = max(hdr.r, max(hdr.g, hdr.b));
  if (uLightMode > 0.5) {
    vec3 hue = hdr / max(peak, 0.0001);
    float tone = dot(hue, vec3(0.2126, 0.7152, 0.0722));
    vec3 ink = pow(clamp(hue * min(1.0, 0.6 / max(tone, 0.001)), 0.0, 1.0), vec3(1.0 / 2.2));
    float feather = max(fwidth(source.a) * 1.25, 0.02);
    float body = smoothstep(0.15 - feather, 0.15 + feather, source.a) * uPresence;
    vec3 color = mix(ink, vec3(1.0), smoothstep(12.0, 26.0, peak) * uCore);
    float halo = (1.0 - exp(-peak * 0.5)) * 0.3 * min(uGlow, 1.5);
    float alpha = clamp(body * 0.92 + (1.0 - body) * halo, 0.0, 1.0) * mask * uOpacity;
    color = mix(ink, color, body);
    outColor = vec4(clamp(color + grain, 0.0, 1.0) * alpha, alpha);
  } else {
    vec3 mapped = 1.0 - exp(-hdr);
    float level = max(mapped.r, max(mapped.g, mapped.b));
    mapped = clamp(mapped + grain * level, 0.0, 1.0) * mask * uOpacity;
    outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
  }
}`,F=4,ge=3,$e=1.8,we=24e5,O=(i,x,g)=>Math.min(g,Math.max(x,i)),Te=(i,x,g)=>{let d=i.createShader(x);return d?(i.shaderSource(d,g),i.compileShader(d),i.getShaderParameter(d,i.COMPILE_STATUS)?d:(i.deleteShader(d),null)):null},B=(i,x)=>{let g=Te(i,i.VERTEX_SHADER,We),d=Te(i,i.FRAGMENT_SHADER,x),m=i.createProgram();if(!g||!d||!m)return null;if(i.attachShader(m,g),i.attachShader(m,d),i.bindAttribLocation(m,0,"aPosition"),i.linkProgram(m),i.deleteShader(g),i.deleteShader(d),!i.getProgramParameter(m,i.LINK_STATUS))return i.deleteProgram(m),null;let I={},z=i.getProgramParameter(m,i.ACTIVE_UNIFORMS);for(let _=0;_<z;_++){let L=i.getActiveUniform(m,_);L&&(I[L.name]=i.getUniformLocation(m,L.name))}return{program:m,uniforms:I}};function J({colors:i=["#A855F7","#06B6D4"],speed:x=1,speed1:g=.05,speed2:d=.05,dir2:m=1,bend1:I=1,bend2:z=.5,thickness:_=.3,focalLength:L=1.25,rotationDeg:be=0,xOffset:ye=0,yOffset:Re=0,brightness:Se=1,glow:Ae=1,core:Ce=.6,grain:Me=.03,quality:Fe=1,mouseInteraction:_e=!0,intro:Le=!0,fade:Pe=0,opacity:De=1,lightMode:Oe=!1,paused:Be=!1,dpr:ke,className:Z="",...Ie}){let ee=(0,E.useRef)(null),te=(0,E.useRef)(null),N=(0,E.useRef)(null),oe={color1:String(i?.[0]??"#A855F7"),color2:String(i?.[1]??i?.[0]??"#06B6D4"),speed:x,speed1:g,speed2:d,dir2:m,bend1:I,bend2:z,thickness:Math.max(.02,_),focalLength:Math.max(.05,L),rotation:be*Math.PI/180,xOffset:ye,yOffset:Re,brightness:Math.max(0,Se),glow:Math.max(0,Ae),core:O(Ce,0,1),grain:Math.max(0,Me),quality:O(Fe,.25,1),mouseInteraction:_e,intro:Le,fade:O(Pe,0,1),opacity:O(De,0,1),lightMode:Oe,paused:Be,dpr:ke},w=(0,E.useRef)(oe);return w.current=oe,(0,E.useEffect)(()=>{let y=ee.current,v=te.current,e=v?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!y||!v||!e)return;let re=!!e.getExtension("EXT_color_buffer_float"),ne=re?1:.25,s={coarse:B(e,Ge),fine:B(e,Ve),down:B(e,ze),up:B(e,Ne),composite:B(e,qe)};if(Object.values(s).some(t=>!t))return;let ae=e.createBuffer(),q=e.createVertexArray();e.bindVertexArray(q),e.bindBuffer(e.ARRAY_BUFFER,ae),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let U=()=>({texture:e.createTexture(),framebuffer:e.createFramebuffer(),width:0,height:0}),X=(t,o,n)=>{t.width===o&&t.height===n||(t.width=o,t.height=n,e.bindTexture(e.TEXTURE_2D,t.texture),re?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,o,n,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,o,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},H=U(),P=U(),R=Array.from({length:F+1},U),W=Array.from({length:F},U),S=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),G=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,$=new Map,ie=t=>{if($.has(t))return $.get(t);let o=[1,1,1];if(S){S.clearRect(0,0,1,1),S.fillStyle="#000000",S.fillStyle=t,S.fillRect(0,0,1,1);let[n,a,c]=S.getImageData(0,0,1,1).data;o=[n,a,c].map(f=>Math.pow(f/255,2.2))}return $.set(t,o),o},r={width:1,height:1,fineWidth:1,fineHeight:1,coarseWidth:1,coarseHeight:1},h={x:0,y:0,inside:!1},u={time:0,intro:w.current.intro&&!G?0:1,heat:0,heatVelocity:0,heatX:0,lensX:0,lensY:0},b=0,A=0,V=!0,D=(t,o,n,a)=>{e.bindFramebuffer(e.FRAMEBUFFER,o?o.framebuffer:null),e.viewport(0,0,n,a),e.useProgram(t.program),e.drawArrays(e.TRIANGLES,0,3)},C=(t,o,n,a)=>{e.activeTexture(e.TEXTURE0+n),e.bindTexture(e.TEXTURE_2D,a),e.uniform1i(t.uniforms[o],n)},ue=(t,o,n)=>{let a=t.uniforms;e.useProgram(t.program),e.uniform2f(a.uView,r.width,r.height),e.uniform2f(a.uOffset,o.xOffset,o.yOffset),e.uniform1f(a.uRotation,o.rotation),e.uniform1f(a.uFocalLength,o.focalLength),e.uniform1f(a.uTime,u.time),e.uniform1f(a.uSpeed1,o.speed1),e.uniform1f(a.uSpeed2,o.speed2),e.uniform1f(a.uDir2,o.dir2),e.uniform1f(a.uBend1,o.bend1*(.3+.7*n)),e.uniform1f(a.uBend2,o.bend2*(.3+.7*n)),e.uniform1f(a.uThickness,o.thickness),e.uniform3f(a.uHeat,u.heatX,u.heat,1.4),e.uniform3fv(a.uColor1,ie(o.color1)),e.uniform3fv(a.uColor2,ie(o.color2)),e.uniform1f(a.uCore,o.core),e.uniform1f(a.uRange,ne)},Y=()=>{let t=w.current,o=u.intro*u.intro*(3-2*u.intro);e.bindVertexArray(q),X(H,r.coarseWidth,r.coarseHeight),X(P,r.fineWidth,r.fineHeight),ue(s.coarse,t,o),e.uniform2f(s.coarse.uniforms.uScale,r.width/r.coarseWidth,r.height/r.coarseHeight),D(s.coarse,H,r.coarseWidth,r.coarseHeight);let n=s.fine;ue(n,t,o),e.uniform2f(n.uniforms.uScale,r.width/r.fineWidth,r.height/r.fineHeight),e.uniform2f(n.uniforms.uCoarseSize,r.coarseWidth,r.coarseHeight),e.uniform2f(n.uniforms.uFineSize,r.fineWidth,r.fineHeight),C(n,"uCoarse",0,H.texture),D(n,P,r.fineWidth,r.fineHeight);let a=P;for(let l=0;l<=F;l++){let p=R[l],T=l===0?Math.round(r.width/2):a.width>>1,Xe=l===0?Math.round(r.height/2):a.height>>1;X(p,Math.max(1,T),Math.max(1,Xe)),e.useProgram(s.down.program),e.uniform2f(s.down.uniforms.uTexel,1/a.width,1/a.height),e.uniform2f(s.down.uniforms.uTarget,p.width,p.height),C(s.down,"uSource",0,a.texture),D(s.down,p,p.width,p.height),a=p}for(let l=F-1;l>=1;l--){let p=l===F-1?R[F]:W[l+1],T=W[l];X(T,R[l].width,R[l].height),e.useProgram(s.up.program),e.uniform2f(s.up.uniforms.uTexel,1/p.width,1/p.height),e.uniform2f(s.up.uniforms.uTarget,T.width,T.height),C(s.up,"uSource",0,p.texture),C(s.up,"uBase",1,R[l].texture),D(s.up,T,T.width,T.height)}let c=s.composite,f=c.uniforms;e.useProgram(c.program),e.uniform2f(f.uResolution,v.width,v.height),e.uniform1f(f.uExposure,2.4*t.brightness/ne),e.uniform1f(f.uGlow,t.glow),e.uniform1f(f.uCore,t.core),e.uniform1f(f.uPresence,o*o),e.uniform1f(f.uGrain,t.grain),e.uniform1f(f.uFade,t.fade),e.uniform1f(f.uOpacity,t.opacity),e.uniform1f(f.uTime,u.time),e.uniform1f(f.uLightMode,t.lightMode?1:0),e.uniform3f(f.uLens,u.lensX*v.width/r.width,(r.height-u.lensY)*v.height/r.height,u.heat),C(c,"uLight",0,P.texture),C(c,"uBloom",1,W[1].texture),D(c,null,v.width,v.height)},Ue=t=>{if(!(t.mouseInteraction&&h.inside)||G)return null;let o=h.x+t.xOffset-r.width/2,n=r.height-h.y+t.yOffset-r.height/2,a=Math.cos(t.rotation),c=Math.sin(t.rotation);return 7*(a*o+c*n)/r.height/t.focalLength-15},ce=t=>{if(b=0,!V||document.hidden)return;let o=w.current,n=A?Math.min(.05,(t-A)/1e3):1/60;A=t;let a=!o.paused&&!G;a&&(u.time+=n*o.speed),!o.intro||G?u.intro=1:u.intro<1&&(u.intro=Math.min(1,u.intro+n/$e));let c=Ue(o);c!==null&&(u.heatX+=(c-u.heatX)*(1-Math.exp(-n*6))),u.heatVelocity+=(120*((c===null?0:1)-u.heat)-19*u.heatVelocity)*n,u.heat=O(u.heat+u.heatVelocity*n,0,1.15),u.lensX+=(h.x-u.lensX)*(1-Math.exp(-n*8)),u.lensY+=(h.y-u.lensY)*(1-Math.exp(-n*8)),Y();let f=u.intro<1||u.heat>.001||Math.abs(u.heatVelocity)>.001;a||f?b=requestAnimationFrame(ce):A=0},M=()=>{!b&&V&&!document.hidden&&(b=requestAnimationFrame(ce))},Q=()=>{let t=w.current,o=Math.max(1,y.clientWidth),n=Math.max(1,y.clientHeight),a=Math.min(t.dpr||window.devicePixelRatio||1,2);r.width=o,r.height=n,v.width=Math.max(1,Math.round(o*a)),v.height=Math.max(1,Math.round(n*a));let c=t.quality;o*n*c*c>we&&(c=Math.sqrt(we/(o*n))),r.fineWidth=Math.max(1,Math.round(o*c)),r.fineHeight=Math.max(1,Math.round(n*c)),r.coarseWidth=Math.max(1,Math.round(r.fineWidth/ge)),r.coarseHeight=Math.max(1,Math.round(r.fineHeight/ge)),b||Y(),M()},se=t=>{let o=y.getBoundingClientRect();h.x=t.clientX-o.left,h.y=t.clientY-o.top,h.inside=h.x>=0&&h.y>=0&&h.x<=o.width&&h.y<=o.height,M()},fe=()=>{h.inside=!1,M()},le=()=>{A=0,M()},me=new ResizeObserver(Q);me.observe(y);let he=new IntersectionObserver(t=>{V=t.some(o=>o.isIntersecting),V&&(A=0,M())});he.observe(y),window.addEventListener("pointermove",se,{passive:!0}),document.documentElement.addEventListener("pointerleave",fe),document.addEventListener("visibilitychange",le),Q();let de=w.current.quality,pe=w.current.dpr;return N.current=()=>{let t=w.current;if(t.quality!==de||t.dpr!==pe){de=t.quality,pe=t.dpr,Q();return}b||Y(),M()},()=>{cancelAnimationFrame(b),N.current=null,me.disconnect(),he.disconnect(),window.removeEventListener("pointermove",se),document.documentElement.removeEventListener("pointerleave",fe),document.removeEventListener("visibilitychange",le);for(let t of[H,P,...R,...W])e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer);for(let t of Object.values(s))e.deleteProgram(t.program);e.deleteBuffer(ae),e.deleteVertexArray(q),e.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,E.useEffect)(()=>{N.current?.()}),(0,K.jsx)("div",{ref:ee,className:`plasma-wave-container${Z?` ${Z}`:""}`,...Ie,children:(0,K.jsx)("canvas",{ref:te,className:"plasma-wave-canvas","aria-hidden":"true"})})}function et(i,x){return xe(J,i,{colors:["#A855F7","#06B6D4"],speed:1,speed1:.05,speed2:.05,dir2:1,bend1:1,bend2:.5,thickness:.3,glow:1,focalLength:1.25,rotationDeg:0,brightness:1,core:.6,grain:.03,fade:0,opacity:1,quality:1,mouseInteraction:!0,intro:!0,lightMode:!1},x)}export{et as mountBackground};
