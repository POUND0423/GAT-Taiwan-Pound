import * as THREE from 'three';

export function createAtmosphere(renderer,scene){
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sunDir:{value:new THREE.Vector3(.4,.8,.3)}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
 varying vec3 vDir;uniform vec3 sunDir;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
 void main(){
  vec3 d=normalize(vDir);float h=max(d.y,0.0);
  vec3 c=mix(vec3(.57,.73,.83),vec3(.055,.23,.48),pow(h,.45));
  vec2 p=d.xz/(.25+h)*3.0;
  float n=noise(p)*.57+noise(p*2.1)*.28+noise(p*4.3)*.15;
  float cloud=smoothstep(.58,.75,n)*smoothstep(.015,.15,h)*(1.0-smoothstep(.65,.95,h));
  c=mix(c,vec3(.91,.94,.95),cloud*.7);
  float s=max(dot(d,sunDir),0.0);c+=vec3(1.0,.8,.58)*pow(s,100.0)*.28;
  c+=vec3(5.0,4.5,3.8)*smoothstep(.9996,.99985,s);
  gl_FragColor=vec4(c,1.0);
 }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(7000,32,16),material);scene.add(sky);
 // One shared reflection probe containing this OSM city and generated ground map.
 const environment=new THREE.Scene();environment.add(new THREE.Mesh(sky.geometry,material));
 const capture=new THREE.Group();capture.position.y=-65;environment.add(capture);
 const disposable=[];
 for(const child of scene.children){
  if(!child.isMesh||child===sky)continue;
  const source=child.material;
  const isFacade=child.geometry.getAttribute('cityVariant');
  const reflected=new THREE.MeshBasicMaterial({color:isFacade?(child.name==='Taipei 101'?0x28727c:0xc0b5a2):(source.color||0xffffff),map:isFacade?null:source.map,side:source.side});
  disposable.push(reflected);
  const mesh=new THREE.Mesh(child.geometry,reflected);mesh.position.copy(child.position);mesh.rotation.copy(child.rotation);mesh.scale.copy(child.scale);capture.add(mesh);
 }
 const pmrem=new THREE.PMREMGenerator(renderer);
 const target=pmrem.fromScene(environment,.02,.5,12000);scene.environment=target.texture;
 disposable.forEach(m=>m.dispose());
 return {sky,pmrem};
}
