const palettes = {snow:['#ffffff','#cde5ff'],rain:['#a6caff','#c3ddff'],petals:['#f9bbd7','#efa2ce'],embers:['#ffb273','#f37458'],stars:['#edf1ff','#bba8ef'],fireflies:['#d6f3a3','#f9ed99'],dust:['#d8cbe3','#eee4db'],bubbles:['#c3d7ff','#e6baff'],confetti:['#d8b4ff','#a8e6e1','#f7bbcc','#f2dc9c'],sparkles:['#fff4dd','#dfc5ff'],meteors:['#b9d7ff','#f1d5ff'],matrix:['#9ad9ab','#79c5a1'],aurora:['#b293f5','#73d4c5','#d5a8ee'],ripples:['#c1b1eb','#a3d6ea'],fireworks:['#ddaaff','#ffba9e','#a6e5e1']};
const tau=Math.PI*2;
export function createOverlayParticles(canvas) {
  const context=canvas.getContext('2d',{alpha:true});
  if(!context)throw new Error('Decorative overlays are unavailable in this browser.');
  const pools=new Map();
  function pool(preset,count) {
    let points=pools.get(preset);
    if(!points){points=[];pools.set(preset,points);}
    while(points.length<count)points.push({positionX:Math.random(),positionY:Math.random(),phase:Math.random()*tau,size:Math.random(),duration:2+Math.random()*4,offset:Math.random()*20});
    return points;
  }
  function polygon(positionX,positionY,radius,sides,rotation) {
    context.beginPath();for(let edge=0;edge<sides;edge++){const angle=rotation+edge/sides*tau;const px=positionX+Math.cos(angle)*radius,py=positionY+Math.sin(angle)*radius;if(!edge)context.moveTo(px,py);else context.lineTo(px,py);}context.closePath();context.fill();
  }
  return {
    draw(layers,time,accent,budget) {
      const width=canvas.width,height=canvas.height;
      context.clearRect(0,0,width,height);
      const enabled=layers.filter(layer=>layer.enabled&&layer.opacity>0&&layer.density>0);
      const total=enabled.reduce((sum,layer)=>sum+layer.density,0)||1;
      let remaining=budget;
      for(const layer of enabled){
        const count=Math.min(remaining,Math.max(layer.preset==='fireworks'?32:layer.preset==='meteors'?6:1,Math.ceil(budget*layer.density/total*layer.density/100)));remaining-=count;
        const points=pool(layer.preset,count),seconds=time/1000*layer.speed;
        const colors=layer.colorMode==='accent'?[accent]:layer.colorMode==='custom'?[layer.color]:palettes[layer.preset];
        context.save();context.globalAlpha=layer.opacity/100;context.lineWidth=Math.max(1,width/1200);
        if(layer.preset==='aurora'){
          for(let band=0;band<3;band++){const positionX=(.25+band*.3+Math.sin(seconds*.12+band)*.12)*width;const positionY=(.25+Math.sin(seconds*.16+band)*.15)*height;const radius=Math.max(width,height)*.55;const gradient=context.createRadialGradient(positionX,positionY,0,positionX,positionY,radius);gradient.addColorStop(0,colors[band%colors.length]+'55');gradient.addColorStop(1,colors[band%colors.length]+'00');context.fillStyle=gradient;context.fillRect(0,0,width,height);}
          context.restore();continue;
        }
        for(let index=0;index<count;index++){
          const point=points[index];const color=colors[index%colors.length];context.fillStyle=color;context.strokeStyle=color;
          const phase=seconds+point.phase;const size=(1+point.size*3)*Math.max(.7,width/1280);
          let positionX=((point.positionX+Math.sin(phase*.22)*.025+1)%1)*width,positionY=((point.positionY+seconds*(.012+point.size*.018))%1)*height;
          if(layer.preset==='rain'){positionX=(point.positionX+seconds*.035)%1*width;positionY=(point.positionY+seconds*.36)%1*height;context.beginPath();context.moveTo(positionX,positionY);context.lineTo(positionX-7,positionY+20+size*5);context.stroke();}
          else if(layer.preset==='petals'){context.save();context.translate(positionX,positionY);context.rotate(phase*.65);context.scale(1,.45+Math.sin(phase)*.2);context.beginPath();context.ellipse(0,0,size*2.5,size,0,0,tau);context.fill();context.restore();}
          else if(layer.preset==='embers'||layer.preset==='fireflies'||layer.preset==='dust'){
            positionY=((point.positionY-seconds*.018+100)%1)*height;if(layer.preset==='fireflies'){positionX=(point.positionX+Math.sin(phase*.8)*.06)*width;positionY=(point.positionY+Math.cos(phase*.65)*.04)*height;}
            context.globalAlpha=layer.opacity/100*(.25+.6*(.5+.5*Math.sin(phase)));context.beginPath();context.arc(positionX,positionY,layer.preset==='dust'?size*2:size*.65,0,tau);context.fill();
          }
          else if(layer.preset==='bubbles'){positionY=((point.positionY-seconds*.025+100)%1)*height;context.beginPath();context.arc(positionX,positionY,size*4,0,tau);context.stroke();context.beginPath();context.arc(positionX-size,positionY-size,size*.5,0,tau);context.fill();}
          else if(layer.preset==='confetti'){context.save();context.translate(positionX,positionY);context.rotate(phase);context.fillRect(-size,-size*.4,size*2,size*.8);context.restore();}
          else if(layer.preset==='sparkles'||layer.preset==='stars'){
            positionX=point.positionX*width;positionY=point.positionY*height;context.globalAlpha=layer.opacity/100*(.25+.65*(.5+.5*Math.sin(phase*.8)));if(layer.preset==='stars'){context.beginPath();context.arc(positionX,positionY,size*.45,0,tau);context.fill();}else polygon(positionX,positionY,size*(.6+.4*Math.sin(phase)),4,Math.PI/4);
          }
          else if(layer.preset==='meteors'){
            if(index>5)continue;const progress=((seconds*.15+point.phase)%1);positionX=(point.positionX+progress*.6)%1*width;positionY=progress*height;context.globalAlpha=layer.opacity/100*Math.sin(progress*Math.PI);context.beginPath();context.moveTo(positionX,positionY);context.lineTo(positionX-70,positionY-40);context.stroke();
          }
          else if(layer.preset==='matrix'){
            const columns=Math.max(6,Math.floor(width/34));positionX=(index%columns)*width/columns;positionY=((point.positionY+seconds*.08)%1)*height;context.font=`${Math.max(11,size*4)}px monospace`;context.globalAlpha=layer.opacity/100;context.fillText(index%2?'1':'0',positionX,positionY);
          }
          else if(layer.preset==='ripples'){
            const progress=(seconds*.17+point.phase)%1;context.globalAlpha=layer.opacity/100*(1-progress);context.beginPath();context.ellipse(point.positionX*width,point.positionY*height,progress*55,progress*18,0,0,tau);context.stroke();
          }
          else if(layer.preset==='fireworks'){
            const burst=Math.floor(index/16),piece=index%16,progress=((seconds*.28+points[burst].phase)%1);const radius=progress*65,angle=piece/16*tau;context.globalAlpha=layer.opacity/100*(1-progress);positionX=points[burst].positionX*width+Math.cos(angle)*radius;positionY=points[burst].positionY*height+Math.sin(angle)*radius+progress*progress*16;context.beginPath();context.arc(positionX,positionY,Math.max(1,size*.45),0,tau);context.fill();
          }
          else {context.globalAlpha=layer.opacity/100*.8;context.beginPath();context.arc(positionX,positionY,size*.65,0,tau);context.fill();}
        }
        context.restore();
      }
    },
    clear(){context.clearRect(0,0,canvas.width,canvas.height);},
    destroy(){pools.clear();context.clearRect(0,0,canvas.width,canvas.height);canvas.width=canvas.height=1;}
  };
}
