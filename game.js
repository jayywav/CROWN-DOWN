'use strict';

const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const suits = [['♠',false],['♥',true],['♦',true],['♣',false]];
const $ = id => document.getElementById(id);
const value = rank => ranks.indexOf(rank);

let state;
function resetState(){
  state={deck:shuffle(makeDeck()),cols:[[],[],[],[]],trash:[],round:0,paidAceMoves:2,selected:null,playing:true,normalEnded:false,crownDrop:false,originalAces:[],awaitingCut:false,cutUsed:false};
}
function makeDeck(){
  const out=[]; let n=0;
  for(const [s,red] of suits) for(const r of ranks) out.push({r,s,red,id:`card-${n++}`});
  return out;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
const top=i=>state.cols[i][state.cols[i].length-1]||null;
function message(title,help=''){$('status').textContent=title;$('help').textContent=help;}
function setButtons(){
  $('dealBtn').disabled=!state.playing||state.normalEnded||state.deck.length===0;
  $('finishBtn').disabled=!state.playing||state.normalEnded||state.deck.length!==0;
  $('scoreBtn').disabled=!state.playing||!state.normalEnded||state.awaitingCut;
}
function startGame(){
  resetState();
  $('crownBox').classList.add('hidden');
  $('result').classList.add('hidden');
  $('crownText').textContent='After normal play, choose one original Ace for your Ace Cut.';
  dealNextFour();
}
function dealNextFour(){
  if(!state?.playing||state.normalEnded||state.deck.length===0) return;
  state.selected=null; state.round++;
  for(let i=0;i<4;i++) if(state.deck.length) state.cols[i].push(state.deck.shift());
  if(state.round===1){
    const opening=state.cols.map(c=>c[0]);
    state.crownDrop=opening.length===4&&opening.every(c=>c.r==='A');
    if(state.crownDrop){state.originalAces=opening.map(c=>c.id);$('crownBox').classList.remove('hidden');}
  }
  render(); setButtons();
  if(state.deck.length) message(`Round ${state.round} dealt.`,`Make any legal eliminations or Ace moves, then press Down / Deal Next 4.`);
  else message('Final four dealt.','Make your final legal moves, then press Finish Normal Play.');
}
function makeCard(c,isTop,isSelected,colIndex){
  const el=document.createElement('button');
  el.type='button'; el.className=`card ${c.red?'red':''} ${isTop?'top':''} ${isSelected?'selected':''}`;
  el.innerHTML=`<span>${c.r}${c.s}</span><span class="suit">${c.s}</span><span class="bottom">${c.r}${c.s}</span>`;
  if(!isTop){el.disabled=true;el.tabIndex=-1;} else el.addEventListener('click',e=>{e.stopPropagation();chooseColumn(colIndex);});
  return el;
}
function render(){
  if(!state){$('deckN').textContent='52';$('trashN').textContent='0';$('roundN').textContent='0 / 13';$('aceN').textContent='2';}
  else {$('deckN').textContent=state.deck.length;$('trashN').textContent=state.trash.length;$('roundN').textContent=`${state.round} / 13`;$('aceN').textContent=state.paidAceMoves;}
  const board=$('board'); board.replaceChildren();
  const cols=state?.cols||[[],[],[],[]];
  cols.forEach((cards,i)=>{
    const col=document.createElement('div'); col.className='column';
    const title=document.createElement('div');title.className='column-title';title.textContent=`COLUMN ${i+1}`;col.appendChild(title);
    const stack=document.createElement('div');stack.className='stack';
    if(!cards.length){
      const empty=document.createElement('button');empty.type='button';empty.className='empty';empty.textContent='EMPTY';
      const aceSelected=state&&state.selected!==null&&top(state.selected)?.r==='A';
      if(aceSelected) empty.classList.add('target');
      empty.disabled=!aceSelected; empty.addEventListener('click',()=>chooseColumn(i)); stack.appendChild(empty);
    } else cards.forEach((c,k)=>{const el=makeCard(c,k===cards.length-1,state?.selected===i&&k===cards.length-1,i);el.style.top=`${10+k*31}px`;stack.appendChild(el);});
    col.appendChild(stack);board.appendChild(col);
  });
  const trashCol=document.createElement('div');trashCol.className='column trash';trashCol.innerHTML='<div class="column-title">TRASH PILE</div>';
  const trashStack=document.createElement('div');trashStack.className='stack';
  const trash=state?.trash||[];
  if(!trash.length){const empty=document.createElement('div');empty.className='empty static';empty.textContent='ELIMINATED CARDS';trashStack.appendChild(empty);}
  else trash.slice(-18).forEach((c,k)=>{const el=makeCard(c,false,false,-1);el.style.top=`${10+k*24}px`;trashStack.appendChild(el);});
  trashCol.appendChild(trashStack);board.appendChild(trashCol);
}
function chooseColumn(i){
  if(!state?.playing) return;
  if(state.awaitingCut){chooseCut(i);return;}
  if(state.normalEnded) return;
  const target=top(i);
  if(state.selected===null){
    if(!target) return;
    state.selected=i;render();
    message(`${target.r}${target.s} selected.`,target.r==='A'?'Choose an empty column for a free Ace move, an occupied column for a Paid Ace Move, or a higher same-suit exposed card to eliminate this Ace.':`Choose a higher exposed ${target.s} to eliminate this card. Normal cards cannot move.`);
    return;
  }
  const from=state.selected, moving=top(from);
  if(from===i){state.selected=null;render();message('Selection cleared.','Choose another exposed card.');return;}
  if(!moving){state.selected=null;render();return;}
  // Elimination: selected lower card is removed when target is higher and same suit.
  if(target&&moving.s===target.s&&value(moving.r)<value(target.r)){
    state.trash.push(state.cols[from].pop());state.selected=null;render();message(`${moving.r}${moving.s} sent to Trash.`,'The next card in that column is now exposed.');return;
  }
  // ONLY Aces may move columns.
  if(moving.r==='A'&&!target){state.cols[i].push(state.cols[from].pop());state.selected=null;render();message('Free Ace Move.','Ace → empty column does not spend a Paid Ace Move.');return;}
  if(moving.r==='A'&&target&&state.paidAceMoves>0){state.cols[i].push(state.cols[from].pop());state.paidAceMoves--;state.selected=null;render();message('Paid Ace Move used.',`${state.paidAceMoves} Paid Ace Move${state.paidAceMoves===1?'':'s'} remaining.`);return;}
  state.selected=null;render();
  message('Illegal move.',moving.r==='A'&&target&&state.paidAceMoves===0?'You have no Paid Ace Moves remaining.':'Normal cards can never move between columns.');
}
function finishNormalPlay(){
  if(!state?.playing||state.deck.length!==0||state.normalEnded) return;
  state.normalEnded=true;state.selected=null;
  if(state.crownDrop&&!state.cutUsed){state.awaitingCut=true;$('crownText').textContent='ACE CUT ACTIVE — click a column containing one of the four original opening Aces.';message('Choose your Ace Cut.','Everything above the chosen original Ace goes to Trash. The Ace stays.');}
  else message('Normal play complete.','Press Score Game.');
  render();setButtons();
}
function chooseCut(i){
  const idx=state.cols[i].findIndex(c=>state.originalAces.includes(c.id));
  if(idx<0){message('That column has no original Crown Drop Ace.','Choose another column.');return;}
  const removed=state.cols[i].splice(idx+1);state.trash.push(...removed);state.awaitingCut=false;state.cutUsed=true;
  $('crownText').textContent=`Ace Cut used — ${removed.length} card${removed.length===1?'':'s'} sent to Trash.`;
  render();setButtons();message('Ace Cut complete.','Press Score Game.');
}
function scoreGame(){
  if(!state?.playing||!state.normalEnded||state.awaitingCut) return;
  const remaining=state.cols.reduce((n,c)=>n+c.length,0);
  let totalAces=0,exposedAces=0;
  state.cols.forEach((c,i)=>{c.forEach(x=>{if(x.r==='A')totalAces++;});if(top(i)?.r==='A')exposedAces++;});
  const covered=Math.max(0,totalAces-exposedAces),perfect=remaining===4&&totalAces===4&&exposedAces===4,crown=exposedAces===4;
  let points=remaining+covered,label='STANDARD FINISH';
  if(perfect){points=4;label='PERFECT 4 · 4P';} else if(crown){points-=2;label=points===4?'SOFT 4 · 4S':'CROWN';}
  $('result').classList.remove('hidden');$('result').innerHTML=`<div class="label">FINAL SCORE</div><div class="score">${points}</div><div class="achievement">${label}</div><p>${remaining} cards remain · ${state.trash.length} in Trash · ${covered} covered Ace penalty${covered===1?'':'ies'}</p>`;
  state.playing=false;setButtons();message('Game scored.','Press New Game to play again.');
}
function openRules(){const modal=$('rulesModal');modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');}
function closeRules(){const modal=$('rulesModal');modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');}

$('newBtn').addEventListener('click',startGame);
$('dealBtn').addEventListener('click',dealNextFour);
$('finishBtn').addEventListener('click',finishNormalPlay);
$('scoreBtn').addEventListener('click',scoreGame);
$('rulesBtn').addEventListener('click',openRules);
$('closeRules').addEventListener('click',closeRules);
$('rulesModal').addEventListener('click',e=>{if(e.target===$('rulesModal'))closeRules();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeRules();});
render();setButtons();
