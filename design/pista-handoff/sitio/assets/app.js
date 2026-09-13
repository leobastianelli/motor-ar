const clock=document.querySelector('#clock');
if(clock){const tick=()=>clock.textContent=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());tick();setInterval(tick,1000)}
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#site-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))})}
const filters=[...document.querySelectorAll('[data-filter]')],rows=[...document.querySelectorAll('[data-kind]')];
filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(item=>item.classList.remove('is-selected'));button.classList.add('is-selected');const filter=button.dataset.filter;rows.forEach(row=>row.hidden=filter!=='all'&&row.dataset.kind!==filter)}));
