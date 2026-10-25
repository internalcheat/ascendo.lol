import {createRoot} from 'react-dom/client';
import FluxLines from './vendor/react-bits/FluxLines.runtime.jsx';
import {LOOK} from './vendor/react-bits/demo-presets.js';

export function mountFluxLines(host,{onReady,onError}={}){
  const root=createRoot(host);
  let alive=true;
  const notify=callback=>value=>queueMicrotask(()=>{if(alive)callback?.(value);});
  const mobile=matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  root.render(<FluxLines {...LOOK} mouseInteraction clickSwirl intro transparent={false} backgroundColor="#000000" dpr={Math.min(devicePixelRatio||1,mobile?1.25:2)} onReady={notify(onReady)} onError={notify(onError)}/>);
  return ()=>{alive=false;root.unmount();};
}
