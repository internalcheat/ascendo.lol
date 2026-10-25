import{a as G,b as Ie,c as fe,d as ue}from"./shared-SIGNVFDT.mjs";var p=G(Ie(),1);var U=G(fe(),1),Te=24e5,k=4,We=`#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`,Fe=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform float uLines;
uniform float uWidth;
uniform float uGlow;
uniform float uBrightness;
uniform float uHighlight;
uniform float uHighlightWidth;
uniform float uWarp;
uniform float uScale;
uniform float uRotation;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uCycle;
uniform float uEdge;
uniform vec4 uMouse;
uniform vec4 uRipples[${k}];
uniform float uReveal;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float bend(vec2 p, float t) {
  vec2 q = p * 2.0 / uScale;
  float w = 0.6 * sin(q.x * 0.55 + t * 0.4 + 0.6 * sin(q.y * 0.9 - t * 0.28));
  w += 0.21 * sin(q.x * 1.3 - t * 0.33 + q.y * 0.8 + 1.3);
  w += 0.12 * sin(q.y * 2.3 + q.x * 0.9 - t * 0.37 + 0.4);
  return w * uWarp * uScale * 0.46;
}

float river(vec2 p, float y, float t) {
  float drift = 0.7 * (0.18 * sin(p.x * 1.6 - t * 0.33 + 0.7) + 0.1 * sin(p.x * 3.1 + t * 0.21));
  float center = 0.5 * (0.2 * sin(t * 0.17) + 0.08 * sin(t * 0.29 + 1.3));
  float width = 0.13 * uHighlightWidth;
  float near = (y - center - drift) / width;
  float far = (y + 0.22 * sin(t * 0.13 + 2.0) - drift * 0.6 + 0.3) / (width * 0.55);
  return max(exp(-near * near), exp(-far * far) * 0.7);
}

vec3 palette(float x) {
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(uColor1, uColor2, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(uColor2, uColor3, smoothstep(1.0, 2.0, x));
  return mix(uColor3, uColor1, smoothstep(2.0, 3.0, x));
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = rotate((gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y, uRotation);
  float t = uTime;

  vec2 mouse = rotate(uMouse.xy, uRotation);
  vec2 toMouse = p - mouse;
  float lens = exp(-dot(toMouse, toMouse) / (uMouse.w * uMouse.w));
  p.y -= (p.y - mouse.y) * lens * uMouse.z;

  float ring = 0.0;
  for (int i = 0; i < ${k}; i++) {
    vec4 ripple = uRipples[i];
    if (ripple.w <= 0.0) continue;
    float x = (length(p - rotate(ripple.xy, uRotation)) - ripple.z * 0.6) / 0.08;
    float fade = exp(-ripple.z * 1.3) * smoothstep(0.0, 0.12, ripple.z);
    float bump = exp(-x * x);
    p.y -= x * bump * 0.07 * fade;
    ring += bump * fade;
  }

  float w = bend(p, t);
  float y = p.y + w;
  float phi = y * uLines;
  float fw = max(fwidth(phi), 1e-5);
  float crowd = smoothstep(0.18, 0.5, fw);

  float fold = smoothstep(1.3, 2.2, fw * uResolution.y / uLines);
  float shimmer = mix(1.0, smoothstep(0.15, 0.85, noise(vec2(y * 1.6 + t * 0.07, p.x * 0.55 - t * 0.22))), 0.5);
  float lit = max(river(p, y, t), fold * 0.9) * shimmer;
  float light = mix(1.0, 0.07 + 0.93 * lit, uHighlight);
  light += (1.0 - light) * min(lens * step(0.0001, uMouse.z) * 0.9 + ring * 0.6, 1.0);

  float dist = abs(fract(phi + 0.5) - 0.5) / fw;
  float width = uWidth * uPixel * (1.0 + mix(1.5, 0.6, uLight) * lit * uHighlight);
  float cover = clamp(min(dist + width * 0.5, 0.5) - max(dist - width * 0.5, -0.5), 0.0, 1.0);
  cover = mix(cover, min(width * fw, 1.0), crowd);
  float halo = exp(-dist / (2.2 * uPixel)) * (1.0 - crowd) * uGlow;
  float thread = mix(1.0, 0.55 + 0.45 * hash(vec2(floor(phi + 0.5), 7.3)), 0.45 * (1.0 - crowd));

  float span = 0.5 * sqrt(aspect * aspect + 1.0);
  float sweep = -span + (2.0 * span + 0.6) * uReveal;
  float reveal = 1.0 - smoothstep(sweep - 0.6, sweep, p.x);

  float edge = 1.0;
  if (uEdge > 0.0) {
    float ex = min(uv.x, 1.0 - uv.x) * aspect;
    float ey = min(uv.y, 1.0 - uv.y);
    edge = smootherstep(0.0, uEdge * 0.5, ex) * smootherstep(0.0, uEdge * 0.5, ey);
  }

  vec3 tint = palette(y * 0.3 + p.x * 0.2 + uCycle);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLight > 0.5) {
    float low = min(tint.r, min(tint.g, tint.b));
    float chroma = max(tint.r, max(tint.g, tint.b)) - low;
    vec3 hue = (tint - low) / max(chroma, 1e-3);
    vec3 ink = mix(vec3(0.08), hue * 0.56 + 0.06, smoothstep(0.04, 0.2, chroma));
    float alpha = (cover + halo * 0.35) * thread * light * uBrightness * reveal * edge * 0.78 * uOpacity;
    alpha = clamp(alpha + grain, 0.0, 1.0);
    fragColor = vec4(ink * alpha, alpha);
    return;
  }

  float strength = (cover + halo) * thread * light * uBrightness * reveal * edge;
  vec3 color = clamp(tint * strength * uOpacity, 0.0, 1.0);
  float alpha = max(color.r, max(color.g, color.b));
  color = clamp(color + grain, 0.0, 1.0);
  fragColor = vec4(min(color, vec3(alpha)), alpha);
}`,h=(t,a,s)=>Math.min(s,Math.max(a,t)),D=t=>{let a=String(t||"").trim(),s=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(a);if(s){let v=s[1].length===3?s[1].replace(/./g,d=>d+d):s[1];return[0,2,4].map(d=>parseInt(v.slice(d,d+2),16)/255)}let i=/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(a);return i?[i[1],i[2],i[3]].map(v=>h(parseFloat(v)/255,0,1)):[1,1,1]},he=(t,a,s)=>{let i=t.createShader(a);return i?(t.shaderSource(i,s),t.compileShader(i),t.getShaderParameter(i,t.COMPILE_STATUS)?i:(console.error(t.getShaderInfoLog(i)),t.deleteShader(i),null)):null},ke=t=>{let a=he(t,t.VERTEX_SHADER,We),s=he(t,t.FRAGMENT_SHADER,Fe),i=a&&s?t.createProgram():null;if(!a||!s||!i)return a&&t.deleteShader(a),s&&t.deleteShader(s),null;if(t.attachShader(i,a),t.attachShader(i,s),t.linkProgram(i),t.deleteShader(a),t.deleteShader(s),!t.getProgramParameter(i,t.LINK_STATUS))return console.error(t.getProgramInfoLog(i)),t.deleteProgram(i),null;let v={},d=t.getProgramParameter(i,t.ACTIVE_UNIFORMS);for(let S=0;S<d;S++){let C=t.getActiveUniform(i,S);C&&(v[C.name.replace(/\[0\]$/,"")]=t.getUniformLocation(i,C.name))}return{program:i,uniforms:v}},qe=({color1:t="#ffffff",color2:a="#ffffff",color3:s="#ffffff",colorCycleSpeed:i=1,speed:v=.3,lineCount:d=72,lineWidth:S=1.3,glow:C=.6,brightness:pe=1,highlight:de=1,highlightWidth:ge=1,warpIntensity:ve=1,warpScale:xe=1,rotation:we=-33,edgeFade:ye=0,enableMouseInteraction:Re=!0,mouseInfluence:Ee=2,clickRipple:be=!0,intro:Me=!0,lightMode:Le=!1,opacity:Se=1,maxDevicePixelRatio:Ce=2,className:X="",style:Pe})=>{let N=(0,p.useRef)(null),$=(0,p.useRef)(null),q=(0,p.useRef)(null),[Y,Ae]=(0,p.useState)(0),K={color1:D(t),color2:D(a),color3:D(s),cycleSpeed:i,speed:Math.max(0,v),lines:h(d,2,400),width:h(S,.25,12),glow:Math.max(0,C),brightness:Math.max(0,pe),highlight:h(de,0,1),highlightWidth:h(ge,.2,5),warp:h(ve,0,3),scale:h(xe,.2,4),rotation:we*Math.PI/180,edge:h(ye,0,1),mouse:Re,influence:h(Ee,0,3),clickRipple:be,intro:Me,light:Le,opacity:h(Se,0,1),maxRatio:h(Ce,.5,3)},P=(0,p.useRef)(K);return P.current=K,(0,p.useEffect)(()=>{q.current?.()}),(0,p.useEffect)(()=>{let A=N.current,f=$.current;if(!A||!f)return;let o=f.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance"}),T=o?ke(o):null;if(!o||!T)return;let _=window.matchMedia("(prefers-reduced-motion: reduce)").matches,J=o.createVertexArray(),x={width:1,height:1,ratio:1},y={x:0,y:0,inside:!1},l={x:0,y:0,presence:0,ready:!1},g=[],M=new Float32Array(k*4),Q=Math.random()*60,Z=0,I=P.current.intro&&!_&&Y===0?0:1,R=0,W=0,H=!0,z=document.visibilityState!=="hidden",B=!1,O=()=>{let r=P.current,e=A.getBoundingClientRect(),c=Math.max(1,e.width),m=Math.max(1,e.height),E=Math.min(window.devicePixelRatio||1,r.maxRatio,Math.sqrt(Te/(c*m))),L=Math.max(1,Math.round(c*E)),n=Math.max(1,Math.round(m*E));(f.width!==L||f.height!==n)&&(f.width=L,f.height=n),x.width=c,x.height=m,x.ratio=L/c},j=(r,e)=>[(r-x.width/2)/x.height,(x.height/2-e)/x.height],ee=r=>{if(R=0,B)return;let e=P.current,c=h((r-W)/1e3||0,0,.05);W=Math.max(W,r),Q+=c*e.speed*2.5*(_?.25:1),Z+=c*e.speed*e.cycleSpeed*.05,I<1&&(I=Math.min(1,I+c/1.8));let m=e.mouse&&y.inside&&!_;if(m){let[u,b]=j(y.x,y.y);l.ready||(l.x=u,l.y=b,l.ready=!0);let ce=1-Math.exp(-c*10);l.x+=(u-l.x)*ce,l.y+=(b-l.y)*ce}let E=m?1:0;l.presence+=(E-l.presence)*(1-Math.exp(-c*5)),l.presence<.002&&!m&&(l.ready=!1);for(let u=g.length-1;u>=0;u--)g[u].age+=c,g[u].age>2.6&&g.splice(u,1);M.fill(0),g.forEach((u,b)=>{M[b*4]=u.x,M[b*4+1]=u.y,M[b*4+2]=u.age,M[b*4+3]=1});let L=1-Math.pow(1-I,3);o.viewport(0,0,f.width,f.height),o.useProgram(T.program),o.bindVertexArray(J);let n=T.uniforms;o.uniform2f(n.uResolution,f.width,f.height),o.uniform1f(n.uPixel,x.ratio),o.uniform1f(n.uTime,Q),o.uniform1f(n.uLines,e.lines),o.uniform1f(n.uWidth,e.width),o.uniform1f(n.uGlow,e.glow),o.uniform1f(n.uBrightness,e.brightness),o.uniform1f(n.uHighlight,e.highlight),o.uniform1f(n.uHighlightWidth,e.highlightWidth),o.uniform1f(n.uWarp,e.warp*(.25+.75*L)),o.uniform1f(n.uScale,e.scale),o.uniform1f(n.uRotation,e.rotation),o.uniform3f(n.uColor1,e.color1[0],e.color1[1],e.color1[2]),o.uniform3f(n.uColor2,e.color2[0],e.color2[1],e.color2[2]),o.uniform3f(n.uColor3,e.color3[0],e.color3[1],e.color3[2]),o.uniform1f(n.uCycle,Z),o.uniform1f(n.uEdge,e.edge),o.uniform4f(n.uMouse,l.x,l.y,l.presence*e.influence*.16,.2),o.uniform4fv(n.uRipples,M),o.uniform1f(n.uReveal,L),o.uniform1f(n.uLight,e.light?1:0),o.uniform1f(n.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3);let _e=Math.abs(E-l.presence)>.002;(e.speed>0&&!_||I<1||_e||g.length>0||m)&&H&&z&&(R=requestAnimationFrame(ee))},w=()=>{R||B||!H||!z||(W=performance.now(),R=requestAnimationFrame(ee))};q.current=()=>{O(),w()};let te=r=>{let e=A.getBoundingClientRect();return{x:r.clientX-e.left,y:r.clientY-e.top,inside:r.clientX>=e.left&&r.clientX<=e.right&&r.clientY>=e.top&&r.clientY<=e.bottom}},oe=r=>{let e=te(r);y.x=e.x,y.y=e.y,y.inside=e.inside,w()},ie=r=>{let e=P.current,c=te(r);if(!c.inside||!e.clickRipple||_)return;let[m,E]=j(c.x,c.y);g.push({x:m,y:E,age:0}),g.length>k&&g.shift(),w()},V=()=>{y.inside=!1,w()},F=r=>{r.pointerType!=="mouse"&&V()};window.addEventListener("pointermove",oe,{passive:!0}),window.addEventListener("pointerdown",ie,{passive:!0}),window.addEventListener("pointerup",F,{passive:!0}),window.addEventListener("pointercancel",F,{passive:!0}),document.documentElement.addEventListener("pointerleave",V);let re=r=>{r.preventDefault(),B=!0,cancelAnimationFrame(R),R=0},ne=()=>Ae(r=>r+1);f.addEventListener("webglcontextlost",re),f.addEventListener("webglcontextrestored",ne);let ae=new ResizeObserver(()=>{O(),w()});ae.observe(A);let se=new IntersectionObserver(r=>{H=r.some(e=>e.isIntersecting),w()});se.observe(A);let le=()=>{z=document.visibilityState!=="hidden",w()};return document.addEventListener("visibilitychange",le),O(),w(),()=>{cancelAnimationFrame(R),q.current=null,ae.disconnect(),se.disconnect(),window.removeEventListener("pointermove",oe),window.removeEventListener("pointerdown",ie),window.removeEventListener("pointerup",F),window.removeEventListener("pointercancel",F),document.documentElement.removeEventListener("pointerleave",V),document.removeEventListener("visibilitychange",le),f.removeEventListener("webglcontextlost",re),f.removeEventListener("webglcontextrestored",ne),o.isContextLost()||(o.deleteVertexArray(J),o.deleteProgram(T.program))}},[Y]),(0,U.jsx)("div",{ref:N,className:`line-waves${X?` ${X}`:""}`,style:Pe,children:(0,U.jsx)("canvas",{ref:$,className:"line-waves__canvas","aria-hidden":"true"})})},me=qe;function Ue(t,a){return ue(me,t,{color1:"#ffffff",color2:"#ffffff",color3:"#ffffff",colorCycleSpeed:1,speed:.3,lineCount:72,lineWidth:1.3,glow:.6,brightness:1,highlight:1,highlightWidth:1,warpIntensity:1,warpScale:1,rotation:-33},a)}export{Ue as mountBackground};
