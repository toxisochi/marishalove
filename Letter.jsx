import React, { useEffect, useRef, useState } from 'react'
import './letter.css'

export const BIRTHDAY_LETTER = [
  'Среди миллиардов звёзд, бесконечных галактик и целых миров для меня есть одна особенная Вселенная — та, в которой есть ты.',
  'Я мог бы путешествовать сквозь тысячи галактик, искать самые красивые звёзды и самые удивительные планеты, но всё равно не нашёл бы ничего прекраснее тебя.',
  'Ты делаешь мой мир ярче, теплее и счастливее просто тем, что ты в нём есть.',
  'Я хочу, чтобы ты всегда улыбалась, чтобы твои мечты сбывались, а каждый новый день приносил тебе счастье.',
  'И если бы мне пришлось выбирать из целой бесконечной Вселенной, я бы снова и снова выбирал тебя.',
  'С днём рождения, моя любимая Марина. 💜',
]

const constellation = [[60,26],[44,13],[28,12],[16,23],[13,38],[23,53],[59,79],[86,58],[104,40],[104,27],[98,16],[84,11],[71,15]]

function Heart() {
  return <svg className="love-stars" viewBox="0 0 118 92" aria-hidden="true">
    <polygon points={constellation.map(p => p.join(',')).join(' ')} pathLength="1" />
    {constellation.map(([x,y], i) => <circle key={x + '-' + y} cx={x} cy={y} r={i % 3 === 0 ? 1.9 : 1.2} />)}
  </svg>
}

export default function Letter({onBack, onWish}) {
  const [wish, setWish] = useState(false)
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus({preventScroll:true}) }, [])
  function makeWish() {
    if (wish) return
    setWish(true)
    onWish?.()
  }
  return <section className="love-letter-layer" aria-labelledby="love-letter-title">
    <div className="love-letter-scroll">
      <article className="love-letter-paper">
        <Heart />
        <h1 ref={heading} tabIndex="-1" id="love-letter-title">С днём рождения, Марина 💜</h1>
        <div className="love-letter-body">{BIRTHDAY_LETTER.map((paragraph,i) =>
          <p key={i} style={{animationDelay:(0.35+i*0.17)+'s'}}>{paragraph}</p>
        )}</div>
        <div className="love-letter-actions">
          <button className={'love-wish'+(wish?' fulfilled':'')} onClick={makeWish} disabled={wish} aria-live="polite">
            {wish?'Пусть оно обязательно сбудется 💜':'Загадай желание ✨'}
          </button>
          <button className="love-back" onClick={onBack}>← Вернуться к звёздам</button>
        </div>
      </article>
    </div>
    {wish && <div className="love-meteor" aria-hidden="true" />}
  </section>
}
