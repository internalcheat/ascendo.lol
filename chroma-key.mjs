export function createChromaKey(canvas) {
  const gl = canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:false});
  if (!gl) throw new Error('Green-screen removal needs WebGL on this device.');
  const compile = (type,source) => { const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Green-screen removal is unavailable.');}return shader; };
  const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}');
  const fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float; varying vec2 uv; uniform sampler2D source; uniform vec3 keyColor; uniform float tolerance; uniform float softness; uniform vec2 scale; void main(){vec2 point=(uv-0.5)/scale+0.5;if(point.x<0.0||point.x>1.0||point.y<0.0||point.y>1.0){gl_FragColor=vec4(0.0);return;}vec4 color=texture2D(source,vec2(point.x,1.0-point.y));float distanceToKey=length(color.rgb-keyColor);float alpha=smoothstep(tolerance,tolerance+softness,distanceToKey)*color.a;vec3 clean=max(vec3(0.0),color.rgb-keyColor*(1.0-alpha)*0.28);gl_FragColor=vec4(clean,alpha);}');
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Green-screen removal is unavailable.');
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gl.useProgram(program);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const keyLocation=gl.getUniformLocation(program,'keyColor'), toleranceLocation=gl.getUniformLocation(program,'tolerance'), softnessLocation=gl.getUniformLocation(program,'softness'), scaleLocation=gl.getUniformLocation(program,'scale');
  return {
    draw(source,settings,fit) {
      if(gl.isContextLost())throw new Error('Green-screen removal lost its graphics context.');
      const width=source.videoWidth||source.naturalWidth,height=source.videoHeight||source.naturalHeight;
      if(!width||!height)return false;
      const sourceRatio=width/height,targetRatio=canvas.width/canvas.height;
      const scale=fit==='contain'?(sourceRatio>targetRatio?[1,targetRatio/sourceRatio]:[sourceRatio/targetRatio,1]):(sourceRatio>targetRatio?[sourceRatio/targetRatio,1]:[1,targetRatio/sourceRatio]);
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.uniform3f(keyLocation,...[1,3,5].map(offset=>parseInt(settings.color.slice(offset,offset+2),16)/255));gl.uniform1f(toleranceLocation,settings.tolerance/100*1.5);gl.uniform1f(softnessLocation,settings.softness/100*1.5);gl.uniform2f(scaleLocation,...scale);gl.drawArrays(gl.TRIANGLES,0,6);
      return true;
    },
    destroy(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();}
  };
}
