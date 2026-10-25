import {Component} from 'react';
import {createRoot} from 'react-dom/client';
class BackgroundBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError?.('background.unavailable');}
  render(){return this.state.failed?null:this.props.children;}
}
export function mountReactBackground(Effect,host,props,{onReady,onError}={}){
  const root=createRoot(host),mobile=matchMedia('(max-width:820px), (pointer:coarse)').matches,dpr=Math.min(devicePixelRatio||1,mobile?1.25:2);let alive=true,frame=0,start=performance.now(),readyCanvas;
  const fail=()=>{queueMicrotask(()=>{if(alive)onError?.('background.unavailable');});};
  root.render(<BackgroundBoundary onError={fail}><Effect {...props} dpr={dpr} maxDevicePixelRatio={dpr}/></BackgroundBoundary>);
  function inspect(){if(!alive)return;const canvas=host.querySelector('canvas');if(canvas){try{const gl=canvas.getContext('webgl2');if(gl&&!gl.isContextLost()&&gl.getParameter(gl.CURRENT_PROGRAM)&&canvas.width>1){readyCanvas=canvas;canvas.addEventListener('webglcontextlost',fail,{once:true});onReady?.();return;}}catch{}}
    if(performance.now()-start>5000){fail();return;}frame=requestAnimationFrame(inspect);
  }
  frame=requestAnimationFrame(inspect);
  return ()=>{if(!alive)return;alive=false;cancelAnimationFrame(frame);readyCanvas?.removeEventListener('webglcontextlost',fail);root.unmount();host.replaceChildren();};
}
