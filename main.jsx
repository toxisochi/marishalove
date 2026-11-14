import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {motion,AnimatePresence} from 'framer-motion';
import Scene from './Scene';
import Letter from './Letter';
import {startMusic,stopMusic,isMusicPlaying,resumeMusic,chime} from './music';
import './style.css';
const lines=['Среди миллиардов звёзд...','Есть целая Вселенная, которая для меня особенная.','И в ней есть одна самая прекрасная планета.'];
function Orbit({size=32}){return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="9" stroke="currentColor"/><ellipse cx="20" cy="20" rx="19" ry="5" transform="rotate(-36 20 20)" stroke="currentColor"/><circle cx="32" cy="8" r="2" fill="currentColor"/></svg>}
function App(){
const [phase,P]=useState('intro'),[line,L]=useState(0),[sound,S]=useState(false),[reset,R]=useState(0);
const [soundPending,setSoundPending]=useState(false);
const manualSoundChoice=useRef(false);
const [soundNeedsTap,setSoundNeedsTap]=useState(false);
const automaticSound=useRef(true);
useEffect(()=>{if(phase==='intro'){let a=setTimeout(()=>L(1),2400),b=setTimeout(()=>L(2),5100),c=setTimeout(()=>P('explore'),7900);return ()=>[a,b,c].forEach(clearTimeout)}if(phase==='enter'){let t=setTimeout(()=>P('letter'),2800);return ()=>clearTimeout(t)}},[phase]);
function enter(){if(phase==='explore'){chime();P('enter')}}
async function changeSound(){
  if(soundPending)return
  const enable=!isMusicPlaying()
  automaticSound.current=enable
  setSoundPending(true)
  try{
    const enabled=enable ? await startMusic() : stopMusic()
    S(enabled)
    setSoundNeedsTap(enable && !enabled)
  }finally{setSoundPending(false)}
}
// Start music by default. Mobile browsers may reject sound on load, so
// the first normal screen interaction retries within the user gesture.
useEffect(()=>{
  let mounted=true
  function begin(){
    if(!automaticSound.current || isMusicPlaying())return
    startMusic().then(enabled=>{
      if(!mounted || !automaticSound.current)return
      S(enabled)
      setSoundNeedsTap(!enabled)
    })
  }
  function unlock(event){
    if(event.target?.closest?.('.audio'))return
    begin()
  }
  document.addEventListener('pointerdown',unlock,true)
  document.addEventListener('touchstart',unlock,{capture:true,passive:true})
  document.addEventListener('keydown',unlock,true)
  begin()
  return ()=>{
    mounted=false
    document.removeEventListener('pointerdown',unlock,true)
    document.removeEventListener('touchstart',unlock,true)
    document.removeEventListener('keydown',unlock,true)
  }
},[])
useEffect(()=>{const wake=()=>{if(document.visibilityState==='visible' && sound)resumeMusic()};document.addEventListener('visibilitychange',wake);return ()=>document.removeEventListener('visibilitychange',wake)},[sound]);
return <main className={'world '+phase}><Scene phase={phase} resetKey={reset} onEnter={enter}/><header><div className="brand"><Orbit/><span>marishalove<span className="domain">.love</span></span></div><button className="audio" onClick={changeSound} disabled={soundPending} aria-pressed={sound} aria-label={soundPending?'Запускается музыка':sound?'Выключить музыку':'Включить музыку'}><span className={'bars '+(sound?'playing':'')}>{[1,2,3,4,5].map(i=><i key={i}/>)}</span>{soundPending?'Запуск звука…':sound?'Звук вкл.':soundNeedsTap?'Нажми для звука':'Звук выкл.'}</button></header>
{phase==='intro'&&<div className="introcopy"><AnimatePresence mode="wait"><motion.p key={line} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{lines[line]}</motion.p></AnimatePresence><button onClick={()=>P('explore')}>Пропустить вступление　→</button></div>}
{phase==='explore'&&<motion.section className="hero" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:1}}><div className="eyebrow"><i/> ВСЕЛЕННАЯ МАРИНЫ</div><h1>Марина</h1><p className="sub">Самая прекрасная планета<br/>во Вселенной</p><p className="dedication">Я назвал её в твою честь 💜</p><button className="open" onClick={enter}><span>✧</span> Нажми на планету <b>↗</b></button></motion.section>}
{phase==='explore'&&<footer><span className="mapmark">✦</span><span className="instructions">Вращай, чтобы исследовать <em>·</em> Приближай, чтобы увидеть детали</span><button onClick={()=>R(r=>r+1)}><Orbit size={19}/> К планете</button></footer>}
{phase==='enter'&&<div className="flash"/>}{phase==='letter'&&<Letter onWish={chime} onBack={()=>{R(r=>r+1);P('explore')}}/>}</main>}
createRoot(document.getElementById('root')).render(<App/>);
