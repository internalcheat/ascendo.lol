import Effect from '../vendor/react-bits/backgrounds/Dither.jsx';
import {mountReactBackground} from '../background-react.jsx';
export function mountBackground(host,options){return mountReactBackground(Effect,host,{"waveColor":"#bcbcbc","backgroundColor":"#120f17","ditherMode":"bayer","palette":[],"colorNum":4,"pixelSize":2,"scale":1,"waveSpeed":0.05,"waveFrequency":3,"waveAmplitude":0.3,"contrast":1,"brightness":0,"mouseEffect":"erase","mouseRadius":0.3,"mouseStrength":1,"trail":0.5,"enableMouseInteraction":true,"clickRipple":true,"intro":true,"disableAnimation":false},options);}
