// Border-box contour, including independent corner radii, in local CSS pixels.
export function electricContour(width,height,corners){
 const values=Array.isArray(corners)?corners:[corners,corners,corners,corners];
 let [tl,tr,br,bl]=values.map(value=>Math.max(0,Number(value)||0));
 const scale=Math.min(1,width/Math.max(1,tl+tr,bl+br),height/Math.max(1,tl+bl,tr+br));
 [tl,tr,br,bl]=[tl,tr,br,bl].map(r=>r*scale);
 const lengths=[width-tl-tr,Math.PI*tr/2,height-tr-br,Math.PI*br/2,width-br-bl,Math.PI*bl/2,height-bl-tl,Math.PI*tl/2];
 const perimeter=lengths.reduce((a,b)=>a+b,0),count=Math.min(128,Math.max(40,Math.ceil(perimeter/12))),points=[];
 for(let i=0;i<count;i++){
  let distance=i/count*perimeter,part=0;while(part<7&&distance>=lengths[part])distance-=lengths[part++];
  let x,y,nx,ny;
  if(part===0){x=tl+distance;y=0;nx=0;ny=-1;}
  else if(part===2){x=width;y=tr+distance;nx=1;ny=0;}
  else if(part===4){x=width-br-distance;y=height;nx=0;ny=1;}
  else if(part===6){x=0;y=height-bl-distance;nx=-1;ny=0;}
  else{
   const corner=(part-1)/2,radius=[tr,br,bl,tl][corner],angle=(corner-1)*Math.PI/2+(lengths[part]?distance/lengths[part]:0)*Math.PI/2;
   nx=Math.cos(angle);ny=Math.sin(angle);
   x=[width-tr,width-br,bl,tl][corner]+nx*radius;y=[tr,height-br,height-bl,tl][corner]+ny*radius;
  }
  points.push({positionX:x+5,positionY:y+5,nx,ny});
 }
 return points;
}
