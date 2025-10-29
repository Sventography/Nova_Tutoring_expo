export const STAR_GLOW_CURSOR_DATA_URL =
  `url("data:image/svg+xml;utf8,` +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
  <defs>
    <filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='1.5' result='blur'/>
      <feMerge>
        <feMergeNode in='blur'/>
        <feMergeNode in='SourceGraphic'/>
      </feMerge>
    </filter>
  </defs>
  <g filter='url(#glow)'>
    <path d='M16 3.5l3.2 6.9 7.6 1.1-5.5 5.3 1.3 7.5-6.6-3.5-6.6 3.5 1.3-7.5-5.5-5.3 7.6-1.1z' fill='#00e5ff' fill-opacity='0.95'/>
    <path d='M16 3.5l3.2 6.9 7.6 1.1-5.5 5.3 1.3 7.5-6.6-3.5-6.6 3.5 1.3-7.5-5.5-5.3 7.6-1.1z' fill='none' stroke='#b4ffff' stroke-width='1'/>
  </g>
</svg>
`) + `") 16 16, auto`;
