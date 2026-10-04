import * as THREE from 'three';

// Metre-scaled facade details with locally generated publication atlases.
export function createFacade(kind, atlas, normalAtlas) {
 const curtainWall=kind>=2;
 const m = new THREE.MeshStandardMaterial({map:atlas,roughness:.82,envMapIntensity:1.0});
 m.onBeforeCompile=s=>{
  s.uniforms.cityNormalMap={value:normalAtlas};
  s.vertexShader='attribute float cityVariant; attribute float cityRoof; varying vec2 vCityUV; varying float vCityVariant; varying float vCityRoof;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityUV=uv;vCityVariant=cityVariant;vCityRoof=cityRoof;');
  s.fragmentShader=`varying vec2 vCityUV; varying float vCityVariant; varying float vCityRoof;
   uniform sampler2D cityNormalMap;
   float cityWindow=0.0, cityHeight=0.0, cityRough=.8;
   vec2 cityAtlasUV; float cityDetail=1.0;
   float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float cityNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(cityHash(i),cityHash(i+vec2(1,0)),f.x),mix(cityHash(i+vec2(0,1)),cityHash(i+1.0),f.x),f.y);}
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   vec2 uv=vCityUV;
   float variant=floor(vCityVariant+.5);
   cityAtlasUV=vec2((vCityVariant+clamp(fract(uv.x/4.0),.008,.992))/8.0,fract(uv.y/4.0));
   vec3 wall=texture2D(map,cityAtlasUV).rgb;
   vec3 palette=vec3(.55,.49,.38);
   if(variant<1.0)palette=vec3(.64,.61,.52);
   else if(variant<2.0)palette=vec3(.43,.45,.43);
   else if(variant<3.0)palette=vec3(.54,.40,.29);
   else if(variant<4.0)palette=vec3(.64,.62,.56);
   else if(variant<5.0)palette=vec3(.39,.32,.25);
   else if(variant<6.0)palette=vec3(.46,.38,.35);
   else if(variant<7.0)palette=vec3(.58,.53,.44);
   else palette=vec3(.29,.34,.36);
   ${kind===1?'palette=mix(vec3(.29,.105,.065),vec3(.44,.24,.14),variant/7.0);':''}
   wall=mix(wall,palette,.68);
   float facade=1.0-step(.5,vCityRoof);
   vec2 period=vec2(${curtainWall?'1.5,3.4':'3.15,3.4'});
   vec2 cell=fract(uv/period), id=floor(uv/period);
   vec2 aa=max(fwidth(uv/period),vec2(.001));
   cityDetail=1.0-smoothstep(.1,.45,max(aa.x,aa.y));
   float seed=cityHash(id+floor(vCityVariant+.5)*17.0);
   float noise=cityNoise(uv*3.0),grain=cityNoise(uv*55.0);
   float stain=cityNoise(vec2(uv.x*2.0,uv.y*.12));
   wall*=mix(.77,1.09,noise)*mix(.85,1.0,stain);
   ${kind===0?'wall=mix(wall,wall*vec3(1.13,1.02,.86),.65);':''}
   float joints=0.0;
   ${kind===1?`
    vec2 brickUV=uv/vec2(.27,.085);brickUV.x+=mod(floor(brickUV.y),2.0)*.5;
    vec2 bf=fract(brickUV),ba=max(fwidth(brickUV),vec2(.008));
    vec2 edge=smoothstep(vec2(.055)-ba,vec2(.055)+ba,bf)*(1.0-smoothstep(vec2(.945)-ba,vec2(.945)+ba,bf));
    joints=(1.0-edge.x*edge.y)*cityDetail;
    wall*=mix(.78,1.12,cityHash(floor(brickUV)));
    wall=mix(wall,vec3(.23,.22,.19),joints*.75);
   `:`
    vec2 panel=fract(uv/vec2(3.15,3.4));
    joints=(1.0-smoothstep(.006,.015,min(panel.x,panel.y)))*cityDetail;
    wall*=1.0-joints*.24;
   `}
   vec2 lo=vec2(${curtainWall?'.035,.035':'.15,.20'}),hi=vec2(${curtainWall?'.965,.93':'.85,.86'});
   vec2 outer=smoothstep(lo-aa,lo+aa,cell)*(1.0-smoothstep(hi-aa,hi+aa,cell));
   vec2 inset=vec2(.018,.016);
   vec2 inner=smoothstep(lo+inset-aa,lo+inset+aa,cell)*(1.0-smoothstep(hi-inset-aa,hi-inset+aa,cell));
   float opening=outer.x*outer.y*facade;
   cityWindow=inner.x*inner.y*facade;
   float mullion=(1.0-smoothstep(.006,.014,abs(cell.x-.5)))*cityDetail;
   float transom=(1.0-smoothstep(.006,.013,abs(cell.y-.67)))*cityDetail;
   float frames=max(mullion,transom);
   cityWindow*=1.0-frames;
   vec3 glazing=mix(vec3(.028,.070,.09),vec3(.075,.14,.17),seed);
   float curtain=step(.64,seed)*smoothstep(.35,.38,cell.y);
   float slats=.78+.22*smoothstep(.3,.55,fract(uv.y*13.0));
   glazing=mix(glazing,vec3(.30,.28,.23)*slats,curtain*.65);
   // Dark room edges, varied blinds, and a subtle lower spandrel per glass floor.
   glazing*=mix(.55,1.0,smoothstep(lo.y,lo.y+.09,cell.y));
   ${curtainWall?'wall=vec3(.085,.12,.135);':''}
   ${kind===3?'glazing=mix(vec3(.03,.15,.175),vec3(.065,.24,.27),seed);':''}
   wall=mix(wall,${kind===3?'vec3(.30,.36,.32)':'vec3(.12,.135,.14)'},opening);
   wall=mix(wall,glazing,cityWindow);
   float sill=smoothstep(lo.y-.028-aa.y,lo.y-.028+aa.y,cell.y)*(1.0-smoothstep(lo.y-aa.y,lo.y+aa.y,cell.y))*outer.x*facade;
   wall=mix(wall,vec3(.37,.365,.34),sill*.65);
   float runoff=outer.x*(1.0-smoothstep(0.0,.18,lo.y-cell.y))*step(cell.y,lo.y);
   wall*=1.0-runoff*stain*.22*facade;
   float nearDetail=1.0-smoothstep(.015,.12,max(fwidth(uv.x),fwidth(uv.y)));
   cityHeight=(-.025*opening+.018*sill-.003*joints+.00015*grain*(1.0-opening))*cityDetail*facade*nearDetail;
   cityRough=mix(.76+noise*.17,.16+seed*.12,cityWindow);
   wall=mix(wall,${kind===3?'vec3(.045,.19,.22)':kind===2?'vec3(.08,.155,.18)':'mix(palette,vec3(.04,.065,.075),.32)'},1.0-cityDetail);
   cityWindow=mix(cityWindow,${curtainWall?'.88':'.42'},1.0-cityDetail)*facade;
   vec3 roofColor=mix(vec3(.24,.255,.245),vec3(.48,.46,.39),mod(variant,3.0)/2.0);
   if(variant==3.0)roofColor=vec3(.28,.115,.073);
   if(variant==6.0)roofColor=vec3(.13,.21,.16);
   vec2 roofGrid=fract(uv/3.0),roofAA=max(fwidth(uv/3.0),vec2(.002));
   float roofSeam=(1.0-smoothstep(0.0,roofAA.x+.012,roofGrid.x))+(1.0-smoothstep(0.0,roofAA.y+.012,roofGrid.y));
   roofColor*=.93+cityNoise(uv*.5)*.12;
   roofColor*=1.0-min(roofSeam,1.0)*.12*cityDetail;
   wall=mix(wall,roofColor,1.0-facade);
   diffuseColor.rgb*=wall;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(cityRough,.09,1.0);');
  s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(.02,.32,cityWindow);');
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 qx=dFdx(-vViewPosition),qy=dFdy(-vViewPosition);
   vec3 rx=cross(qy,normal),ry=cross(normal,qx);
   float determinant=dot(qx,rx);
   vec3 gradient=sign(determinant)*(dFdx(cityHeight)*rx+dFdy(cityHeight)*ry);
   normal=normalize(abs(determinant)*normal-gradient);
   vec2 tx=dFdx(vCityUV),ty=dFdy(vCityUV);
   vec3 tangent=normalize(qx*ty.y-qy*tx.y+vec3(1.e-9));
   vec3 bitangent=normalize(-qx*ty.x+qy*tx.x+vec3(1.e-9));
   vec3 atlasNormal=texture2D(cityNormalMap,cityAtlasUV).xyz*2.0-1.0;
   normal=normalize(normal+(tangent*atlasNormal.x+bitangent*atlasNormal.y)*.10*(1.0-cityWindow)*cityDetail*nearDetail*(1.0-step(.5,vCityRoof)));
  `);
 };
 m.customProgramCacheKey=()=>`public-facade-v1-${kind}`;
 return m;
}
