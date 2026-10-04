import * as THREE from 'three';
import {createFacade} from './facade.js';
import {createAtmosphere} from './atmosphere.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createCollider} from './collision.js';
const $=id=>document.getElementById(id),keys=new Set();
let mode='bird',yaw=0,pitch=0,dragging=false,lastPointer=null,collider,data,groundImage;
let scene,camera,renderer,controls,sun,sky,pmrem,frame=0,lastFrame=performance.now(),fpsTime=0,frames=0,toastTimer;
const playerEye=1.72,clock=new THREE.Clock(),sunDirection=new THREE.Vector3(),shadowCenter=new THREE.Vector3(),target101=new THREE.Vector3(22,140,-25);
const mini=$('minimap').getContext('2d');let miniBase;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function fail(error){console.error(error);$('loading').classList.add('failed');$('loadText').textContent='城市載入失敗：'+error.message+'。請透過附帶的啟動程式開啟，並確認 assets 資料夾完整。';}
const loadTexture=(loader,url)=>new Promise((resolve,reject)=>loader.load(url,resolve,undefined,()=>reject(new Error('無法載入 '+url))));


function makeSky(){
 ({sky,pmrem}=createAtmosphere(renderer,scene));
}
function updateSun(){
 const time=+$('time').value,t=(time-6)/13*Math.PI,alt=Math.max(.09,Math.sin(t)*.9);
 sunDirection.set(Math.cos(t)*.75,alt,.38).normalize();
 sun.intensity=3.4*Math.pow(alt,.35);sun.color.setHSL(.105,.14+(1-alt)*.35,.94);
 sky.material.uniforms.sunDir.value.copy(sunDirection);updateShadow(true);
 const hr=Math.floor(time),min=Math.round((time-hr)*60);$('timeLabel').textContent=String(hr).padStart(2,'0')+':'+String(min).padStart(2,'0');
 $('lightLabel').textContent=time<10?'清晨日光':time<16?'午後日光':'傍晚暖光';
}
function updateShadow(force=false){
 const wanted=mode==='walk'?new THREE.Vector3(camera.position.x,0,camera.position.z):new THREE.Vector3();
 if(!force&&wanted.distanceToSquared(shadowCenter)<100)return;
 shadowCenter.copy(wanted);sun.target.position.copy(wanted);sun.position.copy(wanted).addScaledVector(sunDirection,1600);
 const extent=mode==='walk'?100:1050;Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:3000});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=mode==='walk'?.06:.5;
}
function buildGeometry(materials){
 for(let style=0;style<4;style++){
  const pos=[],norm=[],uv=[],variant=[],roof=[];
  for(const b of data.buildings){if(b.style!==style)continue;pos.push(...b.position);norm.push(...b.normal);uv.push(...b.uv);roof.push(...b.roof);for(let i=0;i<b.roof.length;i++)variant.push(b.variant);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('cityVariant',new THREE.Float32BufferAttribute(variant,1));g.setAttribute('cityRoof',new THREE.Float32BufferAttribute(roof,1));g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,materials[style]);mesh.name=['Concrete','Brick','Glass','Taipei 101'][style];mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 }
}
function buildRoads(segments){
 // OSM centerlines with illustrative widths on the generated map background.
 const groups=[[],[],[]],uvs=[[],[],[]];
 for(const s of segments){const [a,b]=s.points,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.15)continue;
  const pedestrian=['footway','path','pedestrian','cycleway'].includes(s.kind),major=['primary','secondary','tertiary'].includes(s.kind),group=pedestrian?1:major?2:0;
  const width=({primary:14,secondary:11,tertiary:8,residential:5,service:3,unclassified:5,footway:1.7,path:1.5,pedestrian:4,cycleway:2})[s.kind],nx=-dz/len*width/2,nz=dx/len*width/2,y=pedestrian?.035:.015;
  const points=[[a[0]+nx,y,a[1]+nz],[a[0]-nx,y,a[1]-nz],[b[0]-nx,y,b[1]-nz],[b[0]+nx,y,b[1]+nz]],coords=[[0,-width/2],[0,width/2],[len,width/2],[len,-width/2]];
  for(const i of [0,2,1,0,3,2]){groups[group].push(...points[i]);uvs[group].push(...coords[i]);}
 }
 for(let i=0;i<3;i++){const mat=new THREE.MeshStandardMaterial({color:i===1?0xa4a59f:0x363d40,roughness:.95,side:THREE.DoubleSide});
  mat.onBeforeCompile=s=>{s.vertexShader='varying vec2 roadUV;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nroadUV=uv;');s.fragmentShader='varying vec2 roadUV;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat grain=fract(sin(dot(floor(roadUV*65.0),vec2(12.989,78.2)))*43758.5);diffuseColor.rgb*=.94+grain*.12;${i===2?'float dash=step(fract(roadUV.x/8.0),.48)*(1.0-smoothstep(.06,.095,abs(roadUV.y)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.6,.61,.55),dash);':''}`);};mat.customProgramCacheKey=()=>`road-${i}`;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(groups[i],3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs[i],2));g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat);mesh.receiveShadow=true;scene.add(mesh);
 }
}
function createMini(){
 miniBase=document.createElement('canvas');miniBase.width=260;miniBase.height=160;const c=miniBase.getContext('2d');c.fillStyle='#aec4c6';c.fillRect(0,0,260,160);
 c.globalAlpha=.65;c.drawImage(groundImage,0,0,260,160);c.globalAlpha=1;
 c.fillStyle='#25465c55';for(const b of data.buildings){for(const p of b.footprints){c.beginPath();p.forEach(([x,z],i)=>{const q=miniCoords(x,z);i?c.lineTo(...q):c.moveTo(...q);});c.closePath();c.fill();}}
}
function miniCoords(x,z){const b=data.bounds;return[(x-b[0])/(b[2]-b[0])*260,(z-b[1])/(b[3]-b[1])*160];}
function drawMini(){if(!miniBase)return;mini.drawImage(miniBase,0,0);const pos=mode==='walk'?camera.position:controls.target;const [x,y]=miniCoords(pos.x,pos.z);mini.fillStyle='#fff';mini.strokeStyle='#25465c';mini.lineWidth=2;mini.beginPath();mini.arc(x,y,5,0,Math.PI*2);mini.fill();mini.stroke();if(mode==='walk'){mini.strokeStyle='#fff';mini.lineWidth=2.5;mini.beginPath();mini.moveTo(x,y);mini.lineTo(x-Math.sin(yaw)*18,y-Math.cos(yaw)*18);mini.stroke();}const tp=miniCoords(22,-25);mini.fillStyle='#dfb06f';mini.fillRect(tp[0]-3,tp[1]-3,6,6);$('position').textContent=mode==='walk'?`E ${Math.round(pos.x)} · N ${Math.round(-pos.z)} m`:'範圍 1.71 × 0.94 km';}
function setMode(next){
 keys.clear();mode=next;document.body.classList.toggle('walking',mode==='walk');controls.enabled=mode==='bird';
 for(const id of ['bird','walk']){$(id).classList.toggle('selected',id===mode);$(id).setAttribute('aria-pressed',String(id===mode));}
 $('modeLabel').textContent=mode==='bird'?'城市鳥瞰':'街道漫遊';$('walkPrompt').hidden=mode!=='walk';
 $('hint').innerHTML=mode==='bird'?'<span class="hint-dot"></span> 拖曳旋轉 · 滾輪縮放 · 右鍵平移':'<span class="hint-dot"></span> WASD 行走 · 滑鼠轉頭 · Shift 加速 · Esc 放開';
 if(mode==='bird'){if(document.pointerLockElement)document.exitPointerLock();camera.position.set(520,650,1050);controls.target.set(0,135,-40);camera.near=.2;controls.update();}
 else{camera.near=.08;spawn(78.064,252.792);}
 camera.updateProjectionMatrix();updateShadow(true);
}
function spawn(x,z){
 const p=collider.safe(x,z);camera.position.set(p[0],playerEye,p[1]);
 const direction=target101.clone().sub(camera.position);yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z))*.35;applyLook();
}
function applyLook(){pitch=THREE.MathUtils.clamp(pitch,-1.35,1.35);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}
async function enterWalk(){
 $('walkPrompt').hidden=true;
 if(!renderer.domElement.requestPointerLock){toast('按住畫面拖曳轉頭，WASD 行走');return;}
 try{await renderer.domElement.requestPointerLock();}catch(e){toast('請按住畫面拖曳轉頭，WASD 行走');}
}
function bindControls(){
 $('bird').onclick=()=>setMode('bird');$('walk').onclick=()=>setMode('walk');
 $('landmark').onclick=()=>{setMode('walk');spawn(79.2175,189.63);toast('已到台北 101 南側街道');};
 $('enterWalk').onclick=enterWalk;$('helpToggle').onclick=()=>{$('help').hidden=!$('help').hidden;};$('closeHelp').onclick=()=>{$('help').hidden=true;};
 $('time').oninput=updateSun;$('shadows').onchange=()=>{sun.castShadow=$('shadows').checked;renderer.shadowMap.needsUpdate=true;};
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){if(mode==='walk')e.preventDefault();keys.add(e.code);if(mode==='walk'&&!e.repeat)movePlayer(1/60);}});
 document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});document.addEventListener('visibilitychange',()=>keys.clear());
 document.addEventListener('pointerlockchange',()=>{keys.clear();$('walkPrompt').hidden=mode!=='walk'||!!document.pointerLockElement;});
 document.addEventListener('mousemove',e=>{if(mode!=='walk'||document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;applyLook();});
 renderer.domElement.addEventListener('pointerdown',e=>{if(mode!=='walk'||document.pointerLockElement)return;dragging=true;lastPointer=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);$('walkPrompt').hidden=true;});
 renderer.domElement.addEventListener('pointermove',e=>{if(!dragging||mode!=='walk'||document.pointerLockElement)return;yaw-=(e.clientX-lastPointer[0])*.004;pitch-=(e.clientY-lastPointer[1])*.004;lastPointer=[e.clientX,e.clientY];applyLook();});
 renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;keys.clear();});
 for(const b of document.querySelectorAll('[data-move]')){b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);keys.add(b.dataset.move);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.move);}
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
function movePlayer(dt){
 let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
 if(!forward&&!right)return;const norm=Math.hypot(forward,right),speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?13:4.5)*dt/norm;
 const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
 const p=collider.move(camera.position.x,camera.position.z,dx,dz);camera.position.set(p[0],playerEye,p[1]);updateShadow();
}
function animate(){
 const dt=Math.min(clock.getDelta(),.05);requestAnimationFrame(animate);
 if(mode==='walk')movePlayer(dt);else controls.update();
 renderer.render(scene,camera);frame++;frames++;const now=performance.now();if(now-fpsTime>1000){$('fps').textContent=Math.round(frames*1000/(now-fpsTime))+' fps';frames=0;fpsTime=now;}
 if(frame%8===0){drawMini();$('viewport').dataset.state=JSON.stringify({mode,x:+camera.position.x.toFixed(3),z:+camera.position.z.toFixed(3),yaw:+yaw.toFixed(3),blocked:mode==='walk'&&collider.blocked(camera.position.x,camera.position.z),buildings:data.buildings.length,collisionPolygons:collider.polygonCount});}
}
async function main(){
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('viewport').appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xbfd4df,.00016);camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.2,12000);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=25;controls.maxDistance=3500;
 const loader=new THREE.TextureLoader();const response=await fetch('./assets/city.json');if(!response.ok)throw new Error('建築資料讀取失敗');data=await response.json();
 const [satellite,concrete,brick,concreteNormal,brickNormal]=await Promise.all(['map-public.png','concrete-public.png','brick-public.png','normal-public.png','normal-public.png'].map(n=>loadTexture(loader,'./assets/'+n)));
 for(const t of [satellite,concrete,brick]){t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}groundImage=satellite.image;
 renderer.toneMappingExposure=.88;
 buildGeometry([createFacade(0,concrete,concreteNormal),createFacade(1,brick,brickNormal),createFacade(2,concrete,concreteNormal),createFacade(3,concrete,concreteNormal)]);
 const b=data.bounds;const ground=new THREE.Mesh(new THREE.PlaneGeometry(b[2]-b[0],b[3]-b[1]),new THREE.MeshStandardMaterial({map:satellite,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set((b[0]+b[2])/2,-.02,(b[1]+b[3])/2);ground.receiveShadow=true;scene.add(ground);
 const roadResponse=await fetch('./assets/roads.json');if(roadResponse.ok)buildRoads(await roadResponse.json());
 scene.add(new THREE.HemisphereLight(0xd6e7ff,0x786a51,.50));
 sun=new THREE.DirectionalLight(0xfff0db,2.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 makeSky();collider=createCollider(data.buildings,data.bounds);createMini();bindControls();setMode('bird');updateSun();
 // Inspection API is read-only except for explicit test-mode hooks.
 window.cityApp={state:()=>({mode,position:camera.position.toArray(),yaw,pitch,buildings:data.buildings.length,collisionPolygons:collider.polygonCount,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,blocked:mode==='walk'&&collider.blocked(camera.position.x,camera.position.z)}),collider};
 if(new URLSearchParams(location.search).has('test'))window.cityApp.test={setPlayer:(x,z,angle=0)=>{setMode('walk');const p=collider.safe(x,z);camera.position.set(p[0],playerEye,p[1]);yaw=angle;pitch=0;applyLook();$('walkPrompt').hidden=true;},step:(key,dt)=>{keys.add(key);movePlayer(dt);keys.clear();}};
 await renderer.compileAsync(scene,camera);$('loading').hidden=true;fpsTime=performance.now();animate();
}
main().catch(fail);
