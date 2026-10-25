import Effect from '../vendor/react-bits/backgrounds/Ballpit.jsx';
import {mountReactBackground} from '../background-react.jsx';
export function mountBackground(host,options){return mountReactBackground(Effect,host,{"colors":["#ffffff"],"material":"satin","count":200,"minSize":0.5,"maxSize":1,"gravity":0,"friction":0.9975,"wallBounce":0.95,"bounce":0.85,"depth":2,"drift":0.4,"cursorSize":1,"lightColor":"#ffffff","lightIntensity":1,"exposure":1,"shadows":0.6},options);}
