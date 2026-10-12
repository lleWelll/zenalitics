import { useTokens } from '../theme/useTokens';
import classes from './Graphic404.module.css';

const FOUR = 'M64 116V6L6 80H96';

/** «404»: нули нет — вместо него бублик с вынутым сектором, как у диаграммы, из которой что-то потеряли. */
/** `decorative` — картинка рядом с текстом, который и так всё сказал: скрыта от скринридеров. */
export function Graphic404({ width = 360, decorative = false }: { width?: number | string; decorative?: boolean }) {
  const { series } = useTokens();
  const stroke = { fill: 'none', strokeWidth: 16 } as const;
  return (
    <svg className={classes.graphic} style={{ width }} viewBox="-16 -16 392 152" {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': '404: бублик с вынутым сектором между двумя четвёрками' })}>
      <g className={classes.glyph} {...stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d={FOUR} />
        <path d={FOUR} transform="translate(260 0)" />
      </g>
      <g transform="translate(180 60) rotate(-90)" {...stroke}>
        <circle className={classes.glyph} r="44" pathLength="100" strokeDasharray="70 30" strokeLinecap="round" />
        <circle r="44" pathLength="100" stroke={series[1]} strokeDasharray="13 87" strokeDashoffset="-79" strokeLinecap="round" transform="translate(6 -5)" />
      </g>
    </svg>
  );
}
