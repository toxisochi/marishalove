
import React, { useEffect, useRef, useState } from 'react'
import './letter.css'

export const BIRTHDAY_LETTER = [
  'Я очень рад, что ты появилась в моей жизни. С тобой даже самые обычные моменты становятся особенными, и мне хочется, чтобы таких моментов у нас было как можно больше.',
  'Я хочу пожелать тебе побольше счастливых дней, ярких впечатлений и исполнения всего, о чём ты мечтаешь. Чтобы у тебя всегда были поводы улыбаться, а рядом находились люди, которые тебя любят и ценят.',
  'Я очень тебя люблю и надеюсь, что впереди у нас ещё много всего хорошего.',
  'С днём рождения, мы со всем справимся! ❤️',
]

const constellation = [[60,26],[44,13],[28,12],[16,23],[13,38],[23,53],[59,79],[86,58],[104,40],[104,27],[98,16],[84,11],[71,15]]

function Heart() {
  return <svg className="love-stars" viewBox="0 0 118 92" aria-hidden="true">
    <polygon points={constellation.map(p => p.join(',')).join(' ')} pathLength="1" />
    {constellation.map(([x,y], i) =>
      <circle key={x + '-' + y} cx={x} cy={y} r={i % 3 === 0 ? 1.9 : 1.2} />
    )}
  </svg>
}

export default function Letter({onBack, onWish}) {
  const [wish, setWish] = useState(false)
  const heading = useRef(null)

  useEffect(() => {
    heading.current?.focus({preventScroll:true})
  }, [])

  function makeWish() {
    if (wish) return
    setWish(true)
    onWish?.()
  }

  return <section className="love-letter-layer" aria-labelledby="love-letter-title">
    <div className="love-letter-scroll">
      <article className="love-letter-paper">
        <Heart />

        <h1 ref={heading} tabIndex="-1" id="love-letter-title">
          💜 С днём рождения, моя любимая Марина! 💜
        </h1>

        <div className="love-letter-body">
          {BIRTHDAY_LETTER.map((paragraph, i) =>
            <p key={i} style={{animationDelay:(0.35+i*0.17)+'s'}}>
              {paragraph}
            </p>
          )}
        </div>

        <p style={{
          fontSize: '12px',
          opacity: 0.55,
          textAlign: 'center',
          marginTop: '24px',
          fontStyle: 'italic'
        }}>
          надеюсь, сегодня увидимся с тобой ❤️
        </p>

        <div className="love-letter-actions">
          <button
            className={'love-wish'+(wish?' fulfilled':'')}
            onClick={makeWish}
            disabled={wish}
            aria-live="polite"
          >
            {wish
              ? 'Пусть оно обязательно сбудется 💜'
              : 'Загадай желание ✨'}
          </button>

          <button className="love-back" onClick={onBack}>
            ← Вернуться к звёздам
          </button>
        </div>
      </article>
    </div>

    {wish && <div className="love-meteor" aria-hidden="true" />}
  </section>
}
