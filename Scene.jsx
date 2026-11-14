import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const noise = `
float hash(vec3 p) {
  p = fract(p * vec3(.1031,.11369,.13787));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}
float n3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);
}
float fb(vec3 p) {
  float v = 0., a = .52;
  for(int i=0;i<5;i++){v+=a*n3(p);p=p.yzx*2.07+vec3(9.2,3.7,5.1);a*=.48;}
  return v;
}`
const vertex = `
varying vec3 localP, worldP, norm;
void main(){
  localP=position; worldP=(modelMatrix*vec4(position,1.)).xyz;
  norm=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);
}`
const surface = `
varying vec3 localP,worldP,norm;
uniform float clock, hover;
${noise}
void main(){
 vec3 p=normalize(localP);
 // Advection winds the different cloud layers around the axis of the planet.
 float w=fb(p*3.+vec3(clock*.011,0.,0.));
 float a=2.65*w+.8*sin(p.y*7.)+clock*.014;
 vec3 q=vec3(cos(a)*p.x-sin(a)*p.z,p.y,sin(a)*p.x+cos(a)*p.z);
 float storm=fb(q*vec3(5.,9.,5.)+w*2.3);
 float flow=fb(q*vec3(6.,27.,6.)+vec3(storm*4.,storm*4.5,w));
 float stripe=.5+.5*sin(p.y*38.+w*15.+storm*17.+flow*6.);
 float thin=.5+.5*sin(p.y*143.+storm*48.+flow*16.);
 float textureValue=clamp(.44*flow+.26*stripe+.15*thin+.35*storm-.13,0.,1.);
 vec3 col=mix(vec3(.058,.025,.145),vec3(.53,.30,.72),smoothstep(.16,.67,textureValue));
 col=mix(col,vec3(.94,.60,.79),smoothstep(.58,.9,textureValue));
 col+=vec3(.135,.074,.12)*smoothstep(.59,.78,flow);
 vec3 light=normalize(vec3(-.54,.78,.46)), N=normalize(norm);
 float sun=dot(N,light), lit=smoothstep(-.28,.77,sun);
 float rim=pow(1.-max(0.,dot(N,normalize(cameraPosition-worldP))),3.);
 col*=.16+.97*lit;
 col+=vec3(.19,.08,.32)*rim + vec3(.85,.56,.85)*pow(rim,2.)*(.32+.8*lit+hover*.4);
 gl_FragColor=vec4(col,1.);
}`
const shell = `
varying vec3 localP,worldP,norm;
uniform float hover;
void main(){
 float edge=pow(max(0.,1.-abs(dot(normalize(norm),normalize(cameraPosition-worldP)))),4.8);
 float day=.4+.6*max(0.,dot(normalize(norm),normalize(vec3(-.5,.8,.4))));
 gl_FragColor=vec4(vec3(.60,.28,.96),edge*day*(.44+hover*.35));
}`
const rings = `
varying vec3 localP,worldP,norm;
${noise}
void main(){
 float r=length(localP.xy), t=(r-1.27)/.99;
 float ripple=n3(vec3(r*185.,0.,0.))*.52+n3(vec3(r*680.,0.,0.))*.26;
 float belt=.68*exp(-pow((t-.34)/.115,2.))+.24*exp(-pow((t-.64)/.15,2.))+.16*exp(-pow((t-.92)/.024,2.));
 float a=belt*(.24+ripple)*smoothstep(.0,.08,t);
 vec3 c=mix(vec3(.56,.4,.73),vec3(.98,.78,.78),ripple+.1);
 float shadow=smoothstep(-.55,.6,localP.x+abs(localP.y)*1.3);
 gl_FragColor=vec4(c*(.35+shadow*.7),a);
}`
const sky = `
varying vec3 localP,worldP,norm;
${noise}
void main(){
 vec3 d=normalize(localP);
 float h=d.y-d.x*.28+.06;
 float shape=fb(d*4.7+vec3(4.,2.,7.));
 float cl=fb(d*11.+shape*3.);
 float dust=fb(d*25.+vec3(shape*2.,cl*5.,2.));
 float sheet=exp(-abs(h+(shape-.5)*.38)*5.);
 float lane=abs(h+(cl-.5)*.21);
 float clouds=smoothstep(.27,.77,cl*.65+dust*.35)*sheet;
 vec3 color=mix(vec3(.013,.014,.043),vec3(.049,.034,.11),shape);
 vec3 tint=mix(vec3(.24,.14,.34),vec3(.28,.32,.55),smoothstep(.35,.69,shape));
 color+=tint*clouds*(.43+.65*smoothstep(.004,.066,lane));
 color+=vec3(.06,.057,.116)*pow(dust,2.)*sheet;
 vec3 center=normalize(vec3(-10.,2.8,-43.));
 vec2 arc=(d.xy-center.xy)*vec2(1.,3.4);
 float core=exp(-length(arc)*29.)*smoothstep(.1,.8,-d.z);
 color+=core*vec3(.60,.40,.41);
 gl_FragColor=vec4(color,1.);
}`
const pointVert=`
attribute vec3 tint; attribute float radius; varying vec3 vTint;
uniform float scaleFactor; uniform float clock; uniform vec2 pointerPos;
void main(){
 vec4 mv=modelViewMatrix*vec4(position,1.);
 gl_Position=projectionMatrix*mv;
 float nearPointer=1.-smoothstep(0.,.18,length(pointerPos-gl_Position.xy/max(.001,gl_Position.w)));
 gl_PointSize=clamp(radius*scaleFactor/max(1.,-mv.z)*(1.+nearPointer*.21),.75,14.);
 vTint=tint*(.94+.06*sin(clock*.7+position.x*3.));
}`
const pointFrag=`
varying vec3 vTint;
void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=dot(p,p);if(r>1.)discard;
gl_FragColor=vec4(vTint,exp(-3.4*r)*(1.-smoothstep(.6,1.,r)));}`
function randGen() {
 let seed=63452
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
}
function StarField({mobile}) {
 const data=useMemo(()=>{
  const rand=randGen(), count=mobile?42000:114000
  const position=new Float32Array(count*3), tint=new Float32Array(count*3), radius=new Float32Array(count)
  const color=new THREE.Color(), vec=new THREE.Vector3()
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(.0001,rand())))*Math.cos(6.28*rand())
  for(let i=0;i<count;i++){
   let intensity
   if(i<count*.76){
    const arm=i%4, r=30*Math.pow(rand(),.74), theta=r*.145+arm*Math.PI*.5+gaussian()*(.11+.055*r/30)
    const x=r*Math.cos(theta), z=r*Math.sin(theta)
    vec.set(x,z*.28+gaussian()*(.36+r*.035),z*.9)
    vec.applyAxisAngle(new THREE.Vector3(0,0,1),.24)
    vec.add(new THREE.Vector3(-10,2.8,-43))
    intensity=.13+rand()*.54
    color.setRGB(.89, .75-r*.012,.84+r*.004)
    radius[i]=.04+Math.pow(rand(),4)*.14
   }else{
    const a=rand()*Math.PI*2, z=rand()*2-1, s=Math.sqrt(1-z*z), r=9+rand()*79
    vec.set(r*s*Math.cos(a),r*z,r*s*Math.sin(a))
    intensity=.38+rand()*.82
    color.setRGB(.72+rand()*.28,.63+rand()*.37,.77+rand()*.23)
    radius[i]=.035+Math.pow(rand(),9)*.20
   }
   vec.toArray(position,i*3);color.multiplyScalar(intensity).toArray(tint,i*3)
  }
  return {position,tint,radius}
 },[mobile])
 const u=useMemo(()=>({clock:{value:0},scaleFactor:{value:500},pointerPos:{value:new THREE.Vector2()}}),[])
 useFrame(({clock,size,gl,pointer})=>{u.clock.value=clock.elapsedTime;u.scaleFactor.value=size.height*gl.getPixelRatio();u.pointerPos.value.copy(pointer)})
 return <points frustumCulled={false}><bufferGeometry>
 <bufferAttribute attach="attributes-position" args={[data.position,3]}/><bufferAttribute attach="attributes-tint" args={[data.tint,3]}/><bufferAttribute attach="attributes-radius" args={[data.radius,1]}/>
 </bufferGeometry><shaderMaterial uniforms={u} vertexShader={pointVert} fragmentShader={pointFrag} depthWrite={false} transparent blending={THREE.AdditiveBlending}/></points>
}
function AtmosphereDust({phase}){
 const material=useRef(), group=useRef()
 const vertices=useMemo(()=>{
  const rand=randGen(), points=new Float32Array(4200*3)
  for(let i=0;i<points.length;i+=3){
   const a=rand()*Math.PI*2,h=rand()*2-1,s=Math.sqrt(1-h*h),r=1.06+Math.pow(rand(),2)*2.8
   points[i]=Math.cos(a)*s*r;points[i+1]=h*r;points[i+2]=Math.sin(a)*s*r
  }
  return points
 },[])
 useFrame((_,dt)=>{
  group.current.rotation.y+=dt*.028
  material.current.opacity=THREE.MathUtils.damp(material.current.opacity,phase==='enter'?.78:.12,2,dt)
 })
 return <points ref={group} raycast={()=>null}><bufferGeometry><bufferAttribute attach="attributes-position" args={[vertices,3]}/></bufferGeometry><pointsMaterial ref={material} size={.006} color="#edbaff" transparent opacity={.12} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
}
function Bloom(){
 const {gl,scene,camera,size}=useThree()
 const composer=useMemo(()=>{
  const result=new EffectComposer(gl)
  result.addPass(new RenderPass(scene,camera))
  result.addPass(new UnrealBloomPass(new THREE.Vector2(256,160),.30,.52,.73))
  return result
 },[gl,scene,camera])
 useEffect(()=>{composer.setSize(size.width,size.height)},[composer,size])
 useEffect(()=>()=>{composer.passes.forEach(p=>p.dispose?.());composer.dispose()},[composer])
 useFrame((_,dt)=>composer.render(dt),1)
 return null
}
function World({phase,onEnter,resetKey}){
 const {camera,size,gl}=useThree()
 const mobile=size.width<720
 const orbit=useRef(), planet=useRef(), system=useRef(), hovered=useRef(false), elapsed=useRef(0)
 const u=useMemo(()=>({clock:{value:0},hover:{value:0}}),[])
 const vectors=useMemo(()=>({home:new THREE.Vector3(),target:new THREE.Vector3(),offset:new THREE.Vector3()}),[])
 const planetX=mobile?0:Math.min(3.2,1.38*size.width/size.height), planetY=mobile?.97:.05
 const homeZ=mobile?Math.max(5.9,4.25*size.height/size.width):5.95
 useEffect(()=>{
  elapsed.current=0
  gl.domElement.style.cursor='grab'
  if(phase==='intro') {camera.position.set(-1,.4,homeZ+7);orbit.current?.target.set(0,0,0)}
  if(phase==='explore') {orbit.current?.target.set(0,0,0);camera.position.set(0,0,homeZ)}
  return ()=>{gl.domElement.style.cursor=''}
 },[phase,resetKey,homeZ,camera,gl])
 useFrame(({clock,pointer},delta)=>{
  const dt=Math.min(.08,delta)
  elapsed.current+=dt
  const t=elapsed.current
  u.clock.value=clock.elapsedTime
  u.hover.value=THREE.MathUtils.damp(u.hover.value,hovered.current||phase==='enter'?1:0,4,dt)
  if(planet.current) planet.current.rotation.y+=dt*(phase==='enter'?.18:.036)
  if(system.current) system.current.visible=phase!=='letter'
  if(phase==='intro'){
   camera.position.lerp(vectors.home.set(pointer.x*.09,pointer.y*.05,homeZ),1-Math.exp(-.44*dt))
   camera.lookAt(0,0,0)
  }
  if(phase==='enter'){
   const goal=vectors.target.set(planetX,planetY,0)
   if(t<=dt+.001) vectors.offset.copy(camera.position).sub(goal).normalize()
   camera.position.lerp(vectors.home.copy(goal).addScaledVector(vectors.offset,.52),1-Math.exp(-1.47*dt))
   orbit.current.target.lerp(goal,1-Math.exp(-2.6*dt));camera.lookAt(orbit.current.target)
  }
  if(phase==='letter') {camera.position.set(0,0,homeZ);camera.lookAt(-2,1,-20)}
 })
 return <>
 <mesh frustumCulled={false}><sphereGeometry args={[120,48,32]}/><shaderMaterial side={THREE.BackSide} vertexShader={vertex} fragmentShader={sky} depthWrite={false}/></mesh>
 <StarField mobile={mobile}/>
 <group ref={system} position={[planetX,planetY,0]} scale={mobile?1.07:1.24}>
 <AtmosphereDust phase={phase}/><mesh ref={planet} rotation={[.12,.2,.34]} onPointerOver={e=>{e.stopPropagation();hovered.current=true;if(phase==='explore')gl.domElement.style.cursor='pointer'}} onPointerOut={()=>{hovered.current=false;gl.domElement.style.cursor='grab'}} onClick={e=>{if(phase==='explore' && e.delta<6){e.stopPropagation();onEnter?.()}}}>
 <sphereGeometry args={[1,96,64]}/><shaderMaterial uniforms={u} vertexShader={vertex} fragmentShader={surface}/>
 </mesh>
 <mesh scale={1.026} raycast={()=>null}><sphereGeometry args={[1,72,48]}/><shaderMaterial vertexShader={vertex} fragmentShader={shell} uniforms={u} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending}/></mesh>
 <group rotation={[0,0,.31]}><mesh rotation={[1.29,0,0]} raycast={()=>null}><ringGeometry args={[1.27,2.26,224]}/><shaderMaterial vertexShader={vertex} fragmentShader={rings} transparent depthWrite={false} side={THREE.DoubleSide}/></mesh></group>
 </group>
 <OrbitControls ref={orbit} enabled={phase==='explore'} enableDamping dampingFactor={.08} enablePan={false} minDistance={2.8} maxDistance={18} autoRotate={phase==='explore'} autoRotateSpeed={.11} rotateSpeed={.54}/>
 {!mobile&&<Bloom/>}
 </>
}
export default function Scene(props){
 return <div style={{position:'absolute',inset:0}}><Canvas camera={{position:[0,0,7],fov:45,near:.05,far:180}} dpr={[1,1.5]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}><World {...props}/></Canvas></div>
}

