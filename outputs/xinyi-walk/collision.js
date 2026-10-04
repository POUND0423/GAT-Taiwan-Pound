// Collision operates in the horizontal X/Z plane, in meters.
export function pointInPolygon(x,z,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function segmentDistanceSq(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return (x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2;}
export function createCollider(buildings,bounds,radius=.38){
 const grid=new Map(),cell=30,polygons=[];
 for(const b of buildings){if(b.base>1.8||b.height<.2)continue;for(const poly of b.footprints){if(poly.length<3)continue;const minX=Math.min(...poly.map(p=>p[0])),maxX=Math.max(...poly.map(p=>p[0])),minZ=Math.min(...poly.map(p=>p[1])),maxZ=Math.max(...poly.map(p=>p[1]));const idx=polygons.push(poly)-1;for(let x=Math.floor((minX-radius)/cell);x<=Math.floor((maxX+radius)/cell);x++)for(let z=Math.floor((minZ-radius)/cell);z<=Math.floor((maxZ+radius)/cell);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(idx);}}}
 function blocked(x,z){if(x<bounds[0]+radius||x>bounds[2]-radius||z<bounds[1]+radius||z>bounds[3]-radius)return true;const ids=grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];for(const id of ids){const p=polygons[id];if(pointInPolygon(x,z,p))return true;for(let i=0;i<p.length;i++)if(segmentDistanceSq(x,z,p[i],p[(i+1)%p.length])<radius*radius)return true;}return false;}
 function move(x,z,dx,dz){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15)),sx=dx/steps,sz=dz/steps;for(let i=0;i<steps;i++){if(!blocked(x+sx,z+sz)){x+=sx;z+=sz;}else{if(!blocked(x+sx,z))x+=sx;if(!blocked(x,z+sz))z+=sz;}}return [x,z];}
 function safe(x,z){if(!blocked(x,z))return [x,z];for(let r=1;r<150;r+=1)for(let a=0;a<Math.PI*2;a+=.25){const nx=x+Math.cos(a)*r,nz=z+Math.sin(a)*r;if(!blocked(nx,nz))return[nx,nz];}throw new Error('找不到可站立的位置');}
 return {blocked,move,safe,polygonCount:polygons.length};
}
