const A = '../v6/assets/';
const BG_SCALE = {1:1, 2:1.037, 3:1.22};
const BOX = {
  a09:[[102,29,405,481],[55,119,376,440],[303,168,453,355]],
  a06:[[32,47,479,453],[122,284,391,486],[246,71,485,327]],
  a01:[[102,29,405,481],[55,119,376,440],[303,168,453,355]],
  a03:[[77,43,434,376],[102,39,409,337],[240,163,488,347]],
  a05:[[118,32,391,487],[57,29,264,460],[263,151,485,357]]
};
const TILES = {
  a09:{title:'Work',els:[{e:2,r:[82,230,250,400],a:'b'},{e:1,r:[150,130,420,420],a:'b'},{e:3,r:[345,105,432,230],a:'c'}]},
  a06:{title:'Food',els:[{e:2,r:[165,335,345,432],a:'b'},{e:1,r:[95,85,365,370],a:'b'},{e:3,r:[330,215,432,330],a:'c'}]},
  a01:{title:'Family',els:[{e:1,r:[170,100,385,425],a:'b'},{e:2,r:[82,245,250,425],a:'b'},{e:3,r:[350,300,428,405],a:'b'}]},
  a03:{title:'Chilling',els:[{e:2,r:[95,90,200,190],a:'c'},{e:1,r:[120,200,395,420],a:'b'},{e:3,r:[320,240,432,330],a:'c'}]},
  a05:{title:'Chores',els:[{e:2,r:[82,190,200,425],a:'b'},{e:1,r:[160,95,350,425],a:'b'},{e:3,r:[325,215,432,325],a:'c'}]}
};
const bgOf = id => ((parseInt(id.slice(1),10)-1)%3)+1;
const bg = n => `<div class="layer" style="transform:scale(${BG_SCALE[n]})"><img src="${A}background_rgba_0000${n}_.png" alt=""></div>`;
const pct = px => (px/512*100).toFixed(2)+'%';
function art(id) {
  let h = bg(bgOf(id));
  TILES[id].els.forEach(el => {
    const b = BOX[id][el.e-1], r = el.r, bw=b[2]-b[0], bh=b[3]-b[1];
    const s = Math.min((r[2]-r[0])/bw,(r[3]-r[1])/bh);
    const tx = (r[0]+r[2])/2 - s*(b[0]+b[2])/2;
    const ty = el.a==='c' ? (r[1]+r[3])/2 - s*(b[1]+b[3])/2 : r[3]-s*b[3];
    h += `<div class="layer"><div class="place" style="transform:translate(${pct(tx)},${pct(ty)}) scale(${s.toFixed(4)})"><img src="${A}${id}_e${el.e}_00001_.png" alt=""></div></div>`;
  });
  return `<div class="stage">${h}</div>`;
}
document.querySelectorAll('[data-art]').forEach(e=>{ e.outerHTML = art(e.dataset.art); });
function toast(m){ let e=document.getElementById('toast'); if(!e){e=document.createElement('div');e.id='toast';document.body.appendChild(e);} e.textContent=m; e.classList.add('show'); setTimeout(()=>e.classList.remove('show'),1800); }
document.querySelectorAll('[data-soon]').forEach(b=>b.addEventListener('click',e=>{ e.preventDefault(); toast('Mockup: this would open the app.'); }));
