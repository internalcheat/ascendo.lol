import{a as Wt,b as Ke,c as ve,d as pe}from"./shared-SIGNVFDT.mjs";var rt=Wt(Ke(),1),Xt=Wt(ve(),1),we=50,lt=20,Ot=1.5,ft=16,Mt=12,ye=.01,Me={satin:{roughness:.42,metalness:0,coat:.35,coatRoughness:.22,scatter:1,frost:0},matte:{roughness:.92,metalness:0,coat:0,coatRoughness:.5,scatter:.5,frost:0},gloss:{roughness:.2,metalness:0,coat:1,coatRoughness:.08,scatter:1,frost:0},frosted:{roughness:.55,metalness:0,coat:.6,coatRoughness:.18,scatter:1.5,frost:1},metal:{roughness:.3,metalness:1,coat:0,coatRoughness:.2,scatter:0,frost:0}},Qe=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aSphere;
layout(location = 2) in vec4 aColor;
layout(location = 3) in vec4 aShade;
uniform mat4 uProj;
uniform float uCameraZ;
uniform float uPixel;
out vec3 vPoint;
flat out vec3 vCenter;
flat out float vRadius;
flat out vec4 vColor;
flat out vec4 vShade;
void main() {
  vec3 c = vec3(aSphere.xy, aSphere.z - uCameraZ);
  float r = aSphere.w;
  float d = length(c);
  vec3 toCamera = -c / d;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
  vec3 up = cross(toCamera, right);
  float reach = r * d / sqrt(max(d * d - r * r, 1e-4)) + uPixel * d * 2.0;
  vec3 p = c + (right * aCorner.x + up * aCorner.y) * reach;
  vPoint = p;
  vCenter = c;
  vRadius = r;
  vColor = aColor;
  vShade = aShade;
  gl_Position = uProj * vec4(p, 1.0);
}`,Je=`#version 300 es
precision highp float;
in vec3 vPoint;
flat in vec3 vCenter;
flat in float vRadius;
flat in vec4 vColor;
flat in vec4 vShade;
uniform mat4 uProj;
uniform vec3 uLightPos;
uniform vec3 uLight;
uniform float uExposure;
uniform float uShadow;
uniform vec4 uSurface;
uniform vec2 uExtra;
out vec4 outColor;

const float PI = 3.14159265;

float lobe(vec3 d, vec3 axis, float sharp) {
  return pow(max(dot(d, axis), 0.0), sharp) * (sharp + 1.0) * 0.16;
}

vec3 studio(vec3 d, float rough) {
  float r = clamp(rough, 0.0, 1.0);
  float sharp = mix(60.0, 1.2, sqrt(r));
  vec3 col = mix(vec3(0.085, 0.085, 0.09), vec3(0.38, 0.38, 0.39), smoothstep(-0.7, 0.9, d.y));
  col += vec3(1.0, 0.99, 0.97) * 2.6 * lobe(d, normalize(vec3(-0.42, 0.78, 0.47)), sharp);
  col += vec3(0.97, 0.98, 1.0) * 1.1 * lobe(d, normalize(vec3(0.78, 0.22, 0.58)), sharp * 0.7);
  col += vec3(1.0) * 1.3 * lobe(d, normalize(vec3(0.15, 0.55, -0.82)), sharp * 0.8);
  return col;
}

vec2 envBRDF(float NoV, float rough) {
  vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough * c0 + c1;
  float a = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a + r.zw;
}

float ggx(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

float smith(float NoV, float NoL, float a) {
  float k = a * 0.5;
  return 0.25 / max((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k), 1e-4);
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 rd = normalize(vPoint);
  float b = dot(vCenter, rd);
  float h = length(vCenter - rd * b);
  float r = vRadius;
  float aa = max(fwidth(h), 1e-5);
  float cover = clamp((r - h) / aa + 0.5, 0.0, 1.0);
  if (cover <= 0.002) discard;
  float hc = min(h, r * 0.9995);
  float t = b - sqrt(r * r - hc * hc);
  vec3 pos = rd * t;
  vec3 n = normalize(pos - vCenter);
  vec4 clip = uProj * vec4(pos, 1.0);
  gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);

  vec3 v = -rd;
  vec3 albedo = vColor.rgb;
  bool lamp = vColor.a > 0.5;
  vec3 dn = fwidth(n);
  float rough = sqrt(min(uSurface.x * uSurface.x + dot(dn, dn) * 0.6, 1.0));
  float metal = uSurface.y;
  float coat = uSurface.z;
  float coatRough = sqrt(min(uSurface.w * uSurface.w + dot(dn, dn) * 0.6, 1.0));
  float NoV = clamp(dot(n, v), 1e-4, 1.0);
  vec3 R = reflect(-v, n);

  float occlusion = vShade.w * smoothstep(-0.15, 0.9, dot(n, vShade.xyz));
  float ao = 1.0 - uShadow * occlusion;
  float specAo = 1.0 - uShadow * occlusion * 0.7;

  vec3 L = uLightPos - pos;
  float dist2 = dot(L, L);
  L *= inversesqrt(dist2);
  vec3 radiance = lamp ? vec3(0.0) : uLight / (dist2 + 1.0);
  float NoL = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + v);
  float NoH = clamp(dot(n, H), 0.0, 1.0);
  float VoH = clamp(dot(v, H), 0.0, 1.0);

  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec2 ab = envBRDF(NoV, rough);
  vec3 Fr = max(vec3(1.0 - rough), F0) - F0;
  vec3 kS = F0 + Fr * pow(1.0 - NoV, 5.0);
  vec3 diffuseColor = albedo * (1.0 - metal);
  vec3 irradiance = studio(n, 1.0) * 1.15;
  vec3 envSpec = studio(R, rough) * (F0 * ab.x + ab.y);
  vec3 col = diffuseColor * irradiance * (1.0 - kS) * ao + envSpec * specAo;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  float a = max(rough * rough, 0.06);
  vec3 spec = ggx(NoH, a) * smith(NoV, NoL, a) * F;
  float wrap = clamp((dot(n, L) + 0.3) / 1.3, 0.0, 1.0);
  col += (diffuseColor * (1.0 - F) / PI * wrap + spec * NoL) * radiance;
  vec3 sh = normalize(L + n * 0.1);
  float scatter = pow(clamp(dot(v, -sh), 0.0, 1.0), 2.0) * 10.0 + 0.04;
  col += scatter * albedo * radiance * 0.03 * uExtra.x;
  float alpha = 1.0;
  if (uExtra.y > 0.5) {
    float rim = pow(1.0 - NoV, 2.5);
    col += albedo * (studio(-R, 1.0) * 0.35 + 0.06) * (1.0 - rim);
    col += radiance * albedo * pow(max(dot(-v, L), 0.0), 3.0) * 0.08;
    alpha = mix(0.5, 0.96, rim);
  }
  if (coat > 0.0) {
    float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    float ca = max(coatRough * coatRough, 0.03);
    vec3 coatEnv = studio(R, coatRough) * Fc;
    float coatSpec = ggx(NoH, ca) * smith(NoV, NoL, ca) * (0.04 + 0.96 * pow(1.0 - VoH, 5.0)) * NoL;
    col = col * (1.0 - Fc * coat) + (coatEnv * specAo + radiance * coatSpec) * coat;
    alpha = mix(alpha, 1.0, Fc * coat);
  }
  if (lamp) col += uLight * 0.0025 * (0.4 + 0.6 * albedo);
  col = aces(col * uExposure);
  col = pow(col, vec3(1.0 / 2.2));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float a2 = alpha * cover;
  outColor = vec4(col * a2, a2);
}`,Y=(x,U,V)=>Math.min(V,Math.max(U,x)),ge=(x,U,V)=>{let E=x.createShader(U);return E?(x.shaderSource(E,V),x.compileShader(E),x.getShaderParameter(E,x.COMPILE_STATUS)?E:(x.deleteShader(E),null)):null},to=x=>{let U=ge(x,x.VERTEX_SHADER,Qe),V=ge(x,x.FRAGMENT_SHADER,Je),E=x.createProgram();if(!U||!V||!E)return null;if(x.attachShader(E,U),x.attachShader(E,V),x.linkProgram(E),x.deleteShader(U),x.deleteShader(V),!x.getProgramParameter(E,x.LINK_STATUS))return x.deleteProgram(E),null;let Q={},Ht=x.getProgramParameter(E,x.ACTIVE_UNIFORMS);for(let mt=0;mt<Ht;mt++){let xt=x.getActiveUniform(E,mt);xt&&(Q[xt.name]=x.getUniformLocation(E,xt.name))}return{program:E,uniforms:Q}},Ae=x=>{let U;if(typeof x=="number")U=[(x>>16&255)/255,(x>>8&255)/255,(x&255)/255];else{let V=String(x||"#ffffff").replace("#","").trim();(V.length===3||V.length===4)&&(V=V.slice(0,3).split("").map(Q=>Q+Q).join(""));let E=parseInt(V.slice(0,6),16);U=Number.isNaN(E)?[1,1,1]:[(E>>16&255)/255,(E>>8&255)/255,(E&255)/255]}return U.map(V=>Math.pow(V,2.2))},eo=({count:x=200,colors:U=["#ffffff"],material:V="satin",minSize:E=.5,maxSize:Q=1,gravity:Ht=.5,friction:mt=.9975,wallBounce:xt=.95,bounce:ze=.85,depth:Se=2,drift:Re=0,followCursor:Fe=!0,cursorSize:Ee=1,grab:Le=!0,clickEffect:Pe="burst",lightColor:Ce="#ffffff",lightIntensity:_t=1,exposure:Ie=1,shadows:Ne=.6,intro:Be=!0,dpr:He,className:_e="",style:Te})=>{let jt=(0,rt.useRef)(null),Gt=(0,rt.useRef)(null),Tt=(0,rt.useRef)(null),Zt={count:Math.round(Y(x,1,4e3)),colors:Array.isArray(U)&&U.length?U:["#ffffff"],material:Me[V]?V:"satin",minSize:Math.max(.05,Math.min(E,Q)),maxSize:Math.max(.05,Math.max(E,Q)),gravity:Ht,friction:Y(mt,.5,1),wallBounce:Y(xt,0,1),bounce:Y(ze,0,1),depth:Math.max(0,Se),drift:Math.max(0,Re),followCursor:Fe,cursorSize:Math.max(0,Ee),grab:Le,clickEffect:Pe,lightColor:Ce,lightIntensity:_t>20?_t/200:Math.max(0,_t),exposure:Math.max(0,Ie),shadows:Y(Ne,0,1),intro:Be,dpr:He},J=(0,rt.useRef)(Zt);return J.current=Zt,(0,rt.useEffect)(()=>{let ct=jt.current,st=Gt.current,s=st?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!0,stencil:!1,powerPreference:"high-performance"});if(!ct||!st||!s)return;let gt=to(s);if(!gt)return;let j=gt.uniforms,At=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,f={width:1,height:1,ratio:1,halfW:9,halfH:9,fit:1,tan:Math.tan(we*Math.PI/360)},it=new Float32Array(16),Vt=s.createVertexArray();s.bindVertexArray(Vt);let $t=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,$t),s.bufferData(s.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),s.STATIC_DRAW),s.enableVertexAttribArray(0),s.vertexAttribPointer(0,2,s.FLOAT,!1,0,0);let bt=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,bt);for(let t=0;t<3;t++)s.enableVertexAttribArray(1+t),s.vertexAttribPointer(1+t,4,s.FLOAT,!1,Mt*4,t*16),s.vertexAttribDivisor(1+t,1);s.bindVertexArray(null);let kt=0,L=0,b=new Float32Array(0),y=new Float32Array(0),g=new Float32Array(0),p=new Float32Array(0),w=new Float32Array(0),M=new Float32Array(0),C=new Float32Array(0),tt=new Float32Array(0),vt=new Float32Array(0),zt=new Float32Array(0),H=new Float32Array(0),et=new Float32Array(0),pt=new Uint16Array(0),G=new Uint8Array(0),St=new Int32Array(0),Ut=new Int32Array(0),Z=new Int32Array(1),z=new Float32Array(Mt),$=new Int32Array(2),Dt=new Int32Array(2),Rt=[],Kt="",Qt="",Ve=t=>{let n=(o,c=1)=>{let i=new Float32Array(t*c);return i.set(o.subarray(0,Math.min(o.length,i.length))),i},r=o=>{let c=new Uint8Array(t);return c.set(o.subarray(0,Math.min(o.length,c.length))),c};b=n(b),y=n(y),g=n(g),p=n(p),w=n(w),M=n(M),C=n(C),tt=n(tt),vt=n(vt),zt=n(zt),H=n(H,4),et=n(et,3);let a=new Uint16Array(t);a.set(pt.subarray(0,Math.min(pt.length,t))),pt=a,G=r(G),St=new Int32Array(t),Ut=new Int32Array(t),Z=new Int32Array(t+1),z=new Float32Array((t+1)*Mt),kt=t,s.bindBuffer(s.ARRAY_BUFFER,bt),s.bufferData(s.ARRAY_BUFFER,z.byteLength,s.DYNAMIC_DRAW)},B={x:0,y:0,inside:!1,down:!1,downX:0,downY:0,downAt:0,moved:!1},d={x:0,y:0,z:0,r:0,tx:0,ty:0,vx:0,vy:0},_={x:0,y:5,z:6,flash:0},v={index:-1,ox:0,oy:0,tx:0,ty:0,vx:0,vy:0},Ft=0,wt=0,yt=0,Et=0,Lt=!0,Pt=0,ke=(t,n,r)=>{let a=C[t],o=Math.max(n.depth-a,0);if(G[t]=1,r&&n.gravity>.05)b[t]=(Math.random()*2-1)*Math.max(f.halfW-a,.01),y[t]=f.halfH+a+Math.random()*f.halfH*2.2,g[t]=(Math.random()*2-1)*o,p[t]=(Math.random()-.5)*2,w[t]=-(4+Math.random()*5),M[t]=0,G[t]=0;else if(r){let c=(Math.random()*2-1)*Math.max(f.halfW-a,.01),i=(Math.random()*2-1)*Math.max(f.halfH-a,.01),l=(Math.random()*2-1)*o;b[t]=(Math.random()*2-1)*.6,y[t]=(Math.random()*2-1)*.6,g[t]=(Math.random()*2-1)*Math.min(o,.3),p[t]=(c-b[t])*2.2,w[t]=(i-y[t])*2.2,M[t]=(l-g[t])*2.2,wt=1}else b[t]=(Math.random()*2-1)*Math.max(f.halfW-a,.01),y[t]=(Math.random()*2-1)*Math.max(f.halfH-a,.01),g[t]=(Math.random()*2-1)*o,p[t]=0,w[t]=0,M[t]=0},Ue=t=>{for(let n=0;n<L;n++)C[n]=(t.minSize+vt[n]*(t.maxSize-t.minSize))*f.fit,tt[n]=1/(C[n]*C[n]*C[n])},De=t=>{Rt=t.colors.map(Ae),Kt=t.colors.join("|")},Jt=(t,n)=>{let r=`${t.minSize}:${t.maxSize}:${f.fit}`;if(t.count!==L){t.count>kt&&Ve(Math.max(t.count,Math.ceil(kt*1.5)));let a=L;L=t.count;for(let o=a;o<L;o++)vt[o]=Math.random(),pt[o]=o,zt[o]=Math.random()*Math.PI*2,C[o]=(t.minSize+vt[o]*(t.maxSize-t.minSize))*f.fit,tt[o]=1/(C[o]*C[o]*C[o]),ke(o,t,(n?t.intro:!0)&&!At);for(let o=0;o<=L;o++)Z[o]=o}r!==Qt&&(Qt=r,Ue(t)),t.colors.join("|")!==Kt&&De(t)},u=new Float32Array(0),q=0,P={scale:1,x0:0,y0:0,z0:0,nx:1,ny:1,nz:1},Ye=(t,n)=>{P.scale=1/t,P.x0=-f.halfW-t,P.y0=-f.halfH-t,P.z0=-Math.max(n.depth,n.maxSize)-t,P.nx=Math.max(1,Math.ceil((f.halfW*2+t*2)*P.scale)+1),P.ny=Math.max(1,Math.ceil((f.halfH*2+t*2)*P.scale)+1),P.nz=Math.max(1,Math.ceil((Math.max(n.depth,n.maxSize)*2+t*2)*P.scale)+1);let r=P.nx*P.ny*P.nz;$.length<r+1&&($=new Int32Array(r+1),Dt=new Int32Array(r+1)),$.fill(0,0,r+1);for(let a=0;a<L;a++){let o=Y(Math.floor((b[a]-P.x0)*P.scale),0,P.nx-1),c=Y(Math.floor((y[a]-P.y0)*P.scale),0,P.ny-1),l=(Y(Math.floor((g[a]-P.z0)*P.scale),0,P.nz-1)*P.ny+c)*P.nx+o;St[a]=l,$[l+1]++}for(let a=1;a<=r;a++)$[a]+=$[a-1];Dt.set($.subarray(0,r+1));for(let a=0;a<L;a++)Ut[Dt[St[a]]++]=a},ht=(t,n,r,a,o,c,i)=>{if(n>=i||q*8>=u.length)return;let l=p[t]*r+w[t]*a+M[t]*o,e=q*8;u[e]=t,u[e+1]=-2,u[e+2]=r,u[e+3]=a,u[e+4]=o,u[e+5]=n,u[e+6]=l<-1.5?-c*l:0,u[e+7]=0,q++},qe=(t,n,r,a)=>{let o=v.index,{nx:c,ny:i,nz:l}=P;q=0;for(let e=0;e<L;e++){let h=St[e],m=h%c,R=Math.floor(h/c)%i,k=Math.floor(h/(c*i));for(let I=k>0?-1:0;I<=(k<l-1?1:0);I++)for(let F=R>0?-1:0;F<=(R<i-1?1:0);F++){let A=((k+I)*i+R+F)*c;for(let N=m>0?-1:0;N<=(m<c-1?1:0);N++){let T=A+m+N;for(let D=$[T];D<$[T+1];D++){let S=Ut[D];if(S<=e)continue;let W=b[S]-b[e],K=y[S]-y[e],X=g[S]-g[e],O=W*W+K*K+X*X,dt=C[e]+C[S],me=Math.max(dt+a,r?dt*1.4:0);if(O>=me*me||O<1e-12)continue;let ut=Math.sqrt(O),It=W/ut,Nt=K/ut,Bt=X/ut;if(r){let at=Y(1-(ut-dt)/(dt*.4),0,1);H[e*4]+=It*at,H[e*4+1]+=Nt*at,H[e*4+2]+=Bt*at,H[e*4+3]+=at,H[S*4]-=It*at,H[S*4+1]-=Nt*at,H[S*4+2]-=Bt*at,H[S*4+3]+=at}if(ut>=dt+a||q*8>=u.length||e===o&&S===o)continue;let xe=(p[S]-p[e])*It+(w[S]-w[e])*Nt+(M[S]-M[e])*Bt,nt=q*8;u[nt]=e,u[nt+1]=S,u[nt+2]=It,u[nt+3]=Nt,u[nt+4]=Bt,u[nt+5]=ut-dt,u[nt+6]=xe<-1.5?-t.bounce*xe:0,u[nt+7]=0,q++}}}if(e!==o){let I=C[e],F=Math.max(t.depth-I,0);ht(e,b[e]+f.halfW-I,1,0,0,t.wallBounce,a),ht(e,f.halfW-I-b[e],-1,0,0,t.wallBounce,a),ht(e,y[e]+f.halfH-I,0,1,0,t.wallBounce,a),G[e]&&ht(e,f.halfH-I-y[e],0,-1,0,t.wallBounce,a),ht(e,g[e]+F,0,0,1,t.wallBounce,a),ht(e,F-g[e],0,0,-1,t.wallBounce,a)}if(d.r>.01&&e!==o&&q*8<u.length){let I=b[e]-d.x,F=y[e]-d.y,A=g[e]-d.z,N=C[e]+d.r,T=I*I+F*F+A*A;if(T<(N+a)*(N+a)&&T>1e-12){let D=Math.sqrt(T),S=I/D,W=F/D,K=A/D,X=(p[e]-d.vx)*S+(w[e]-d.vy)*W+M[e]*K,O=q*8;u[O]=e,u[O+1]=-1,u[O+2]=S,u[O+3]=W,u[O+4]=K,u[O+5]=D-N,u[O+6]=X<-1.5?-t.bounce*X:0,u[O+7]=0,q++}}}},We=t=>{let n=v.index,r=L>800?5:8;for(let a=0;a<r;a++)for(let o=0;o<q;o++){let c=o*8,i=u[c],l=u[c+1],e=u[c+2],h=u[c+3],m=u[c+4],R=u[c+5],k=R>0?-R/t:u[c+6],I=u[c+7];if(l<0){let W=l===-1?(p[i]-d.vx)*e+(w[i]-d.vy)*h+M[i]*m:p[i]*e+w[i]*h+M[i]*m,K=Math.max(I+k-W,0),X=K-I;u[c+7]=K,p[i]+=X*e,w[i]+=X*h,M[i]+=X*m;continue}let F=i===n?0:tt[i],A=l===n?0:tt[l],N=F+A;if(N<=0)continue;let T=(p[l]-p[i])*e+(w[l]-w[i])*h+(M[l]-M[i])*m,D=Math.max(I+(k-T)/N,0),S=D-I;u[c+7]=D,p[i]-=S*F*e,w[i]-=S*F*h,M[i]-=S*F*m,p[l]+=S*A*e,w[l]+=S*A*h,M[l]+=S*A*m}},Oe=()=>{let t=v.index;for(let n=0;n<2;n++)for(let r=0;r<q;r++){let a=r*8,o=u[a],c=u[a+1];if(c===-2)continue;if(c<0){let A=b[o]-d.x,N=y[o]-d.y,T=g[o]-d.z,D=Math.sqrt(A*A+N*N+T*T),S=C[o]+d.r-D-ye;if(S<=0||D<1e-6)continue;let W=S*.5/D;b[o]+=A*W,y[o]+=N*W,g[o]+=T*W;continue}let i=b[c]-b[o],l=y[c]-y[o],e=g[c]-g[o],h=Math.sqrt(i*i+l*l+e*e),m=C[o]+C[c]-h-ye;if(m<=0||h<1e-6)continue;let R=o===t?0:tt[o],k=c===t?0:tt[c],I=R+k;if(I<=0)continue;let F=m*.3/(h*I);b[o]-=i*F*R,y[o]-=l*F*R,g[o]-=e*F*R,b[c]+=i*F*k,y[c]+=l*F*k,g[c]+=e*F*k}},Xe=t=>{let n=f.halfW,r=f.halfH,a=t.wallBounce;for(let o=0;o<L;o++){let c=C[o];b[o]<-n+c?(b[o]=-n+c,p[o]<0&&(p[o]=p[o]<-1.5?-p[o]*a:0)):b[o]>n-c&&(b[o]=n-c,p[o]>0&&(p[o]=p[o]>1.5?-p[o]*a:0)),y[o]<-r+c?(y[o]=-r+c,w[o]<0&&(w[o]=w[o]<-1.5?-w[o]*a:0),p[o]*=.995,M[o]*=.995):G[o]&&y[o]>r-c&&(y[o]=r-c,w[o]>0&&(w[o]=w[o]>1.5?-w[o]*a:0)),!G[o]&&y[o]<r-c&&(G[o]=1);let i=Math.max(t.depth-c,0);g[o]<-i?(g[o]=-i,M[o]<0&&(M[o]=M[o]<-1.5?-M[o]*a:0)):g[o]>i&&(g[o]=i,M[o]>0&&(M[o]=M[o]>1.5?-M[o]*a:0))}},je=(t,n,r)=>{let a=t.gravity*45,o=Math.pow(t.friction,n*60)*(wt>0?Math.exp(-2.2*n):1),c=At?0:t.drift*2.2,i=t.maxSize*f.fit,l=i*.3;u.length<L*96&&(u=new Float32Array(L*96));for(let e=0;e<L;e++){if(e===v.index){let m=1-Math.exp(-n/.02);p[e]=(v.tx-b[e])*m/n,w[e]=(v.ty-y[e])*m/n,M[e]=0;continue}if(w[e]-=a*n,c){let m=zt[e];p[e]+=Math.sin(Ft*.63+m)*c*n,w[e]+=Math.cos(Ft*.47+m*1.7)*c*n,M[e]+=Math.sin(Ft*.41+m*2.3)*c*n*.5}p[e]*=o,w[e]*=o,M[e]*=o;let h=p[e]*p[e]+w[e]*w[e]+M[e]*M[e];if(h>ft*ft){let m=ft/Math.sqrt(h);p[e]*=m,w[e]*=m,M[e]*=m}}Ye(i*(r?2.8:2.3),t),r&&H.fill(0,0,L*4),qe(t,n,r,l),We(n);for(let e=0;e<L;e++)b[e]+=p[e]*n,y[e]+=w[e]*n,g[e]+=M[e]*n;if(Oe(),Xe(t),r)for(let e=0;e<L;e++){let h=y[e]-C[e]+f.halfH,m=C[e]*.5;if(h>=m)continue;let R=1-Math.max(h,0)/m;H[e*4+1]-=R,H[e*4+3]+=R}if(v.index>=0){let e=v.index;v.vx+=(p[e]-v.vx)*(1-Math.exp(-n/.05)),v.vy+=(w[e]-v.vy)*(1-Math.exp(-n/.05))}},te=(t,n)=>{let r=ct.getBoundingClientRect(),a=(t-r.left)/Math.max(r.width,1)*2-1,o=1-(n-r.top)/Math.max(r.height,1)*2;return[a*f.tan*(f.width/f.height),o*f.tan,-1]},Ct=(t,n)=>{let r=(n-lt)/t[2];return[t[0]*r,t[1]*r]},Ge=t=>{let n=Math.hypot(t[0],t[1],t[2]),r=t[0]/n,a=t[1]/n,o=t[2]/n,c=-1,i=1/0;for(let l=0;l<L;l++){let e=-b[l],h=-y[l],m=lt-g[l],R=e*r+h*a+m*o,k=C[l]*1.15,I=e*e+h*h+m*m-k*k,F=R*R-I;if(F<0)continue;let A=-R-Math.sqrt(F);A>0&&A<i&&(i=A,c=l)}return c},Ze=(t,n)=>{let r=J.current,a=f.halfH*.7;for(let o=0;o<L;o++){let c=b[o]-t,i=y[o]-n,l=g[o],e=Math.hypot(c,i,l);if(e>=a||e<1e-4)continue;let h=Math.pow(1-e/a,2)*26*(1+.6/(C[o]+.4));p[o]+=c/e*h,w[o]+=i/e*h+h*.25,M[o]+=l/e*h*.5}_.x=t,_.y=n,_.z=Math.max(r.depth,1)+1.5,_.flash=1},ee=J.current.dpr,Yt=()=>{let t=J.current;ee=t.dpr,f.width=Math.max(1,ct.clientWidth),f.height=Math.max(1,ct.clientHeight),f.ratio=Math.min(t.dpr||window.devicePixelRatio||1,2),st.width=Math.max(1,Math.round(f.width*f.ratio)),st.height=Math.max(1,Math.round(f.height*f.ratio));let n=f.width/f.height,r=Math.tan(we*Math.PI/360);f.tan=n>Ot?r*Ot/n:r,f.halfH=f.tan*lt,f.halfW=f.halfH*n,f.fit=Y(Math.sqrt(f.halfW*f.halfH/(r*r*lt*lt*Ot)),.4,1);let a=1/f.tan,o=1,c=80;it.fill(0),it[0]=a/n,it[5]=a,it[10]=(c+o)/(o-c),it[11]=-1,it[14]=2*c*o/(o-c),L||Jt(t,!0),oe(),ot()},oe=()=>{let t=J.current,n=Me[t.material],r=0,a=L+1;for(let i=1;i<a;i++){let l=Z[i],e=l===L?d.z:g[l],h=i-1;for(;h>=0&&(Z[h]===L?d.z:g[Z[h]])>e;)Z[h+1]=Z[h],h--;Z[h+1]=l}for(let i=0;i<a;i++){let l=Z[i],e=r*Mt;if(l===L){if(d.r<.01||!t.followCursor)continue;let h=Rt[0]||[1,1,1];z[e]=d.x,z[e+1]=d.y,z[e+2]=d.z,z[e+3]=d.r,z[e+4]=h[0],z[e+5]=h[1],z[e+6]=h[2],z[e+7]=1,z[e+8]=0,z[e+9]=0,z[e+10]=0,z[e+11]=0}else{let h=Rt[pt[l]%Rt.length];z[e]=b[l],z[e+1]=y[l],z[e+2]=g[l],z[e+3]=C[l],z[e+4]=h[0],z[e+5]=h[1],z[e+6]=h[2],z[e+7]=0;let m=H[l*4+3],R=Math.hypot(H[l*4],H[l*4+1],H[l*4+2])||1;z[e+8]=H[l*4]/R,z[e+9]=H[l*4+1]/R,z[e+10]=H[l*4+2]/R,z[e+11]=Math.min(m*.55,1)}r++}if(s.viewport(0,0,st.width,st.height),s.clearColor(0,0,0,0),s.clearDepth(1),s.clear(s.COLOR_BUFFER_BIT|s.DEPTH_BUFFER_BIT),!r)return;s.enable(s.DEPTH_TEST),s.depthFunc(s.LEQUAL),s.enable(s.BLEND),s.blendFunc(s.ONE,s.ONE_MINUS_SRC_ALPHA),s.useProgram(gt.program),s.uniformMatrix4fv(j.uProj,!1,it),s.uniform1f(j.uCameraZ,lt),s.uniform1f(j.uPixel,2*f.tan/st.height);let o=Ae(t.lightColor),c=t.lightIntensity*60*(1+_.flash*3);s.uniform3f(j.uLight,o[0]*c,o[1]*c,o[2]*c),s.uniform3f(j.uLightPos,_.x,_.y,_.z-lt),s.uniform1f(j.uExposure,t.exposure),s.uniform1f(j.uShadow,t.shadows),s.uniform4f(j.uSurface,n.roughness,n.metalness,n.coat,n.coatRoughness),s.uniform2f(j.uExtra,n.scatter,n.frost),s.bindBuffer(s.ARRAY_BUFFER,bt),s.bufferSubData(s.ARRAY_BUFFER,0,z,0,r*Mt),s.bindVertexArray(Vt),s.drawArraysInstanced(s.TRIANGLE_STRIP,0,4,r),s.bindVertexArray(null)},ne=t=>{if(yt=0,!Lt||document.hidden)return;let n=J.current;n.dpr!==ee&&Yt();let r=Et?Y((t-Et)/1e3,0,1/20):1/60;Et=t,Ft+=r,wt=Math.max(0,wt-r),Jt(n,!1);let a=n.followCursor&&B.inside&&v.index<0?n.cursorSize*f.fit:0;d.r+=(a-d.r)*(1-Math.exp(-r/.12));let o=1-Math.exp(-r/.06),c=d.x,i=d.y;d.x+=(d.tx-d.x)*o,d.y+=(d.ty-d.y)*o,d.vx=Y((d.x-c)/Math.max(r,.001),-ft,ft),d.vy=Y((d.y-i)/Math.max(r,.001),-ft,ft);let l=0,e=f.halfH*.75,h=n.depth+4,m=B.inside?[d.x,d.y,n.followCursor?d.z:1.5]:_.flash>.05?[_.x,_.y,_.z]:[l,e,h],R=1-Math.exp(-r/.08);if(_.x+=(m[0]-_.x)*R,_.y+=(m[1]-_.y)*R,_.z+=(m[2]-_.z)*R,_.flash*=Math.exp(-r/.3),r>1e-4){let A=Math.min(6,Math.max(1,Math.ceil(r/.005555555555555556))),N=r/A;for(let T=0;T<A;T++)je(n,N,T===A-1)}oe();let k=0;for(let A=0;A<L;A++){let N=A*3,T=Math.abs(b[A]-et[N])+Math.abs(y[A]-et[N+1])+Math.abs(g[A]-et[N+2]);T>k&&(k=T),et[N]=b[A],et[N+1]=y[A],et[N+2]=g[A]}Pt=k/Math.max(r,.001)>.6||B.inside||v.index>=0||_.flash>.01||wt>0||d.r>.01||n.drift>0&&!At?0:Pt+r,Pt<.8&&(yt=requestAnimationFrame(ne))};function ot(){Pt=0,!yt&&Lt&&!document.hidden&&(Et=0,yt=requestAnimationFrame(ne))}let qt=t=>{let n=ct.getBoundingClientRect(),r=t.clientX-n.left,a=t.clientY-n.top;return r>=0&&a>=0&&r<=n.width&&a<=n.height},ae=t=>{let n=te(t.clientX,t.clientY),[r,a]=Ct(n,d.z);if(d.tx=r,d.ty=a,v.index>=0){let[o,c]=Ct(n,g[v.index]);v.tx=o-v.ox,v.ty=c-v.oy}return n},re=t=>{let n=B.inside;B.inside=qt(t)||v.index>=0,B.inside&&(ae(t),n||(d.x=d.tx,d.y=d.ty),B.down&&Math.hypot(t.clientX-B.downX,t.clientY-B.downY)>6&&(B.moved=!0)),(B.inside||n)&&ot()},$e=t=>t instanceof Element&&t.closest('a, button, input, textarea, select, label, [role="button"]'),ce=t=>{if(t.button!==0||!qt(t)||$e(t.target))return;let n=J.current;B.down=!0,B.moved=!1,B.downX=t.clientX,B.downY=t.clientY,B.downAt=performance.now();let r=ae(t);if(n.grab){let a=Ge(r);if(a>=0){let[o,c]=Ct(r,g[a]);v.index=a,v.ox=o-b[a],v.oy=c-y[a],v.tx=b[a],v.ty=y[a],v.vx=0,v.vy=0,t.pointerType==="mouse"&&t.preventDefault()}}ot()},se=t=>{let n=J.current;if(v.index>=0){let r=v.index,a=Math.hypot(v.vx,v.vy),o=a>22?22/a:1;p[r]=v.vx*o,w[r]=v.vy*o,v.index=-1,G[r]=1}else if(t&&B.down&&!B.moved&&performance.now()-B.downAt<400&&n.clickEffect==="burst"&&!At&&qt(t)){let[r,a]=Ct(te(t.clientX,t.clientY),0);Ze(r,a)}B.down=!1,ot()},ie=t=>se(t),le=()=>se(null),fe=()=>{B.inside=v.index>=0,ot()},he=()=>ot(),de=new ResizeObserver(Yt);de.observe(ct);let ue=new IntersectionObserver(t=>{Lt=t.some(n=>n.isIntersecting),Lt&&ot()});return ue.observe(ct),window.addEventListener("pointermove",re,{passive:!0}),window.addEventListener("pointerdown",ce),window.addEventListener("pointerup",ie,{passive:!0}),window.addEventListener("pointercancel",le,{passive:!0}),document.documentElement.addEventListener("pointerleave",fe),document.addEventListener("visibilitychange",he),Yt(),Tt.current=ot,()=>{cancelAnimationFrame(yt),Tt.current=null,de.disconnect(),ue.disconnect(),window.removeEventListener("pointermove",re),window.removeEventListener("pointerdown",ce),window.removeEventListener("pointerup",ie),window.removeEventListener("pointercancel",le),document.documentElement.removeEventListener("pointerleave",fe),document.removeEventListener("visibilitychange",he),s.deleteBuffer($t),s.deleteBuffer(bt),s.deleteVertexArray(Vt),s.deleteProgram(gt.program),s.getExtension("WEBGL_lose_context")?.loseContext()}},[]),(0,rt.useEffect)(()=>{Tt.current?.()}),(0,Xt.jsx)("div",{ref:jt,className:_e,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",...Te},children:(0,Xt.jsx)("canvas",{ref:Gt,style:{display:"block",width:"100%",height:"100%"},"aria-hidden":"true"})})},be=eo;function ro(x,U){return pe(be,x,{colors:["#ffffff"],material:"satin",count:200,minSize:.5,maxSize:1,gravity:0,friction:.9975,wallBounce:.95,bounce:.85,depth:2,drift:.4,cursorSize:1,lightColor:"#ffffff",lightIntensity:1,exposure:1,shadows:.6},U)}export{ro as mountBackground};
