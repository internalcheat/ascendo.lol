import {normalizeProfile} from '../../profile-schema.mjs';
export function appearanceProfile(seed,overrides={}){
 return normalizeProfile({...seed,name:'Appearance fixture',badge:'',bio:'**Every saved detail**\n[Profile link](https://ascendo.lol/)',effect:'glow',accent:'#22bbcc',opacity:71,effectSpeed:130,effectStrength:78,
  colorTheme:'custom',themeColors:{primary:'#22bbcc',secondary:'#ff66aa'},textColors:{bio:'#eeeedd',socialLabel:'#bbccdd'},
  typography:{display:'outfit',body:'sora',sizes:{name:42,badge:12,bio:16,socialLabel:12,socialHandle:18,songTitle:15,songArtist:12,songMeta:10}},cardLayout:'bento',
  backgroundAppearance:{enabled:true,blur:9,darkness:21,saturation:112,tint:12,tintColor:'#114466',vignette:30,x:68,y:37},
  glass:{enabled:true,blur:26,radius:34,shadow:52,edge:27},avatarFrame:{enabled:true,style:'double',color:'#33ffee',secondary:'#ff55cc',width:2.7,gap:7,glow:45,speed:1.3},
  electricBorder:{enabled:true,style:'dual',color:'#33ffee',secondary:'#ff55cc',width:2.1,glow:28,intensity:62,speed:1.4,reactive:false},
  cursorEffects:{enabled:true,style:'ring',color:'#33ffee',size:28,trail:true,trailLength:6,trailSmoothness:75,clickEffect:'ripple'},
  cardEffects:{enabled:true,intensity:28,speed:1.2},entranceEffects:{enabled:true,style:'slide',direction:'left',duration:450,distance:12,zoom:3,stagger:40},
  soundtrackCard:{enabled:true},soundtrack:{title:'Saved soundtrack',artist:'Fixture artist'},music:{source:'video',volume:31},
  richBio:{enabled:true,align:'left'},socialStyle:{enabled:true,layout:'pills',surface:'outline',radius:19,gap:9,iconSize:22},detailColors:{enabled:true,name:'#eeeeee',bioLink:'#ff66aa',icons:'#33ffee'},
  holographic:{enabled:true,finish:'pearl',intensity:25,speed:1.3},musicReactive:{enabled:false,style:'equalizer',color:'#77ffaa',intensity:34,smoothing:64},
  signature:{enabled:true,mode:'text',text:'Fixture',font:'classic',width:170,stroke:2.5,duration:950,color:'#55ddff'},
  pageTitle:{enabled:true,lines:['Saved title','Second line'],effect:'scroll',interval:2400,speed:120},enterScreen:{enabled:false,title:'Saved entry',subtitle:'Second line',soundEnabled:true,sound:'pulse',volume:35},
  overlays:{enabled:false,layers:[{preset:'rain',enabled:true,opacity:25,density:22,speed:1.2,colorMode:'custom',color:'#33ffee'}]},
  widgets:{game:{enabled:true,title:'My settings',game:'Minecraft',rows:[{label:'Sensitivity',value:'0.6',copy:true}]},hardware:{enabled:true,title:'My hardware',rows:[{label:'Mouse',value:'Fixture mouse',copy:false}]},about:{enabled:true,title:'About',text:'Every widget returns.',rows:[{label:'Detail',value:'Preserved',copy:true}]},embeds:{enabled:false,items:[]}},...overrides});
}
