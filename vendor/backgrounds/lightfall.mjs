import{a as se,b as nt,c as Pe,d as _e}from"./shared-SIGNVFDT.mjs";var x=se(nt(),1);var fe=se(Pe(),1),le=8,Fe=4,at=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,it=`#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uZoom;
uniform float uPhase;
uniform float uTwinkleClock;
uniform float uRings;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform int uStreakCount;
uniform int uColumns;
uniform float uWidth;
uniform float uTail;
uniform float uTwinkle;
uniform float uHead;
uniform float uDepth;
uniform vec4 uMouse;
uniform vec3 uLens;
uniform float uLightMode;
uniform float uEncode;
out vec4 outColor;

const vec3 CAMERA = vec3(0.0, -0.8888889, -0.2222222);
const float TAU = 6.28318530718;
const float SPACING = 0.005;
const float REACH = 0.32;

uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float unit(uint x) {
  return float(x & 0xffffu) / 65535.0;
}

float stroke(float d, float w) {
  float s = max(0.75 * w, 0.55);
  return 0.75 * w / s * exp(-0.5 * d * d / (s * s));
}

float orb(float d, float r) {
  float s = max(0.6 * r, 0.7);
  float e = 0.6 * r / s;
  return e * e * exp(-0.5 * d * d / (s * s));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 screen = (2.0 * frag - uView) / uView.x;
  vec2 p = screen;
  mat2 warp = mat2(1.0);
  if (uLens.z > 0.0) {
    vec2 o = p - uLens.xy;
    float e = uLens.z * exp(-dot(o, o) / (REACH * REACH));
    p -= o * e;
    warp = mat2(1.0 - e) + outerProduct(o, o) * (2.0 * e / (REACH * REACH));
  }

  vec3 dir = vec3(p, uZoom);
  vec3 exits = (1.0 - CAMERA * sign(dir)) / max(abs(dir), vec3(1e-6));
  float u = min(exits.x, min(exits.y, exits.z));
  for (int i = 0; i < 5; i++) {
    vec3 h = CAMERA + u * dir;
    vec3 h2 = h * h;
    u -= (dot(h2, h2) - 1.0) / (4.0 * dot(dir, h2 * h));
  }
  vec3 hit = CAMERA + u * dir;
  vec3 normal = hit * hit * hit;
  float facing = dot(normal, dir);
  vec3 stepX = u * (vec3(1.0, 0.0, 0.0) - dir * (normal.x / facing));
  vec3 stepY = u * (vec3(0.0, 1.0, 0.0) - dir * (normal.y / facing));
  float ring = hit.y * hit.y + hit.z * hit.z;
  float theta = atan(hit.z, hit.y);
  mat2 jacobian = mat2(
    stepX.x,
    (hit.y * stepX.z - hit.z * stepX.y) / ring,
    stepY.x,
    (hit.y * stepY.z - hit.z * stepY.y) / ring
  ) * warp * (2.0 / uView.x);

  vec2 gradX = vec2(jacobian[0][0], jacobian[1][0]);
  vec2 gradTheta = vec2(jacobian[0][1], jacobian[1][1]);
  float scale = max(length(gradX), 1e-8);
  float det = max(abs(gradX.x * gradTheta.y - gradX.y * gradTheta.x), 1e-12);
  float along = scale / det;
  float skew = dot(gradX, gradTheta) / det;
  float spacing = SPACING / scale;
  float detail = smoothstep(1.6, 3.2, spacing);
  if (detail <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float halfWidth = min(uWidth / scale, 0.2 * spacing);
  float headRadius = min(2.0 * uWidth / scale, 0.35 * spacing);
  float headReach = 4.0 * max(0.6 * headRadius, 0.7);
  float edge = uColumns > 1 ? 1.0 : 0.5;
  float period = TAU / uRings;
  float fog = exp(-max(u * length(dir) - 0.6, 0.0) * 1.6 * uDepth);

  float boost = 1.0;
  if (uMouse.z > 0.0) {
    vec2 m = screen - uMouse.xy;
    boost += 2.0 * uMouse.z * exp(-dot(m, m) / max(uMouse.w * uMouse.w, 1e-4));
  }

  int count = max(uColorCount, 1);
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 16; layer++) {
    if (layer >= uStreakCount) break;
    float x = hit.x + float(layer) * SPACING / 8.0;
    float nearest = floor(x / SPACING + 0.5);
    float side = x >= nearest * SPACING ? 1.0 : -1.0;
    for (int k = 0; k < 2; k++) {
      if (k >= uColumns) break;
      float column = nearest + side * float(k);
      float across = (x - column * SPACING) / scale;
      uint seed = scramble(uint(int(column) + 65536) + uint(layer) * 0x9e3779b9u);
      uint next = scramble(seed);
      float hue = unit(seed >> 16);
      float delta = theta - uPhase * (1.0 + floor(unit(seed) * 16.0) / 16.0) - unit(next) * period;
      delta -= period * floor(delta / period + 0.5);
      float ahead = delta * along - across * skew;
      if (abs(ahead) > headReach && (delta > 0.0 || -delta * uTail > 3.2)) continue;
      float behind = max(-delta, 0.0);
      float fall = exp(-uTail * behind) * (1.0 - smoothstep(0.5, 0.95, behind / (0.5 * period)));
      fall *= 1.0 - smoothstep(1.2, 3.2, uTail * behind);
      float reach = length(vec2(across, ahead));
      float trail = stroke(ahead > 0.0 ? reach : abs(across), halfWidth * mix(0.4, 1.0, fall)) * fall;
      float glint = orb(reach, headRadius) * mix(3.0, 1.8, uLightMode);
      float weight = mix(1.5, 1.0 + sin(uTwinkleClock + 7.0 * hue + 4.0), uTwinkle);
      weight *= 1.0 - smoothstep(0.72 * edge, edge, abs(across) / spacing);
      vec3 color = uColors[min(int(hue * float(count)), count - 1)];
      vec3 hot = mix(color, vec3(1.0), uHead * (1.0 - uLightMode));
      total += (trail * color + glint * hot) * weight;
    }
  }

  outColor = vec4(total * fog * boost * detail * uEncode, 1.0);
}`,ut=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
uniform float uLimit;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv - uTexel).rgb;
  color += texture(uSource, uv + uTexel).rgb;
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  outColor = vec4(min(color * 0.25, vec3(uLimit)), 1.0);
}`,st=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv).rgb * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135).rgb + texture(uSource, uv - uStep * 1.423135).rgb) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702).rgb + texture(uSource, uv - uStep * 3.326702).rgb) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989).rgb + texture(uSource, uv - uStep * 5.242989).rgb) * 0.018156;
  outColor = vec4(color, 1.0);
}`,lt=`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uDecode;
uniform float uGlow;
uniform float uBloom;
uniform float uPresence;
uniform float uOpacity;
uniform float uFade;
uniform float uLightMode;
uniform vec3 uTopColor;
uniform float uTopGlow;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 light = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb;
  if (uBloom > 0.0) {
    vec3 halo = texture(uBloom0, uv).rgb * 0.42;
    halo += texture(uBloom1, uv).rgb * 0.3;
    halo += texture(uBloom2, uv).rgb * 0.18;
    halo += texture(uBloom3, uv).rgb * 0.1;
    light += halo * uBloom * (uLightMode > 0.5 ? 0.2 : 1.0);
  }
  light *= uDecode * uGlow * uPresence;

  if (uLightMode < 0.5 && uTopGlow > 0.0) {
    float aspect = uView.x / uView.y;
    vec2 q = vec2((uv.x - 0.5) * aspect, 1.04 - uv.y);
    float spread = 0.34 * max(aspect, 0.75);
    float core = exp(-q.x * q.x / (spread * spread) - q.y * q.y / 0.06);
    float halo = exp(-q.x * q.x / (3.6 * spread * spread) - q.y * q.y / 0.18);
    light += uTopColor * uTopGlow * (core * 0.85 + halo * 0.3) * uPresence;
  }

  vec3 lit = max(light, 0.0);
  vec3 mapped = sqrt(1.0 - exp(-1.3 * lit * lit / (lit + 0.025)));
  float peak = max(mapped.r, max(mapped.g, mapped.b));

  float mask = uOpacity;
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    float coverage = clamp(smoothstep(0.0, 0.5, peak) * mask * 0.94 + grain, 0.0, 1.0);
    vec3 chroma = sqrt(clamp(lit / max(max(lit.r, max(lit.g, lit.b)), 1e-6), 0.0, 1.0));
    chroma = pow(chroma, vec3(1.35));
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-4);
    float saturation = 1.0 - min(chroma.r, min(chroma.g, chroma.b));
    chroma = mix(vec3(0.3), chroma, smoothstep(0.08, 0.35, saturation));
    outColor = vec4(chroma * coverage, coverage);
  } else {
    vec3 color = clamp(mapped + grain, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`,ct=2.6,ft=9,ce=Math.PI*2,_=(n,g,v)=>Math.min(v,Math.max(g,n)),De=(n,g,v)=>{let d=n.createShader(g);return d?(n.shaderSource(d,v),n.compileShader(d),n.getShaderParameter(d,n.COMPILE_STATUS)?d:(n.deleteShader(d),null)):null},j=(n,g)=>{let v=De(n,n.VERTEX_SHADER,at),d=De(n,n.FRAGMENT_SHADER,g),c=n.createProgram();if(!v||!d||!c)return null;if(n.attachShader(c,v),n.attachShader(c,d),n.bindAttribLocation(c,0,"aPosition"),n.linkProgram(c),n.deleteShader(v),n.deleteShader(d),!n.getProgramParameter(c,n.LINK_STATUS))return n.deleteProgram(c),null;let O={},$=n.getProgramParameter(c,n.ACTIVE_UNIFORMS);for(let F=0;F<$;F++){let D=n.getActiveUniform(c,F);D&&(O[D.name.replace(/\[0\]$/,"")]=n.getUniformLocation(c,D.name))}return{program:c,uniforms:O}},mt=({colors:n=["#ffffff"],backgroundColor:g="#94a3b8",speed:v=.3,streakCount:d=2,streakWidth:c=.8,streakLength:O=1,glow:$=1,density:F=.6,twinkle:D=.3,zoom:Ge=3,backgroundGlow:Ie=.1,headGlow:Be=.6,depth:Ue=.5,bloom:Ne=.35,opacity:Oe=1,mouseInteraction:We=!0,mouseStrength:Ve=.4,mouseRadius:Ye=.45,mouseDampening:ze=.15,lens:He=.5,holdToWarp:qe=!0,intro:je=!0,fade:$e=0,lightMode:Ze=!1,mixBlendMode:me,paused:Ke=!1,dpr:Je,className:de="",style:Qe})=>{let he=(0,x.useRef)(null),pe=(0,x.useRef)(null),Z=(0,x.useRef)(null),b=(0,x.useRef)(null),[et,tt]=(0,x.useState)(0);return b.current={colors:(Array.isArray(n)&&n.length?n:["#ffffff"]).slice(0,le).map(String),backgroundColor:String(g),speed:v,streakCount:Math.round(_(d,1,16)),streakWidth:Math.max(.05,c),streakLength:Math.max(.05,O),glow:Math.max(0,$),density:F,twinkle:_(D,0,1),zoom:Math.max(.1,Ge),backgroundGlow:Math.max(0,Ie),headGlow:_(Be,0,1),depth:Math.max(0,Ue),bloom:Math.max(0,Ne),opacity:_(Oe,0,1),mouseInteraction:We,mouseStrength:Math.max(0,Ve),mouseRadius:Math.max(.01,Ye),mouseDampening:Math.max(0,ze),lens:_(He,0,1),holdToWarp:qe,intro:je,fade:_($e,0,1),lightMode:Ze,paused:Ke,dpr:Je},(0,x.useEffect)(()=>{let p=he.current,f=pe.current,e=f?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"});if(!p||!f||!e)return;let xe=!!e.getExtension("EXT_color_buffer_float"),K=j(e,it),J=j(e,ut),W=j(e,st),Q=j(e,lt);if(!K||!J||!W||!Q)return;let ge=t=>{t.preventDefault()},ve=()=>tt(t=>t+1);f.addEventListener("webglcontextlost",ge),f.addEventListener("webglcontextrestored",ve);let we=e.createBuffer(),ee=e.createVertexArray();e.bindVertexArray(ee),e.bindBuffer(e.ARRAY_BUFFER,we),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);let ot=xe?e.RGBA16F:e.RGBA8,te=xe?1:.25,oe=()=>({texture:null,framebuffer:e.createFramebuffer(),width:0,height:0}),X=oe(),V=Array.from({length:Fe},()=>[oe(),oe()]),re=(t,o,a)=>{t.texture&&t.width===o&&t.height===a||(t.texture&&e.deleteTexture(t.texture),t.texture=e.createTexture(),t.width=o,t.height=a,e.bindTexture(e.TEXTURE_2D,t.texture),e.texStorage2D(e.TEXTURE_2D,1,ot,o,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0))},G=(t,o)=>(e.bindFramebuffer(e.FRAMEBUFFER,t?t.framebuffer:null),e.viewport(0,0,t?t.width:f.width,t?t.height:f.height),e.useProgram(o.program),o.uniforms),S=(t,o)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,o)},C=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),ne=new Map,rt=t=>{if(ne.has(t))return ne.get(t);let o=[1,1,1];if(C){C.clearRect(0,0,1,1),C.fillStyle="#ffffff",C.fillStyle=t,C.fillRect(0,0,1,1);let[a,m,B]=C.getImageData(0,0,1,1).data;o=[a/255,m/255,B/255]}return ne.set(t,o),o},Ee=t=>rt(t).map(o=>o*o),I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,ae=new Float32Array(le*3),l={x:0,y:0,inside:!1,held:!1},r={travel:0,intro:b.current.intro&&!I?0:1,mouseX:0,mouseY:0,lensX:0,lensY:0,touch:0,warp:0},T=0,y=0,Y=!0,ie=()=>{let t=b.current,o=f.width,a=f.height,m=Math.max(1,p.clientWidth),B=Math.max(1,p.clientHeight);e.bindVertexArray(ee),re(X,o,a),V.forEach((i,s)=>{let E=Math.max(1,Math.round(m/2**(s+1))),A=Math.max(1,Math.round(B/2**(s+1)));re(i[0],E,A),re(i[1],E,A)});let U=r.intro,H=Math.min(1,U*2.2),L=1+5*Math.pow(1-U,2)+2.5*r.warp,R=Math.max(1,Math.floor(ce*Math.max(t.density,.05)+.5)),k=ce/R,N=9+r.travel,P=t.colors.map(Ee);ae.fill(0);for(let i=0;i<le;i++)ae.set(P[Math.min(i,P.length-1)],i*3);let q=i=>(2*i-o)/o,ke=i=>(2*i-a)/o,u=G(X,K);if(e.uniform2f(u.uView,o,a),e.uniform1f(u.uZoom,t.zoom),e.uniform1f(u.uPhase,N%(16*k)),e.uniform1f(u.uTwinkleClock,N%ce),e.uniform1f(u.uRings,R),e.uniform3fv(u.uColors,ae),e.uniform1i(u.uColorCount,P.length),e.uniform1i(u.uStreakCount,t.streakCount),e.uniform1i(u.uColumns,t.streakWidth>1?2:1),e.uniform1f(u.uWidth,5e-4*t.streakWidth),e.uniform1f(u.uTail,19/(t.streakLength*L)),e.uniform1f(u.uTwinkle,t.twinkle),e.uniform1f(u.uHead,t.headGlow),e.uniform1f(u.uDepth,t.depth),e.uniform4f(u.uMouse,q(r.mouseX),ke(r.mouseY),t.mouseInteraction?t.mouseStrength*r.touch:0,t.mouseRadius),e.uniform3f(u.uLens,q(r.lensX),ke(r.lensY),t.mouseInteraction?.5*t.lens*r.touch:0),e.uniform1f(u.uLightMode,t.lightMode?1:0),e.uniform1f(u.uEncode,te),e.drawArrays(e.TRIANGLES,0,3),t.bloom>0){let i=X;V.forEach(([s,E])=>{let A=G(s,J);S(0,i.texture),e.uniform1i(A.uSource,0),e.uniform2f(A.uTarget,s.width,s.height),e.uniform2f(A.uTexel,1/i.width,1/i.height),e.uniform1f(A.uLimit,4*te),e.drawArrays(e.TRIANGLES,0,3);let M=G(E,W);S(0,s.texture),e.uniform1i(M.uSource,0),e.uniform2f(M.uTarget,E.width,E.height),e.uniform2f(M.uStep,1/s.width,0),e.drawArrays(e.TRIANGLES,0,3),M=G(s,W),S(0,E.texture),e.uniform1i(M.uSource,0),e.uniform2f(M.uTarget,s.width,s.height),e.uniform2f(M.uStep,0,1/E.height),e.drawArrays(e.TRIANGLES,0,3),i=s})}let h=G(null,Q);S(0,X.texture),e.uniform1i(h.uScene,0),V.forEach(([i],s)=>{S(s+1,i.texture),e.uniform1i(h[`uBloom${s}`],s+1)}),e.uniform2f(h.uView,o,a),e.uniform1f(h.uDecode,1/te),e.uniform1f(h.uGlow,t.glow),e.uniform1f(h.uBloom,t.bloom),e.uniform1f(h.uPresence,H),e.uniform1f(h.uOpacity,t.opacity),e.uniform1f(h.uFade,t.fade),e.uniform1f(h.uLightMode,t.lightMode?1:0),e.uniform3fv(h.uTopColor,Ee(t.backgroundColor)),e.uniform1f(h.uTopGlow,t.backgroundGlow),e.drawArrays(e.TRIANGLES,0,3);for(let i=Fe;i>=0;i--)S(i,null)},be=t=>{if(T=0,!Y||document.hidden)return;let o=b.current,a=y?Math.min(.05,(t-y)/1e3):1/60;y=t,!o.intro||I?r.intro=1:r.intro<1&&(r.intro=Math.min(1,r.intro+a/ct));let m=o.holdToWarp&&l.held&&l.inside&&!I;r.warp+=((m?1:0)-r.warp)*(1-Math.exp(-a*(m?2.2:1.6)));let B=ft*Math.pow(1-r.intro,2)+6*r.warp,U=!o.paused&&!I;U&&(r.travel+=a*.1*o.speed*(1+B));let H=f.width/Math.max(1,p.clientWidth),L=l.x*H,R=(p.clientHeight-l.y)*H,k=o.mouseInteraction&&l.inside&&!I;k&&r.touch<.01&&(r.mouseX=L,r.mouseY=R,r.lensX=L,r.lensY=R);let N=o.mouseDampening>0?1-Math.exp(-a/o.mouseDampening):1;r.mouseX+=(L-r.mouseX)*N,r.mouseY+=(R-r.mouseY)*N;let P=1-Math.exp(-a*6);r.lensX+=(L-r.lensX)*P,r.lensY+=(R-r.lensY)*P,r.touch+=((k?1:0)-r.touch)*(1-Math.exp(-a*(k?4:2))),ie();let q=r.intro<1||r.warp>.001||Math.abs((k?1:0)-r.touch)>.002;U&&o.speed!==0||q?T=requestAnimationFrame(be):y=0},w=()=>{!T&&Y&&!document.hidden&&(T=requestAnimationFrame(be))},ue=()=>{let t=b.current,o=Math.max(1,p.clientWidth),a=Math.max(1,p.clientHeight),m=Math.min(t.dpr||window.devicePixelRatio||1,2);f.width=Math.max(1,Math.round(o*m)),f.height=Math.max(1,Math.round(a*m)),T||ie(),w()},Te=t=>{let o=p.getBoundingClientRect(),a=t.clientX-o.left,m=t.clientY-o.top;return{x:a,y:m,inside:a>=0&&m>=0&&a<=o.width&&m<=o.height}},Re=t=>{let o=Te(t);l.x=o.x,l.y=o.y,l.inside=o.inside,w()},Ae=t=>{let o=Te(t);o.inside&&(l.x=o.x,l.y=o.y,l.inside=!0,l.held=!0,w())},z=()=>{l.held=!1,w()},Me=()=>{l.inside=!1,l.held=!1,w()},Se=()=>{y=0,w()},Ce=new ResizeObserver(ue);Ce.observe(p);let ye=new IntersectionObserver(t=>{Y=t.some(o=>o.isIntersecting),Y&&(y=0,w())});ye.observe(p),window.addEventListener("pointermove",Re,{passive:!0}),window.addEventListener("pointerdown",Ae,{passive:!0}),window.addEventListener("pointerup",z,{passive:!0}),window.addEventListener("pointercancel",z,{passive:!0}),document.documentElement.addEventListener("pointerleave",Me),document.addEventListener("visibilitychange",Se),ue();let Le=b.current.dpr;return Z.current=()=>{let t=b.current;if(t.dpr!==Le){Le=t.dpr,ue();return}T||ie(),w()},()=>{cancelAnimationFrame(T),Z.current=null,f.removeEventListener("webglcontextlost",ge),f.removeEventListener("webglcontextrestored",ve),Ce.disconnect(),ye.disconnect(),window.removeEventListener("pointermove",Re),window.removeEventListener("pointerdown",Ae),window.removeEventListener("pointerup",z),window.removeEventListener("pointercancel",z),document.documentElement.removeEventListener("pointerleave",Me),document.removeEventListener("visibilitychange",Se),[X,...V.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),[K,J,W,Q].forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(we),e.deleteVertexArray(ee),e.isContextLost()||e.getExtension("WEBGL_lose_context")?.loseContext()}},[et]),(0,x.useEffect)(()=>{Z.current?.()}),(0,fe.jsx)("div",{ref:he,className:`lightfall-container${de?` ${de}`:""}`,style:{...me?{mixBlendMode:me}:null,...Qe},children:(0,fe.jsx)("canvas",{ref:pe,className:"lightfall-canvas","aria-hidden":"true"})})},Xe=mt;function wt(n,g){return _e(Xe,n,{colors:["#ffffff"],backgroundColor:"#94a3b8",speed:.3,streakCount:2,streakWidth:.8,streakLength:1,density:.6,twinkle:.3,glow:1,backgroundGlow:.1,headGlow:.6,depth:.5,bloom:.35,zoom:3},g)}export{wt as mountBackground};
