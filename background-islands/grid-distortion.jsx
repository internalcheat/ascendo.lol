import Effect from '../vendor/react-bits/backgrounds/GridDistortion.jsx';
import {mountReactBackground} from '../background-react.jsx';
export function mountBackground(host,options){return mountReactBackground(Effect,host,{"imageSrc":"/assets/background-presets/grid-distortion-image.webp","grid":15,"radius":0.18,"strength":0.15,"relaxation":0.96,"mode":"drag","softness":0,"chroma":0,"idle":0.3,"clickRipple":true,"intro":true},options);}
