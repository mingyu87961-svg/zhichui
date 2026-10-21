import { mkdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../public/food/', import.meta.url);
mkdirSync(dir, { recursive: true });
const palette = { rice: '#eee6d7', noodle: '#e6eadc', vegetable: '#e4eadb', egg: '#f3e2c9', tofu: '#f0e4d4', chicken: '#eadfd3' };
const rand = seed => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
for (const [kind, background] of Object.entries(palette)) {
  const r = rand(kind.charCodeAt(0));
  let food = '';
  if (kind === 'noodle') {
    food += '<ellipse cx="360" cy="209" rx="144" ry="102" fill="#b96437"/>';
    for (let i = 0; i < 30; i++) {
      const x = 252 + r() * 180, y = 144 + r() * 110;
      food += `<path d="M${x},${y}q65,-23 91,8t-82,24q-55,25 2,39" fill="none" stroke="${i % 3 ? '#efcb84' : '#f7dfaa'}" stroke-width="7" stroke-linecap="round"/>`;
    }
  } else {
    food += '<ellipse cx="360" cy="209" rx="144" ry="102" fill="#f9f3df"/>';
    for (let i = 0; i < 105; i++) {
      const x = 230 + r() * 260, y = 126 + r() * 163;
      if (((x - 360) / 137) ** 2 + ((y - 209) / 93) ** 2 < 1) food += `<ellipse cx="${x}" cy="${y}" rx="${4+r()*4}" ry="2.7" fill="${i%2 ? '#e1d4aa' : '#fff9e9'}" transform="rotate(${r()*160} ${x} ${y})"/>`;
    }
  }
  if (['rice', 'egg'].includes(kind)) {
    for (let i = 0; i < 8; i++) {
      const x = 280+r()*154, y = 135+r()*130;
      food += `<path d="M${x},${y}q-21,-16 -31,7t25,25q24,0 22,-17Z" fill="#e5a623" stroke="#f2c25a" stroke-width="5"/>`;
      food += `<path d="M${x+23},${y-12}l29,13q-3,25 -28,26q-18,-15 -1,-39Z" fill="#d95d3f" stroke="#ee7e54" stroke-width="3"/>`;
    }
  } else if (kind === 'tofu') {
    for (let i=0;i<14;i++) { const x=258+r()*178,y=142+r()*120;food+=`<path d="M${x},${y}l28,-7 16,19 -29,9Z" fill="#fbdeb4" stroke="#ba774b" stroke-width="2"/><path d="M${x},${y}v16l29,11 0,-18Z" fill="#d49c64"/>`; }
  } else if (kind === 'chicken') {
    for (let i=0;i<15;i++) { const x=264+r()*170,y=144+r()*124;food+=`<path d="M${x},${y}q-14,-11 -22,11t23,23q28,3 28,-18t-29,-16Z" fill="${i%2?'#b56938':'#d59854'}" stroke="#e5b57d" stroke-width="3"/>`; }
  }
  const greenCount = kind === 'vegetable' ? 28 : 9;
  for(let i=0;i<greenCount;i++){const x=258+r()*196,y=142+r()*127;food+=`<path d="M${x},${y}q-24,-27 -34,-6q-7,25 34,6q20,-24 30,-9t-30,9" fill="${i%2?'#397c49':'#70a95a'}"/><path d="m${x-2},${y-7} 4,19" stroke="#b5c88b" stroke-width="4" stroke-linecap="round"/>`;}
  if(kind==='noodle') food+='<ellipse cx="393" cy="174" rx="33" ry="24" fill="#fff5dc" transform="rotate(20 393 174)"/><ellipse cx="393" cy="174" rx="17" ry="14" fill="#e6ad30"/>';
  for(let i=0;i<10;i++){const x=280+r()*164,y=147+r()*110;food+=`<ellipse cx="${x}" cy="${y}" rx="3.5" ry="2" fill="#f3ddad"/>`;}
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440"><defs><filter id="shadow"><feGaussianBlur stdDeviation="10"/></filter><clipPath id="food"><ellipse cx="360" cy="209" rx="145" ry="104"/></clipPath><radialGradient id="plate"><stop stop-color="#fffdf8"/><stop offset=".78" stop-color="#faf6eb"/><stop offset="1" stop-color="#e6ded0"/></radialGradient></defs><rect width="720" height="440" fill="${background}"/><path d="M0,325 720,250v190H0Z" fill="#fff9ec" opacity=".25"/><path d="M83,70 197,33 285,364 171,400Z" fill="#fbf8ef" opacity=".7"/><path d="M104,63 192,392m-67,-336 88,329" stroke="#d1d6c3" stroke-width="3" opacity=".6"/><ellipse cx="369" cy="235" rx="183" ry="121" fill="#7a6042" opacity=".17" filter="url(#shadow)"/><ellipse cx="360" cy="216" rx="185" ry="138" fill="#ddd4c4"/><ellipse cx="360" cy="206" rx="185" ry="135" fill="url(#plate)"/><ellipse cx="360" cy="207" rx="151" ry="110" fill="#d9d0ba"/><g clip-path="url(#food)">${food}</g><path d="m548,64 35,285m-17,-288 35,285" stroke="#966847" stroke-width="9" stroke-linecap="round"/><path d="m548,64 12,99m6,-102 12,99" stroke="#c29568" stroke-width="5" stroke-linecap="round"/><g transform="translate(124 296) rotate(-19)"><ellipse rx="26" ry="35" fill="#6e9b67"/><path d="M0,-26V30m0,-6L-16,9m16,0L16,-7" stroke="#b4c995" stroke-width="2"/></g></svg>`;
  writeFileSync(new URL(`${kind}.svg`, dir), svg);
}
writeFileSync(new URL('../public/favicon.svg', import.meta.url), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="19" fill="#c85b3d"/><path d="M13 30h38c-1 17-8 23-19 23S14 47 13 30" fill="#fff6df"/><path d="M22 13q-6 6 0 11m11-13q-6 6 0 11m11-9q-6 6 0 11" stroke="#fff6df" stroke-width="3" fill="none" stroke-linecap="round"/></svg>');
console.log('Generated six original food illustrations and favicon.');
