import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ─── THEME ─── */
const C = {
  bg:"#010208", card:"rgba(255,255,255,0.04)", surface:"rgba(0,255,179,0.05)",
  primary:"#00FFB3", blue:"#00CFFF", accent:"#FF3D71", gold:"#FFD166",
  purple:"#CC44FF", orange:"#FF9A3C", green:"#00C07F",
  t1:"#D0FFF0", t2:"rgba(208,255,240,0.45)", t3:"rgba(208,255,240,0.18)",
  border:"rgba(0,255,179,0.12)", glass:"rgba(1,6,16,0.82)",
};
const roleColor = (role) => role==="coach"?"#CC44FF":role==="referee"?"#FFD166":"#00FFB3";

/* ─── DATA ─── */
// Only the current user's "add story" slot — real friend stories come from the backend.
const STORIES=[
  {id:1,user:"אסף",initials:"AS",color:"#3B5BDB",hasStory:false,isMe:true},
];
// Social feed comes from the real backend. Empty until users actually post.
const FEED_FOLLOWING=[];
const FEED_FOR_YOU=[];
// Games come from the real backend.
const GAMES_URGENT=[];
const GAMES_SOON=[];
// Chats come from the real backend.
const CHATS=[];
const SPORT_FILTERS=[
  {k:"all",icon:"🏅",label:"הכל"},{k:"foot",icon:"⚽",label:"כדורגל"},
  {k:"bball",icon:"🏀",label:"כדורסל"},{k:"ten",icon:"🎾",label:"טניס"},
  {k:"pad",icon:"🎯",label:"פאדל"},{k:"run",icon:"🏃",label:"ריצה"},
];
const HEAT_FILTERS=[
  {k:"all",icon:"🌍",label:"הכל",color:"#FF4757"},
  {k:"run",icon:"🏃",label:"ריצה",color:"#FF4757"},
  {k:"ride",icon:"🚴",label:"רכיבה",color:"#CC44FF"},
  {k:"walk",icon:"🚶",label:"הליכה",color:"#4D9FFF"},
  {k:"football",icon:"⚽",label:"כדורגל",color:"#00C07F"},
  {k:"basketball",icon:"🏀",label:"כדורסל",color:"#FF9A3C"},
];
// Hotspot definition: {lat,lng,radius,sport,weight}
const HOTSPOTS=[
  {lat:52.3578,lng:4.8705,r:0.007,sports:["run","ride","walk"],base:9},
  {lat:52.3318,lng:4.8993,r:0.006,sports:["run","walk"],base:8},
  {lat:52.3802,lng:4.9000,r:0.008,sports:["ride","walk"],base:8},
  {lat:52.3676,lng:4.9100,r:0.009,sports:["walk","run"],base:7},
  {lat:52.3752,lng:4.8840,r:0.006,sports:["walk"],base:6},
  {lat:52.3197,lng:4.8673,r:0.010,sports:["run","ride"],base:8},
  {lat:52.3861,lng:4.8290,r:0.003,sports:["football"],base:9},
  {lat:52.3470,lng:4.8673,r:0.003,sports:["football"],base:8},
  {lat:52.3585,lng:4.8840,r:0.004,sports:["basketball","walk"],base:8},
  {lat:52.3600,lng:4.9166,r:0.003,sports:["basketball"],base:7},
  {lat:52.3600,lng:4.9040,r:0.008,sports:["ride"],base:8},
  {lat:52.3633,lng:4.9034,r:0.003,sports:["football"],base:7},
];
// Zone stats come from mapDataService (real backend).
const ZONE_STATS=[];
const USER = {name:"אסף",initials:"AS",elo:1540,role:"player",sports:["football","running"],wins:8,losses:2,draws:1,defense:8.2,offense:7.6,xp:3200,
  challenges:[
    {id:1,title:"שחק 5 משחקים השבוע",icon:"🔥",progress:3,total:5,done:false,reward:"50 XP",color:"#FF6B2B"},
    {id:2,title:"נקד 8+ הגנה ב-3 משחקים",icon:"🛡️",progress:2,total:3,done:false,reward:"40 XP",color:"#4D9FFF"},
    {id:3,title:"שחק עם 10 שחקנים שונים",icon:"🌐",progress:7,total:10,done:false,reward:"75 XP",color:"#B060FF"},
    {id:4,title:"קבע משחק תוך 24 שעות",icon:"⚡",progress:1,total:1,done:true,reward:"30 XP",color:"#FFD166"},
    {id:5,title:"ניצח 3 משחקים ברצף",icon:"🏆",progress:1,total:3,done:false,reward:"100 XP",color:"#FFD166"},
    {id:6,title:"הצטרף לקבוצה חדשה",icon:"👥",progress:0,total:1,done:false,reward:"25 XP",color:"#00F5A0"},
  ],
};

/* ─── COORD TRANSFORM: Amsterdam lat/lng → canvas px ─── */
const MAP_LAT_MIN=52.28, MAP_LAT_MAX=52.43, MAP_LNG_MIN=4.83, MAP_LNG_MAX=4.99;
function toCanvas(lat, lng, w, h) {
  const x = ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * w;
  const y = ((MAP_LAT_MAX - lat) / (MAP_LAT_MAX - MAP_LAT_MIN)) * h;
  return [x, y];
}

/* ─── LIVE SIMULATION ENGINE ─── */
let _uid = 0;
function useMapSim(sport, active) {
  const buf = useRef([]);
  const [tick, setTick] = useState(0);
  useEffect(()=>{
    if(!active) return;
    const spawn = setInterval(()=>{
      const n = 4 + Math.floor(Math.random()*6);
      const now = Date.now();
      const pts = Array.from({length:n},()=>{
        const h = HOTSPOTS[Math.floor(Math.random()*HOTSPOTS.length)];
        const s = h.sports[Math.floor(Math.random()*h.sports.length)];
        return {id:_uid++,lat:h.lat+(Math.random()-0.5)*h.r*2,lng:h.lng+(Math.random()-0.5)*h.r*2,type:s,base:h.base*(0.6+Math.random()*0.4),born:now};
      });
      buf.current = [...buf.current,...pts].slice(-420);
      setTick(t=>t+1);
    },3000);
    const prune = setInterval(()=>{
      const now=Date.now();
      buf.current = buf.current.filter(p=>now-p.born<180000);
      setTick(t=>t+1);
    },1000);
    return()=>{clearInterval(spawn);clearInterval(prune);};
  },[active]);
  const now = Date.now();
  return buf.current.filter(p=>sport==="all"||p.type===sport).map(p=>({
    ...p, weight: p.base * Math.max(0, 1-(now-p.born)/180000) * ((now-p.born)/180000<0.2?(now-p.born)/36000:1),
  }));
}

/* ─── MAP CANVAS RENDERER ─── */
function HeatCanvas({sport, active}) {
  const ref = useRef(null);
  const pts = useMapSim(sport, active);
  const hf = HEAT_FILTERS.find(f=>f.k===sport)||HEAT_FILTERS[0];

  useEffect(()=>{
    const c = ref.current; if(!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0,0,W,H);

    // ── Dark map background
    ctx.fillStyle="#080c18";
    ctx.fillRect(0,0,W,H);

    // ── Grid lines (streets feel)
    ctx.strokeStyle="rgba(255,255,255,0.03)";
    ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // ── IJ River (main water body)
    ctx.fillStyle="rgba(4,15,40,0.9)";
    ctx.beginPath();
    const [rx1]=toCanvas(52.390,4.84,W,H);
    const [rx2,ry]=toCanvas(52.380,4.99,W,H);
    ctx.fillRect(rx1-5,ry-8,rx2-rx1+20,22);

    // ── Amstel river
    ctx.strokeStyle="rgba(4,15,40,0.8)";
    ctx.lineWidth=8;
    ctx.beginPath();
    const [ax,ay]=toCanvas(52.42,4.90,W,H);
    const [ax2,ay2]=toCanvas(52.32,4.90,W,H);
    ctx.moveTo(ax,ay); ctx.bezierCurveTo(ax+10,ay+(ay2-ay)*0.4,ax2+15,ay+(ay2-ay)*0.6,ax2,ay2);
    ctx.stroke();

    // ── Heatmap blobs — "screen" blend for glow
    ctx.globalCompositeOperation="screen";
    const colors = {
      run:"255,71,87", ride:"204,68,255", walk:"77,159,255",
      football:"0,192,127", basketball:"255,154,60", all:"255,71,87",
    };
    const col = colors[sport]||colors.all;

    pts.forEach(p=>{
      const [x,y]=toCanvas(p.lat,p.lng,W,H);
      const r = 28 + p.weight*3;
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      const a = Math.min(0.85, p.weight/10*0.8+0.05);
      g.addColorStop(0,`rgba(${col},${a})`);
      g.addColorStop(0.4,`rgba(${col},${a*0.5})`);
      g.addColorStop(1,`rgba(${col},0)`);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    });

    ctx.globalCompositeOperation="source-over";

    // Live user dots come from the real backend (currently none connected).
    const liveDots=[];
    const dotColors={run:"#00FFB3",ride:"#CC44FF",walk:"#4D9FFF",football:"#00C07F",basketball:"#FF9A3C"};
    const pulse=(Date.now()%2000)/2000;
    liveDots.filter(d=>sport==="all"||d.type===sport).forEach((d,i)=>{
      const [x,y]=toCanvas(d.lat,d.lng,W,H);
      const dc=dotColors[d.type]||"#00FFB3";
      // Pulse ring
      const pr=8+pulse*12;
      const pa=0.6*(1-pulse);
      ctx.beginPath(); ctx.arc(x,y,pr,0,Math.PI*2);
      ctx.strokeStyle=dc+Math.round(pa*255).toString(16).padStart(2,"0");
      ctx.lineWidth=1.5; ctx.stroke();
      // Core dot
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle=dc; ctx.fill();
    });

    // ── Field markers
    [[52.3861,4.8290,"⚽"],[52.3585,4.8840,"🏀"],[52.3600,4.9040,"🚴"]].forEach(([lat,lng,icon])=>{
      const [x,y]=toCanvas(lat,lng,W,H);
      ctx.font="10px serif"; ctx.fillStyle="rgba(255,255,255,0.6)";
      ctx.textAlign="center"; ctx.fillText(icon,x,y);
    });

  },[pts, sport]);

  // Keep redrawing for pulse animation
  const rafRef = useRef(null);
  useEffect(()=>{
    const loop=()=>{ rafRef.current=requestAnimationFrame(loop); if(ref.current){const ctx=ref.current.getContext("2d"); /* re-render handled by pts */ } };
    // Pulse every 50ms
    const id=setInterval(()=>setTick&&null,50);
    return()=>clearInterval(id);
  },[]);

  return <canvas ref={ref} width={380} height={400} style={{width:"100%",height:"100%",display:"block"}}/>;
}

/* ─── SHARED COMPONENTS ─── */
function Avatar({initials,color,size=36,online=false}){
  return(
    <div style={{position:"relative",flexShrink:0}}>
      <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}88)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:size*0.35,border:`1.5px solid ${color}44`}}>
        {initials.length<=2?initials:<span style={{fontSize:size*0.45}}>{initials}</span>}
      </div>
      {online&&<div style={{position:"absolute",bottom:1,right:1,width:9,height:9,borderRadius:"50%",background:"#00FFB3",border:"1.5px solid #010208",boxShadow:"0 0 6px #00FFB3"}}/>}
    </div>
  );
}
function Pill({label,active,color="#00FFB3",onClick}){
  return(
    <button onClick={onClick} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color+"66":"rgba(255,255,255,0.08)"}`,background:active?`${color}14`:"transparent",color:active?color:"rgba(255,255,255,0.35)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>
      {label}
    </button>
  );
}
function Sheet({open,onClose,children,title,h="88vh"}){
  if(!open) return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,margin:"0 auto",background:"#0A0F1E",borderRadius:"20px 20px 0 0",padding:"0 0 40px",border:"1px solid rgba(255,255,255,0.07)",maxHeight:h,overflowY:"auto"}}>
        <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.12)",margin:"12px auto 0"}}/>
        {title&&<div style={{padding:"12px 18px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)",color:C.t1,fontWeight:800,fontSize:15,direction:"rtl"}}>{title}</div>}
        <div style={{padding:"12px 16px"}}>{children}</div>
      </div>
    </div>
  );
}
function StatBadge({label,value,color=C.primary}){
  return(
    <div style={{flex:1,textAlign:"center",padding:"10px 6px",background:"rgba(255,255,255,0.03)",borderRadius:12,border:"1px solid rgba(255,255,255,0.05)"}}>
      <div style={{color,fontWeight:900,fontSize:18,letterSpacing:"-0.02em"}}>{value}</div>
      <div style={{color:C.t2,fontSize:9,fontWeight:600,marginTop:2}}>{label}</div>
    </div>
  );
}

/* ─── HOME PAGE ─── */
function HomePage(){
  const [feedTab,setFeedTab]=useState("following");
  const [likedPosts,setLikedPosts]=useState(new Set());
  const feed = feedTab==="following"?FEED_FOLLOWING:FEED_FOR_YOU;
  const typeColor={result:"#00C07F",event:"#4D9FFF",training:"#CC44FF",achievement:"#FFD166"};
  const roleLabel={player:"שחקן",coach:"מאמן",referee:"שופט"};

  return(
    <div style={{paddingBottom:100}}>
      {/* Stories */}
      <div style={{padding:"10px 0 4px"}}>
        <div style={{display:"flex",gap:12,overflowX:"auto",paddingInline:16,paddingBottom:8,scrollbarWidth:"none"}}>
          {STORIES.map(s=>(
            <div key={s.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0}}>
              <div style={{padding:2,borderRadius:"50%",background:s.hasStory?`linear-gradient(135deg,${C.primary},${C.blue},${C.accent})`:"rgba(255,255,255,0.1)",cursor:"pointer"}}>
                <div style={{width:58,height:58,borderRadius:"50%",background:s.isMe?"rgba(255,255,255,0.08)":`linear-gradient(135deg,${s.color},${s.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",border:"2.5px solid #010208",color:"#fff",fontWeight:800,fontSize:20}}>
                  {s.isMe?"＋":s.initials}
                </div>
              </div>
              <span style={{color:C.t2,fontSize:9,fontWeight:600}}>{s.user}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed tabs */}
      <div style={{display:"flex",paddingInline:16,gap:0,borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:12}}>
        {[["following","עוקב"],["forYou","בשבילך"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFeedTab(k)} style={{flex:1,padding:"10px 0",background:"none",border:"none",cursor:"pointer",color:feedTab===k?C.primary:C.t2,fontWeight:feedTab===k?800:500,fontSize:13,fontFamily:"inherit",borderBottom:`2px solid ${feedTab===k?C.primary:"transparent"}`,transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        {feed.length===0&&(
          <div style={{textAlign:"center",padding:"48px 24px",direction:"rtl"}}>
            <div style={{fontSize:36,marginBottom:12}}>🏃</div>
            <div style={{color:"rgba(208,255,240,0.55)",fontWeight:700,fontSize:15,marginBottom:6}}>
              {feedTab==="following"?"אין פוסטים עדיין":"אין תוכן בשבילך עדיין"}
            </div>
            <div style={{color:"rgba(208,255,240,0.25)",fontSize:12}}>
              {feedTab==="following"?"עקוב אחרי שחקנים כדי לראות את הפידים שלהם כאן":"הצטרף לאירועים ומצא שחקנים כדי לגלות תוכן"}
            </div>
          </div>
        )}
        {feed.map(post=>{
          const tc=typeColor[post.type]||C.primary;
          const liked=likedPosts.has(post.id);
          return(
            <div key={post.id} style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{display:"flex",gap:10,direction:"rtl"}}>
                <Avatar initials={post.initials} color={post.initials==="CR"?"#0077CC":post.initials==="MY"?"#A855F7":post.initials==="DB"?"#FF4757":post.initials==="YF"?"#FFD166":"#00C07F"} size={38}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{color:C.t1,fontWeight:700,fontSize:13}}>{post.user}</span>
                    <span style={{background:`${tc}18`,color:tc,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,border:`1px solid ${tc}33`}}>{roleLabel[post.role]}</span>
                    <span style={{color:C.t3,fontSize:10,marginRight:"auto"}}>{post.time}</span>
                  </div>
                  <p style={{color:C.t1,fontSize:13,lineHeight:1.55,margin:"0 0 8px"}}>{post.content}</p>
                  {post.score&&<div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,255,179,0.05)",border:"1px solid rgba(0,255,179,0.15)",borderRadius:10,padding:"5px 12px",marginBottom:8}}><span style={{color:C.primary,fontWeight:900,fontSize:16,letterSpacing:"0.04em"}}>{post.score}</span></div>}
                  {post.isEvent&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(77,159,255,0.06)",border:"1px solid rgba(77,159,255,0.15)",borderRadius:10,padding:"4px 10px",marginBottom:8,cursor:"pointer"}}><span style={{color:"#4D9FFF",fontSize:11,fontWeight:700}}>📅 {post.location}</span>{post.slots&&<span style={{background:"rgba(255,61,113,0.15)",color:"#FF3D71",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:6}}>{post.slots} מקומות</span>}</div>}
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    {post.tags.map(t=><span key={t} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"2px 8px",color:C.t2,fontSize:10}}>{t}</span>)}
                  </div>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <button onClick={()=>setLikedPosts(s=>{const n=new Set(s);n.has(post.id)?n.delete(post.id):n.add(post.id);return n;})} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:liked?C.accent:C.t2,padding:0,fontFamily:"inherit",fontSize:11,fontWeight:600}}>
                      {liked?"❤️":"🤍"} {post.likes+(liked?1:0)}
                    </button>
                    <button style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:C.t2,padding:0,fontFamily:"inherit",fontSize:11,fontWeight:600}}>💬 {post.comments}</button>
                    <button style={{background:"none",border:"none",cursor:"pointer",color:C.t2,padding:0,fontFamily:"inherit",fontSize:11,fontWeight:600}}>↗ שתף</button>
                    <span style={{marginRight:"auto",background:"rgba(0,255,179,0.06)",borderRadius:6,padding:"2px 7px",color:"rgba(0,255,179,0.6)",fontSize:9,fontWeight:700}}>ELO {post.elo}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PLAY PAGE ─── */
function PlayPage(){
  const [timeF,setTimeF]=useState("now");
  const [sportF,setSportF]=useState("all");
  const [joined,setJoined]=useState(new Set());
  const [liveCount,setLiveCount]=useState(0); // real count from backend
  const TIME_TABS=[{k:"now",icon:"🔴",label:"עכשיו",count:liveCount},{k:"today",icon:"☀️",label:"היום",count:0},{k:"evening",icon:"🌙",label:"ערב",count:0},{k:"tomorrow",icon:"📅",label:"מחר",count:0},{k:"week",icon:"🗓️",label:"השבוע",count:0}];

  return(
    <div style={{paddingBottom:100}}>
      {/* Hero */}
      <div style={{margin:"12px 14px 0",borderRadius:22,background:"linear-gradient(155deg,#020A10,#081A14)",border:"1px solid rgba(0,255,179,0.12)",padding:"18px 18px 16px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-20,width:160,height:160,borderRadius:"50%",background:"rgba(0,255,179,0.06)",filter:"blur(40px)",pointerEvents:"none"}}/>
        <div style={{color:"rgba(0,255,179,0.6)",fontSize:11,fontWeight:600,marginBottom:4,position:"relative"}}>פעיל עכשיו</div>
        <div style={{color:C.t1,fontWeight:900,fontSize:26,letterSpacing:"-0.02em",position:"relative"}}>מצא משחק <span style={{color:C.primary}}>עכשיו</span></div>
        <div style={{color:C.t2,fontSize:12,marginTop:3,position:"relative"}}>מצאנו {liveCount} משחקים פתוחים לידך</div>
        <div style={{display:"flex",gap:8,marginTop:12,position:"relative"}}>
          <button style={{flex:1,padding:"10px 0",borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.blue})`,border:"none",color:"#000",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>⚡ הצטרף עכשיו</button>
          <button style={{padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.t1,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ צור משחק</button>
        </div>
      </div>

      {/* Time filter */}
      <div style={{overflowX:"auto",padding:"12px 14px 4px",scrollbarWidth:"none"}}>
        <div style={{display:"flex",gap:6}}>
          {TIME_TABS.map(t=>(
            <button key={t.k} onClick={()=>setTimeF(t.k)} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 12px",borderRadius:14,border:`1px solid ${timeF===t.k?C.primary+"55":"rgba(255,255,255,0.07)"}`,background:timeF===t.k?"rgba(0,255,179,0.08)":"transparent",cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{fontSize:14}}>{t.icon}</span>
              <span style={{color:timeF===t.k?C.primary:C.t2,fontSize:10,fontWeight:700}}>{t.label}</span>
              <span style={{background:timeF===t.k?C.primary:"rgba(255,255,255,0.1)",color:timeF===t.k?"#000":"rgba(255,255,255,0.4)",borderRadius:8,padding:"0 5px",fontSize:9,fontWeight:800}}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sport filter */}
      <div style={{overflowX:"auto",padding:"6px 14px 8px",scrollbarWidth:"none"}}>
        <div style={{display:"flex",gap:5}}>
          {SPORT_FILTERS.map(s=><Pill key={s.k} label={`${s.icon} ${s.label}`} active={sportF===s.k} onClick={()=>setSportF(s.k)}/>)}
        </div>
      </div>

      {/* Urgent games */}
      <div style={{padding:"4px 14px 0"}}>
        <div style={{color:C.t1,fontWeight:800,fontSize:14,marginBottom:10,direction:"rtl"}}>🔥 דחוף — מקומות אחרונים</div>
        {GAMES_URGENT.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",direction:"rtl"}}>
            <div style={{color:"rgba(208,255,240,0.3)",fontSize:12}}>אין משחקים דחופים כרגע</div>
          </div>
        )}
        <div style={{display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
          {GAMES_URGENT.map(g=>(
            <div key={g.id} style={{flexShrink:0,width:180,background:`${g.color}08`,border:`1px solid ${g.color}22`,borderRadius:16,padding:"12px",cursor:"pointer",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`${g.color}10`,filter:"blur(20px)"}}/>
              <div style={{fontSize:24,marginBottom:6}}>{g.sport}</div>
              <div style={{color:"#fff",fontWeight:800,fontSize:13,marginBottom:4}}>{g.title}</div>
              <div style={{color:C.t2,fontSize:10,marginBottom:6}}>📍 {g.loc} · {g.time}</div>
              <div style={{background:`${g.badgeColor}18`,border:`1px solid ${g.badgeColor}33`,borderRadius:8,padding:"3px 8px",display:"inline-block"}}>
                <span style={{color:g.badgeColor,fontSize:9,fontWeight:800}}>{g.badge}</span>
              </div>
              <button onClick={()=>setJoined(s=>{const n=new Set(s);n.has(g.id)?n.delete(g.id):n.add(g.id);return n;})} style={{width:"100%",marginTop:8,padding:"6px 0",borderRadius:10,border:"none",background:joined.has(g.id)?`${g.color}33`:`linear-gradient(135deg,${g.color},${g.color}AA)`,color:joined.has(g.id)?g.color:"#000",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                {joined.has(g.id)?"✓ הצטרפת":"הצטרף"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Games soon */}
      <div style={{padding:"14px 14px 0"}}>
        <div style={{color:C.t1,fontWeight:800,fontSize:14,marginBottom:10,direction:"rtl"}}>⏳ מתחיל בקרוב</div>
        {GAMES_SOON.length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",direction:"rtl"}}>
            <div style={{color:"rgba(208,255,240,0.3)",fontSize:12}}>אין משחקים מתוכננים בקרוב</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {GAMES_SOON.map(g=>(
            <div key={g.id} style={{background:g.grad,borderRadius:16,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,direction:"rtl",cursor:"pointer",border:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontSize:22,flexShrink:0}}>{g.sport}</span>
              <div style={{flex:1}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{g.title}</div>
                <div style={{color:C.t2,fontSize:10,marginTop:2}}>📍 {g.loc} · {g.time}</div>
              </div>
              <div style={{textAlign:"center",flexShrink:0}}>
                <div style={{color:C.gold,fontWeight:900,fontSize:13}}>{g.minLeft} דק'</div>
                <div style={{color:C.t2,fontSize:9}}>נשאר</div>
              </div>
              <div style={{textAlign:"center",flexShrink:0}}>
                <div style={{color:C.t1,fontWeight:800,fontSize:13}}>{g.slots}</div>
                <div style={{color:C.t2,fontSize:9}}>מקומות</div>
              </div>
              <button onClick={()=>setJoined(s=>{const n=new Set(s);n.has(g.id)?n.delete(g.id):n.add(g.id);return n;})} style={{flexShrink:0,padding:"7px 14px",borderRadius:10,border:`1px solid ${C.primary}44`,background:joined.has(g.id)?`${C.primary}22`:"transparent",color:joined.has(g.id)?C.primary:C.t1,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                {joined.has(g.id)?"✓":"הצטרף"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MAP PAGE ─── */
function MapPage(){
  const [sportF,setSportF]=useState("all");
  const [showStats,setShowStats]=useState(true);
  const [liveCount,setLiveCount]=useState(0); // real count from backend
  const mapActive = true;
  const hf=HEAT_FILTERS.find(f=>f.k===sportF)||HEAT_FILTERS[0];
  const filteredZones=sportF==="all"?ZONE_STATS:ZONE_STATS.filter(z=>z.type===sportF);
  const maxCount=Math.max(1,...ZONE_STATS.map(z=>z.count));

  return(
    <div style={{position:"relative",height:"calc(100vh - 120px)",background:"#080c18",overflow:"hidden"}}>
      {/* Canvas map */}
      <HeatCanvas sport={sportF} active={mapActive}/>

      {/* Top: sport filter pills */}
      <div style={{position:"absolute",top:10,left:0,right:0,zIndex:10,padding:"0 10px"}}>
        <div style={{display:"flex",gap:5,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
          {HEAT_FILTERS.map(f=>(
            <button key={f.k} onClick={()=>setSportF(f.k)} style={{flexShrink:0,padding:"5px 11px",borderRadius:12,border:`1px solid ${sportF===f.k?f.color+"66":"rgba(255,255,255,0.08)"}`,background:sportF===f.k?`${f.color}1A`:"rgba(1,2,8,0.82)",backdropFilter:"blur(10px)",color:sportF===f.k?f.color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
              <span>{f.icon}</span><span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live count badge */}
      <div style={{position:"absolute",top:52,right:10,zIndex:10,background:"rgba(1,2,8,0.85)",backdropFilter:"blur(12px)",borderRadius:12,padding:"5px 10px",border:"1px solid rgba(0,255,179,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#FF4757",boxShadow:"0 0 6px #FF4757",animation:"none"}}/>
          <span style={{color:"#00FFB3",fontSize:11,fontWeight:700}}>{liveCount} פעילים</span>
        </div>
      </div>

      {/* Bottom stats panel */}
      {showStats&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:10,padding:"0 10px 10px"}}>
          <div style={{background:"rgba(1,2,8,0.93)",backdropFilter:"blur(20px)",borderRadius:18,padding:"13px 13px 10px",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,direction:"rtl"}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#FF4757",boxShadow:"0 0 6px #FF4757"}}/>
                <span style={{color:"#fff",fontWeight:800,fontSize:12}}>🔥 Heatmap ספורט — Amsterdam</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:C.primary,fontWeight:700,fontSize:10}}>🟢 {liveCount} פעילים</span>
                <button onClick={()=>setShowStats(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:13,cursor:"pointer",padding:"0 3px"}}>✕</button>
              </div>
            </div>

            {/* Filter pills */}
            <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",scrollbarWidth:"none"}}>
              {HEAT_FILTERS.map(f=>(
                <button key={f.k} onClick={()=>setSportF(f.k)} style={{flexShrink:0,padding:"3px 9px",borderRadius:10,border:`1px solid ${sportF===f.k?f.color+"55":"rgba(255,255,255,0.07)"}`,background:sportF===f.k?`${f.color}14`:"transparent",color:sportF===f.k?f.color:"rgba(255,255,255,0.3)",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Zone list */}
            {filteredZones.length===0?(
              <div style={{textAlign:"center",padding:"10px 0",direction:"rtl"}}>
                <div style={{fontSize:20,marginBottom:3}}>🏜️</div>
                <div style={{color:"rgba(255,255,255,0.3)",fontSize:10}}>אין פעילות רשומה לסוג ספורט זה עדיין</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {filteredZones.slice(0,3).map((z,i)=>{
                  const fc=HEAT_FILTERS.find(f=>f.k===z.type)||HEAT_FILTERS[0];
                  const barW=Math.round((z.count/maxCount)*100);
                  return(
                    <div key={z.name} style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:11,width:14,flexShrink:0}}>{fc.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                          <span style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:600}}>{z.name}</span>
                          <div style={{display:"flex",gap:5}}>
                            <span style={{color:fc.color,fontSize:8,fontWeight:700}}>{z.trend}</span>
                            <span style={{color:"rgba(255,255,255,0.25)",fontSize:8}}>{z.count.toLocaleString()}</span>
                          </div>
                        </div>
                        <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.05)"}}>
                          <div style={{height:"100%",width:`${barW}%`,borderRadius:2,background:`linear-gradient(90deg,${fc.color},${fc.color}77)`,transition:"width 0.8s ease"}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {!showStats&&(
        <button onClick={()=>setShowStats(true)} style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",zIndex:10,padding:"7px 16px",borderRadius:14,border:"1px solid rgba(255,71,87,0.3)",background:"rgba(255,71,87,0.12)",backdropFilter:"blur(14px)",color:"#FF4757",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          🔥 הצג סטטיסטיקות
        </button>
      )}
    </div>
  );
}

/* ─── CHATS PAGE ─── */
function ChatsPage(){
  const [active,setActive]=useState(null);
  const [chats,setChats]=useState(CHATS);
  const [msgs,setMsgs]=useState({1:[{r:"them",t:"מחר משחק? 🔥",ts:"עכשיו"}],2:[{r:"them",t:"הצטרף לקבוצה שלנו",ts:"לפני שעה"}]});
  const [input,setInput]=useState("");
  const bottomRef=useRef(null);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),[msgs,active]);

  function send(){
    if(!input.trim()||!active)return;
    const id=active.id;
    const msg={r:"me",t:input,ts:"עכשיו"};
    setMsgs(m=>({...m,[id]:[...(m[id]||[]),msg]}));
    setChats(c=>c.map(x=>x.id===id?{...x,last:input,time:"עכשיו"}:x));
    setInput("");
    // Auto reply after 1.5s
    setTimeout(()=>{
      const replies=["נשמע טוב 👍","בסדר! מחכים לך 🔥","ממש כן!","יאללה! 💪","אחלה, מסודר"];
      const rep={r:"them",t:replies[Math.floor(Math.random()*replies.length)],ts:"עכשיו"};
      setMsgs(m=>({...m,[id]:[...(m[id]||[]),rep]}));
    },1500);
  }

  if(active){
    const msgList=msgs[active.id]||[];
    return(
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh-130px)",paddingBottom:80}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",direction:"rtl",background:"rgba(1,2,8,0.6)",backdropFilter:"blur(12px)"}}>
          <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:C.t2,fontSize:20,cursor:"pointer",padding:0}}>←</button>
          <Avatar initials={active.initials} color={active.color} size={36} online={active.online}/>
          <div><div style={{color:C.t1,fontWeight:700,fontSize:13}}>{active.user}</div><div style={{color:active.online?C.primary:C.t3,fontSize:10}}>{active.online?"● מחובר":"● לא מחובר"}</div></div>
        </div>
        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8,direction:"rtl"}}>
          {msgList.map((m,i)=>(
            <div key={i} style={{display:"flex",flexDirection:m.r==="me"?"row":"row-reverse",alignItems:"flex-end",gap:6}}>
              <div style={{maxWidth:"72%",background:m.r==="me"?`linear-gradient(135deg,${C.primary},${C.blue})`:"rgba(255,255,255,0.07)",borderRadius:m.r==="me"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"9px 13px",border:m.r==="me"?"none":"1px solid rgba(255,255,255,0.07)"}}>
                <div style={{color:m.r==="me"?"#000":"#fff",fontSize:13,lineHeight:1.5}}>{m.t}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        {/* Input */}
        <div style={{display:"flex",gap:8,padding:"8px 14px 24px",borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(1,2,8,0.8)",backdropFilter:"blur(12px)"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder="כתוב הודעה..." style={{flex:1,padding:"10px 14px",borderRadius:22,border:"1px solid rgba(255,255,255,0.09)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit",direction:"rtl"}}/>
          <button onClick={send} style={{width:40,height:40,borderRadius:"50%",border:"none",background:input.trim()?`linear-gradient(135deg,${C.primary},${C.blue})`:"rgba(255,255,255,0.07)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
            {input.trim()?"➤":"➤"}
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{paddingBottom:100}}>
      <div style={{padding:"10px 16px 6px",direction:"rtl"}}>
        <input placeholder="🔍 חיפוש שיחות..." style={{width:"100%",padding:"10px 14px",borderRadius:14,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column"}}>
        {chats.length===0&&(
          <div style={{textAlign:"center",padding:"56px 24px",direction:"rtl"}}>
            <div style={{fontSize:40,marginBottom:12}}>💬</div>
            <div style={{color:"rgba(208,255,240,0.55)",fontWeight:700,fontSize:15,marginBottom:6}}>אין שיחות עדיין</div>
            <div style={{color:"rgba(208,255,240,0.25)",fontSize:12}}>כשתתחבר עם שחקנים, השיחות שלכם יופיעו כאן</div>
          </div>
        )}
        {chats.map(c=>(
          <div key={c.id} onClick={()=>{setActive(c);setChats(x=>x.map(ch=>ch.id===c.id?{...ch,unread:0}:ch));}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",direction:"rtl",transition:"background 0.1s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
            <div style={{position:"relative",flexShrink:0}}>
              <Avatar initials={c.initials} color={c.color} size={44} online={c.online}/>
              {c.isGroup&&<div style={{position:"absolute",bottom:0,right:0,width:16,height:16,borderRadius:"50%",background:"rgba(255,212,0,0.2)",border:"1.5px solid #010208",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8}}>👥</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:C.t1,fontWeight:700,fontSize:13}}>{c.user}</span>
                <span style={{color:C.t3,fontSize:10}}>{c.time}</span>
              </div>
              <div style={{color:C.t2,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last}</div>
            </div>
            {c.unread>0&&<div style={{width:20,height:20,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.unread}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PROFILE PAGE ─── */
function ProfilePage(){
  const [tab,setTab]=useState("stats");
  const TABS=[["stats","📊 סטטס"],["achievements","🏆 הישגים"],["challenges","🎯 אתגרים"]];
  const ACHIEVEMENTS=[
    {icon:"🎮",title:"מתחיל",desc:"משחק ראשון",u:true},{icon:"🔥",title:"על האש",desc:"3 ברצף",u:true},
    {icon:"🏆",title:"אלוף",desc:"10 ניצחונות",u:false},{icon:"👥",title:"חברותי",desc:"10 חברים",u:false},
    {icon:"⚡",title:"בזק",desc:"הצטרף תוך דקה",u:false},{icon:"🌟",title:"סטאר",desc:"50 לייקים",u:false},
  ];

  return(
    <div style={{paddingBottom:100}}>
      {/* Cover */}
      <div style={{position:"relative",marginBottom:50}}>
        <div style={{height:120,background:"linear-gradient(135deg,#0a1628,#0d2444,#1a1040,#0a2820)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(0,255,179,0.15) 0%,transparent 60%)"}}/>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 80% 30%,rgba(77,159,255,0.12) 0%,transparent 60%)"}}/>
          <div style={{position:"absolute",bottom:8,left:14,display:"flex",gap:5}}>
            {["⚽","🏃"].map((s,i)=><div key={i} style={{background:"rgba(255,255,255,0.1)",borderRadius:7,padding:"2px 7px",color:"rgba(255,255,255,0.6)",fontSize:10,backdropFilter:"blur(8px)"}}>{s}</div>)}
          </div>
        </div>
        {/* Avatar */}
        <div style={{position:"absolute",bottom:-44,right:14}}>
          <div style={{width:86,height:86,borderRadius:"50%",background:"linear-gradient(135deg,#3B5BDB,#7B8DE8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:28,border:"3px solid #010208"}}>AS</div>
          <div style={{position:"absolute",bottom:2,left:2,width:26,height:26,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,border:"2px solid #010208"}}>🥇</div>
        </div>
        {/* Buttons */}
        <div style={{position:"absolute",bottom:-38,left:14,display:"flex",gap:7}}>
          <button style={{padding:"7px 14px",borderRadius:18,border:`1.5px solid ${C.primary}`,background:"transparent",color:C.primary,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️ ערוך פרופיל</button>
          <button style={{padding:"7px 12px",borderRadius:18,border:"1.5px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:C.t1,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↗</button>
        </div>
      </div>

      {/* Name + info */}
      <div style={{padding:"0 14px 14px",direction:"rtl"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{color:C.t1,fontWeight:900,fontSize:19}}>אסף</span>
          <span style={{background:"rgba(0,255,179,0.1)",color:C.primary,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,border:"1px solid rgba(0,255,179,0.2)"}}>⚽ שחקן</span>
        </div>
        <div style={{color:C.t2,fontSize:12,marginBottom:10}}>שחקן כדורגל נלהב מת"א 🔥 · @asaf_plays</div>
        {/* Stats row */}
        <div style={{display:"flex",gap:6}}>
          <StatBadge label="ELO" value="1,540" color={C.primary}/>
          <StatBadge label="ניצחונות" value="8" color="#00C07F"/>
          <StatBadge label="XP" value="3.2K" color={C.gold}/>
          <StatBadge label="חברים" value="12" color={C.blue}/>
        </div>
        {/* ELO bar */}
        <div style={{marginTop:10,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,direction:"rtl"}}>
            <span style={{color:C.t2,fontSize:10,fontWeight:600}}>רמת ELO</span>
            <span style={{color:C.gold,fontSize:10,fontWeight:700}}>🥇 זהב · 1540</span>
          </div>
          <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.08)"}}>
            <div style={{height:"100%",width:"68%",borderRadius:3,background:`linear-gradient(90deg,${C.gold},${C.primary})`}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <span style={{color:C.t3,fontSize:9}}>1500</span>
            <span style={{color:C.t3,fontSize:9}}>1600</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:12}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px 0",background:"none",border:"none",cursor:"pointer",color:tab===k?C.primary:C.t2,fontWeight:tab===k?800:500,fontSize:11,fontFamily:"inherit",borderBottom:`2px solid ${tab===k?C.primary:"transparent"}`,transition:"all 0.15s"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"0 14px",direction:"rtl"}}>
        {tab==="stats"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:8}}>
              <StatBadge label="הגנה" value="8.2" color="#4D9FFF"/>
              <StatBadge label="התקפה" value="7.6" color="#FF6B2B"/>
              <StatBadge label="ניצחונות" value="8" color={C.primary}/>
            </div>
            {[["הגנה","8.2/10","#4D9FFF",82],["התקפה","7.6/10","#FF6B2B",76],["רוח ספורטיבית","9.1/10","#00C07F",91],["עקביות","7.0/10",C.gold,70]].map(([l,v,col,w])=>(
              <div key={l}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{color:C.t1,fontSize:12,fontWeight:600}}>{l}</span>
                  <span style={{color:col,fontSize:12,fontWeight:700}}>{v}</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
                  <div style={{height:"100%",width:`${w}%`,borderRadius:3,background:`linear-gradient(90deg,${col},${col}88)`,transition:"width 1s ease"}}/>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="achievements"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {ACHIEVEMENTS.map((a,i)=>(
              <div key={i} style={{background:a.u?"rgba(0,255,179,0.05)":"rgba(255,255,255,0.02)",borderRadius:14,padding:"12px",border:`1px solid ${a.u?"rgba(0,255,179,0.15)":"rgba(255,255,255,0.05)"}`,opacity:a.u?1:0.45,textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:5}}>{a.icon}</div>
                <div style={{color:a.u?C.primary:C.t2,fontWeight:800,fontSize:12}}>{a.title}</div>
                <div style={{color:C.t3,fontSize:10,marginTop:2}}>{a.desc}</div>
              </div>
            ))}
          </div>
        )}
        {tab==="challenges"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {USER.challenges.map(ch=>(
              <div key={ch.id} style={{background:`${ch.color}07`,borderRadius:14,padding:"12px",border:`1px solid ${ch.color}18`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <span style={{fontSize:18}}>{ch.icon}</span>
                  <span style={{flex:1,color:C.t1,fontSize:12,fontWeight:600}}>{ch.title}</span>
                  <span style={{background:`${ch.color}18`,color:ch.color,fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:8}}>{ch.reward}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:5,borderRadius:3,background:"rgba(255,255,255,0.06)"}}>
                    <div style={{height:"100%",width:`${(ch.progress/ch.total)*100}%`,borderRadius:3,background:`linear-gradient(90deg,${ch.color},${ch.color}88)`}}/>
                  </div>
                  <span style={{color:ch.done?C.primary:C.t2,fontSize:10,fontWeight:700,flexShrink:0}}>{ch.done?"✓ הושלם":`${ch.progress}/${ch.total}`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CREATE PAGE ─── */
function CreatePage(){
  const OPTIONS=[
    {icon:"⚽",key:"game",label:"משחק חדש",desc:"פרסם אירוע ומצא שחקנים תוך דקות",color:"#00FFB3"},
    {icon:"🏆",key:"tournament",label:"טורניר / ליגה",desc:"צור תחרות לקבוצות",color:"#FFD166"},
    {icon:"👥",key:"team",label:"קבוצה חדשה",desc:"הקם קבוצה קבועה עם חברים",color:"#4D9FFF"},
    {icon:"🔄",key:"rematch",label:"משחק חוזר",desc:"שחק שוב עם אותה קבוצה",color:"#CC44FF"},
    {icon:"📢",key:"invite",label:"הזמן שחקנים",desc:"שלח הזמנה פתוחה לאזור שלך",color:"#FF6B2B"},
  ];
  const [sel,setSel]=useState(null);

  return(
    <div style={{paddingBottom:100}}>
      <div style={{margin:"12px 14px 0",borderRadius:22,background:"linear-gradient(155deg,#020A10,#081A14)",border:"1px solid rgba(0,255,179,0.12)",padding:"18px 18px 14px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-20,width:160,height:160,borderRadius:"50%",background:"rgba(0,255,179,0.06)",filter:"blur(40px)",pointerEvents:"none"}}/>
        <div style={{color:"rgba(0,255,179,0.6)",fontSize:11,fontWeight:600,marginBottom:4,position:"relative",direction:"rtl"}}>יצירה</div>
        <div style={{color:C.t1,fontWeight:900,fontSize:24,letterSpacing:"-0.02em",position:"relative",direction:"rtl"}}>מה תרצה <span style={{color:C.primary}}>ליצור?</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"14px 14px"}}>
        {OPTIONS.map(o=>(
          <button key={o.key} onClick={()=>setSel(sel===o.key?null:o.key)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 15px",borderRadius:18,border:`1px solid ${sel===o.key?o.color+"55":o.color+"15"}`,background:sel===o.key?`${o.color}0D`:`${o.color}04`,cursor:"pointer",fontFamily:"inherit",textAlign:"right",width:"100%",transition:"all 0.18s",direction:"rtl"}}>
            <div style={{width:50,height:50,borderRadius:13,flexShrink:0,background:`${o.color}12`,border:`1.5px solid ${o.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{o.icon}</div>
            <div style={{flex:1}}>
              <div style={{color:"#fff",fontWeight:800,fontSize:14,marginBottom:2}}>{o.label}</div>
              <div style={{color:C.t2,fontSize:11}}>{o.desc}</div>
            </div>
            <div style={{color:sel===o.key?o.color:"rgba(255,255,255,0.2)",fontSize:18,transition:"color 0.15s"}}>›</div>
          </button>
        ))}
      </div>
      {sel&&(
        <div style={{margin:"0 14px",padding:"14px",borderRadius:18,background:"rgba(0,255,179,0.04)",border:"1px solid rgba(0,255,179,0.1)",direction:"rtl"}}>
          <div style={{color:C.primary,fontWeight:800,fontSize:13,marginBottom:8}}>✨ {OPTIONS.find(o=>o.key===sel)?.label}</div>
          <div style={{color:C.t2,fontSize:12,marginBottom:12}}>{OPTIONS.find(o=>o.key===sel)?.desc}</div>
          <button style={{width:"100%",padding:"11px 0",borderRadius:12,background:`linear-gradient(135deg,${C.primary},${C.blue})`,border:"none",color:"#000",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>המשך →</button>
        </div>
      )}
    </div>
  );
}

/* ─── NAV ICONS ─── */
const HomeIcon=({active,rc})=><svg width="22" height="22" viewBox="0 0 24 24" fill={active?rc:"none"} stroke={active?rc:"rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const PlayIcon=({active,rc})=><div style={{width:active?30:26,height:active?30:26,borderRadius:"50%",background:active?rc:"transparent",border:`1.5px solid ${active?rc:"rgba(255,255,255,0.35)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",boxShadow:active?`0 0 12px ${rc}60`:"none"}}><svg width="11" height="11" viewBox="0 0 24 24" fill={active?"#000":"none"} stroke={active?"#000":"rgba(255,255,255,0.35)"} strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>;
const MapIcon=({active,rc})=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?rc:"rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const PlusIcon=({active,rc})=><div style={{width:42,height:42,borderRadius:14,marginTop:-6,background:active?`linear-gradient(135deg,${rc},${rc}BB)`:"linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))",border:`1.5px solid ${active?rc:"rgba(255,255,255,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:active?`0 4px 18px ${rc}50`:"none",transition:"all 0.2s"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active?"#000":"rgba(255,255,255,0.6)"} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>;
const UserIcon=({active,rc})=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?rc:"rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

/* ─── MAIN APP ─── */
export default function MATCHDApp(){
  const [tab,setTab]=useState("home");
  const [notifOpen,setNotifOpen]=useState(false);
  const rc="#00FFB3";

  const NAV=[
    {key:"home",label:"Home",Icon:HomeIcon},
    {key:"play",label:"Play",Icon:PlayIcon},
    {key:"map",label:"Map",Icon:MapIcon},
    {key:"create",label:"Create",Icon:PlusIcon},
    {key:"profile",label:"",Icon:UserIcon},
  ];

  const pages={home:<HomePage/>,play:<PlayPage/>,map:<MapPage/>,create:<CreatePage/>,chats:<ChatsPage/>,profile:<ProfilePage/>};

  return(
    <div style={{maxWidth:430,margin:"0 auto",background:"#010208",minHeight:"100vh",fontFamily:"'SF Pro Display',-apple-system,'Segoe UI',sans-serif",overflowX:"hidden",position:"relative"}}>
      {/* Cyberpunk glow layers */}
      <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,height:"100vh",pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-10%",left:"-10%",width:"70%",height:"55%",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,179,0.06) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        <div style={{position:"absolute",top:"25%",right:"-15%",width:"55%",height:"50%",borderRadius:"50%",background:"radial-gradient(circle,rgba(77,159,255,0.05) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        <div style={{position:"absolute",bottom:"5%",left:"20%",width:"45%",height:"40%",borderRadius:"50%",background:"radial-gradient(circle,rgba(0,207,255,0.04) 0%,transparent 70%)",filter:"blur(50px)"}}/>
        {/* Scanlines */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,179,0.008) 3px,rgba(0,255,179,0.008) 4px)",pointerEvents:"none"}}/>
      </div>

      {/* Top bar */}
      <div style={{position:"sticky",top:0,zIndex:500,background:"rgba(1,2,8,0.88)",backdropFilter:"blur(28px)",borderBottom:"1px solid rgba(0,255,179,0.06)",padding:"11px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button style={{background:"none",border:"none",cursor:"pointer",color:"rgba(0,255,179,0.45)",padding:0,display:"flex",alignItems:"center"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
        </button>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
          <span style={{fontWeight:900,fontSize:20,letterSpacing:"0.08em",background:"linear-gradient(135deg,#00FFB3,#00CFFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 8px rgba(0,255,179,0.6))"}}>MATCHD</span>
          <span style={{fontSize:7,fontWeight:700,letterSpacing:"0.15em",color:"rgba(0,255,179,0.45)",textTransform:"uppercase",lineHeight:1}}>Play Human.</span>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <button style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,0.55)"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button onClick={()=>setNotifOpen(o=>!o)} style={{position:"relative",width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,0.55)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div style={{position:"absolute",top:-3,right:-3,width:15,height:15,borderRadius:"50%",background:"#FF3D71",color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 8px rgba(255,61,113,0.8)"}}>3</div>
          </button>
          <div onClick={()=>setTab("profile")} style={{cursor:"pointer",width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#3B5BDB,#7B8DE8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11,border:"1.5px solid rgba(0,255,179,0.4)",boxShadow:"0 0 8px rgba(0,255,179,0.2)"}}>AS</div>
        </div>
      </div>

      {/* Notif panel */}
      {notifOpen&&(
        <div onClick={()=>setNotifOpen(false)} style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.5)"}} >
          <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:58,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 24px)",maxWidth:405,background:"#0A0F1E",borderRadius:18,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.8)"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)",color:C.t1,fontWeight:800,fontSize:13,direction:"rtl"}}>🔔 התראות</div>
            {[{icon:"⚽",title:"המשחק הסתיים!",body:"כדורגל 6v6 · פארק הירקון",time:"לפני 2 דקות",color:"#00C07F"},{icon:"⭐",title:"דורגת על ידי יריב!",body:"alex_fc דירג אותך 9/10",time:"לפני 15 דקות",color:"#FFD166"},{icon:"🎉",title:"+150 XP הרווחת!",body:"השלמת אתגר שבועי 🎯",time:"לפני שעתיים",color:"#CC44FF"}].map((n,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",direction:"rtl",cursor:"pointer"}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${n.color}15`,border:`1px solid ${n.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{n.icon}</div>
                <div style={{flex:1}}><div style={{color:C.t1,fontWeight:700,fontSize:12}}>{n.title}</div><div style={{color:C.t2,fontSize:11,marginTop:1}}>{n.body}</div></div>
                <span style={{color:C.t3,fontSize:10,flexShrink:0}}>{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page content */}
      <div style={{paddingBottom:tab==="map"?0:80,position:"relative",zIndex:1}}>
        {pages[tab]||<HomePage/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(1,2,8,0.92)",backdropFilter:"blur(28px)",borderTop:"1px solid rgba(0,255,179,0.07)",padding:"8px 0 22px",zIndex:500,display:"flex",justifyContent:"space-around"}}>
        {NAV.map(n=>{
          const active=tab===n.key;
          return(
            <button key={n.key} onClick={()=>setTab(n.key)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"2px 10px",position:"relative",minWidth:44}}>
              <n.Icon active={active} rc={rc}/>
              {n.label&&<span style={{color:active?rc:"rgba(255,255,255,0.3)",fontSize:9,fontWeight:active?700:400,letterSpacing:"0.02em"}}>{n.label}</span>}
              {active&&<div style={{position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",width:20,height:2,borderRadius:1,background:rc,boxShadow:`0 0 8px ${rc}`}}/>}
            </button>
          );
        })}
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(208,255,240,0.2); }
        input, textarea { color-scheme: dark; }
        @keyframes neonPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
