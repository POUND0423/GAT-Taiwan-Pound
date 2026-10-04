import fs from 'node:fs';import assert from 'node:assert/strict';
import {createCollider,pointInPolygon} from '../outputs/xinyi-walk/collision.js';
const square={base:0,height:10,footprints:[[[0,0],[10,0],[10,10],[0,10]]]};
const c=createCollider([square],[-50,-50,50,50]);
assert(c.blocked(5,5));assert(c.blocked(-.2,5));assert(!c.blocked(-1,5));
const p=c.move(-10,5,40,0);assert(p[0]<-.35,'must not tunnel through a building at high speed');
const slide=c.move(-1,2,4,5);assert(slide[0]<-.35&&slide[1]>6,'must slide along walls');
assert(c.blocked(50,0),'extent edge blocks walking');assert(!c.blocked(...c.safe(5,5)),'spawn recovers from building interior');
const overhead=createCollider([{...square,base:5}],[-50,-50,50,50]);assert(!overhead.blocked(5,5),'walk under elevated parts');
const data=JSON.parse(fs.readFileSync(new URL('../outputs/xinyi-walk/assets/city.json',import.meta.url),'utf8'));const real=createCollider(data.buildings,data.bounds);
assert.equal(data.buildings.length,1166);assert(real.polygonCount>900);
for(const anchor of [[79.2175,189.63],[78.064,252.792]]){const spawn=real.safe(...anchor);assert(!real.blocked(...spawn));}
let checked=0;for(const b of data.buildings){assert(b.position.length===b.normal.length);assert(b.uv.length===b.position.length/3*2);if(b.base>1.8)continue;for(const poly of b.footprints){for(let i=0;i<poly.length;i++){const a=poly[i],d=poly[(i+1)%poly.length],dx=d[0]-a[0],dz=d[1]-a[1],len=Math.hypot(dx,dz);if(len<2)continue;const mid=[(a[0]+d[0])/2,(a[1]+d[1])/2];for(const sign of [-1,1]){const start=[mid[0]+sign*dz/len,mid[1]-sign*dx/len];if(real.blocked(...start))continue;const end=real.move(...start,-sign*dz/len*3,sign*dx/len*3);assert(!real.blocked(...end));checked++;break;}break;}}}
assert(checked>500);console.log(JSON.stringify({passed:true,buildings:data.buildings.length,collisionPolygons:real.polygonCount,realWallSweeps:checked,landmarkSpawn:real.safe(30,190),walkSpawn:real.safe(-100,145)}));
