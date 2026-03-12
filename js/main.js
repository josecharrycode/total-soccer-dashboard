/*
 * © 2026 Jose Charry. Todos los derechos reservados.
 * Queda estrictamente prohibida la copia, distribución o modificación
 * de este código sin autorización expresa del autor.
 */

/**
 * TOTAL SOCCER DASHBOARD - MOTOR ELITE V3
 * Modelo: Poisson + Dixon-Coles
 */

let datosLiga = {};

// 1. CARGA DINÁMICA DEL CATÁLOGO DESDE LA CARPETA STATIC
async function cargarCatalogoLigas() {
    try {
        // Va a buscar el archivo que el scraper acaba de crear
        const respuesta = await fetch('static/leagues_list.json');
        if (!respuesta.ok) throw new Error("Archivo JSON no encontrado o bloqueado por CORS.");
        
        const catalogoAgrupado = await respuesta.json(); 
        construirMenu(catalogoAgrupado);
        
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
        const select = document.getElementById('league-select');
        if (select) {
            select.innerHTML = '<option value="">⚠️ Error: Usa servidor local (Bloqueo CORS)</option>';
        }
    }
}

// 2. CONSTRUIR MENÚ AGRUPADO POR PAÍSES
function construirMenu(catalogo) {
    const select = document.getElementById('league-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona una Liga --</option>';

    let primeraLiga = null;
    const paises = Object.keys(catalogo).sort();
    
    paises.forEach(pais => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `📍 ${pais}`;
        
        catalogo[pais].forEach(liga => {
            const option = new Option(liga.name, liga.code);
            optgroup.appendChild(option);
            
            if (!primeraLiga) primeraLiga = liga.code;
            if (liga.code === 'england') primeraLiga = 'england'; // Priorizar Inglaterra
        });
        
        select.appendChild(optgroup);
    });
    
    // Cargar la primera liga automáticamente
    if (primeraLiga) {
        select.value = primeraLiga;
        cargarDatosLiga(primeraLiga);
    }
}

// 3. CARGAR ESTADÍSTICAS DE EQUIPOS
async function cargarDatosLiga(liga) {
    const homeSelect = document.getElementById('home-team');
    const awaySelect = document.getElementById('away-team');
    const btnAnalyze = document.getElementById('analyze-btn');

    try {
        if(homeSelect) homeSelect.innerHTML = '<option value="">Buscando equipos...</option>';
        if(awaySelect) awaySelect.innerHTML = '<option value="">Buscando equipos...</option>';
        if(btnAnalyze) btnAnalyze.disabled = true;

        const respuesta = await fetch(`static/${liga}_stats.json`);
        if (!respuesta.ok) throw new Error("Archivo de liga no encontrado.");
        
        datosLiga = await respuesta.json();
        poblarSelectores();
    } catch (error) {
        console.error("Error al cargar JSON de la liga:", error);
        if(homeSelect) homeSelect.innerHTML = `<option value="">⚠️ Datos no encontrados</option>`;
        if(awaySelect) awaySelect.innerHTML = `<option value="">⚠️ Ejecuta el scraper</option>`;
    }
}

function poblarSelectores() {
    const homeSelect = document.getElementById('home-team');
    const awaySelect = document.getElementById('away-team');
    
    if (!homeSelect || !awaySelect) return;

    homeSelect.innerHTML = '<option value="">-- Seleccionar Local --</option>';
    awaySelect.innerHTML = '<option value="">-- Seleccionar Visitante --</option>';
    
    const equipos = Object.keys(datosLiga).filter(k => k !== '_metadata' && k !== 'League average').sort();
    equipos.forEach(eq => {
        homeSelect.add(new Option(eq, eq));
        awaySelect.add(new Option(eq, eq));
    });
}

// 4. MATEMÁTICAS AVANZADAS
function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
function poisson(k, lambda) { return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k); }

function getCuotaHTML(probabilidad) {
    if (probabilidad <= 1) return `<span class="odd-badge">@--</span>`;
    const cuota = 100 / probabilidad;
    return `<span class="odd-badge">@${cuota.toFixed(2)}</span>`;
}

function calcularProbabilidadesElite(lambdaH, lambdaA) {
    let p1 = 0, pX = 0, p2 = 0;
    let marcadores = [];
    const RHO = -0.11; 

    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            let p = poisson(i, lambdaH) * poisson(j, lambdaA);
            
            if (i === 0 && j === 0) p *= (1 - lambdaH * lambdaA * RHO);
            else if (i === 1 && j === 0) p *= (1 + lambdaA * RHO);
            else if (i === 0 && j === 1) p *= (1 + lambdaH * RHO);
            else if (i === 1 && j === 1) p *= (1 - RHO);
            
            p = Math.max(0, p);
            if (i > j) p1 += p;
            else if (i === j) pX += p;
            else p2 += p;

            if (i <= 3 && j <= 3) marcadores.push({ score: `${i}-${j}`, prob: p * 100 });
        }
    }
    
    const total = p1 + pX + p2;
    return {
        winProbs: { p1: (p1/total)*100, px: (pX/total)*100, p2: (p2/total)*100 },
        topScores: marcadores.sort((a,b) => b.prob - a.prob).slice(0, 3)
    };
}

// 5. LÓGICA DE ANÁLISIS
function analizarPartido() {
    const nH = document.getElementById('home-team').value;
    const nA = document.getElementById('away-team').value;
    const local = datosLiga[nH], visita = datosLiga[nA];

    if (!local || !visita) return;

    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('results-container').classList.remove('hidden');

    const fillSide = (eq, pre) => {
        const d = eq.position;
        if(!d) return;
        document.getElementById(`${pre}-pos`).innerText = `#${d.posicion}`;
        document.getElementById(`${pre}-pts`).innerText = `${d.puntos} pts`;
        document.getElementById(`${pre}-games`).innerText = `${d.partidos} (${d.ganados}/${d.empatados}/${d.perdidos})`;
        document.getElementById(`${pre}-winrate`).innerText = `${((d.ganados/d.partidos)*100).toFixed(1)}%`;
        document.getElementById(`${pre}-goals`).innerText = `${d.goles_favor}/${d.goles_contra}`;
        document.getElementById(`${pre}-avg-goals`).innerText = `${(d.goles_favor/d.partidos).toFixed(2)} / ${(d.goles_contra/d.partidos).toFixed(2)}`;
        document.getElementById(`${pre}-diff`).innerText = (d.diferencia > 0 ? '+' : '') + d.diferencia;
        document.getElementById(`${pre}-o25`).innerText = eq.goals.over_2_5 || "N/A";
        document.getElementById(`${pre}-btts`).innerText = eq.goals.bts || "N/A";
    };

    document.getElementById('home-name').innerText = nH;
    document.getElementById('away-name').innerText = nA;
    fillSide(local, 'h'); fillSide(visita, 'a');

    const AVG_LEAGUE_GOALS = 1.40;
    const XI = 1.28; 

    const getFuerzaElite = (eq) => {
        const d = eq.position;
        if(!d || d.partidos === 0) return { atk: 1, def: 1 };
        const baseAtk = (d.goles_favor / d.partidos) / AVG_LEAGUE_GOALS;
        const baseDef = (d.goles_contra / d.partidos) / AVG_LEAGUE_GOALS;
        const formaActual = (d.puntos / (d.partidos * 3)); 
        const ajuste = formaActual > 0.5 ? XI : (1 / XI);
        return { atk: baseAtk * ajuste, def: baseDef * (2 - ajuste) };
    };

    const fH = getFuerzaElite(local);
    const fA = getFuerzaElite(visita);
    const HOME_ADV = 1.12; 

    const lambdaH = fH.atk * fA.def * AVG_LEAGUE_GOALS * HOME_ADV;
    const lambdaA = fA.atk * fH.def * AVG_LEAGUE_GOALS;

    const res = calcularProbabilidadesElite(lambdaH, lambdaA);
    const { p1, px, p2 } = res.winProbs;

    document.getElementById('bar-1').style.width = `${p1}%`;
    document.getElementById('bar-x').style.width = `${px}%`;
    document.getElementById('bar-2').style.width = `${p2}%`;
    document.getElementById('txt-1').innerHTML = `${p1.toFixed(1)}% ${getCuotaHTML(p1)}`;
    document.getElementById('txt-x').innerHTML = `${px.toFixed(1)}% ${getCuotaHTML(px)}`;
    document.getElementById('txt-2').innerHTML = `${p2.toFixed(1)}% ${getCuotaHTML(p2)}`;

    document.getElementById('pred-winner').innerText = p1 > p2 ? "LOCAL" : "VISITANTE";
    document.getElementById('pred-conf').innerText = `Confianza Reciente: ${Math.max(p1, px, p2).toFixed(1)}%`;

    document.getElementById('dc-1x').innerHTML = `${(p1+px).toFixed(1)}% ${getCuotaHTML(p1+px)}`;
    document.getElementById('dc-x2').innerHTML = `${(p2+px).toFixed(1)}% ${getCuotaHTML(p2+px)}`;
    document.getElementById('dc-12').innerHTML = `${(p1+p2).toFixed(1)}% ${getCuotaHTML(p1+p2)}`;

    const probBTTS = (1 - poisson(0, lambdaH)) * (1 - poisson(0, lambdaA)) * 100;
    document.getElementById('pred-btts-text').innerText = probBTTS > 52 ? "✅ SÍ" : "❌ NO";
    document.getElementById('pred-btts-prob').innerHTML = `Probabilidad: ${probBTTS.toFixed(1)}% ${getCuotaHTML(probBTTS)}`;

    res.topScores.forEach((m, i) => {
        const elScore = document.getElementById(`score-${i+1}`);
        const elProb = document.getElementById(`score-${i+1}-prob`);
        if(elScore && elProb) {
            elScore.innerText = m.score;
            elProb.innerHTML = `${m.prob.toFixed(1)}%<br>${getCuotaHTML(m.prob)}`;
        }
    });

    const p0 = poisson(0, lambdaH + lambdaA) * 100;
    const p1g = poisson(1, lambdaH + lambdaA) * 100;
    const o15 = 100 - p0 - p1g;
    document.getElementById('ou-15').innerHTML = `${o15.toFixed(1)}% ${getCuotaHTML(o15)}`;
    document.getElementById('tg-exp').innerText = (lambdaH + lambdaA).toFixed(2);
}

// 6. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoLigas(); // Llamamos a la carga dinámica
    
    const leagueSel = document.getElementById('league-select');
    if (leagueSel) {
        leagueSel.addEventListener('change', (e) => {
            if(e.target.value) cargarDatosLiga(e.target.value);
        });
    }
    
    const btnAnalyze = document.getElementById('analyze-btn');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', analizarPartido);
    }

    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            document.getElementById('results-container').classList.add('hidden');
            document.getElementById('setup-section').classList.remove('hidden');
        });
    }
    
    const h = document.getElementById('home-team');
    const a = document.getElementById('away-team');
    const validate = () => {
        if(btnAnalyze) {
            btnAnalyze.disabled = !(h && h.value && a && a.value && h.value !== a.value);
        }
    };
    
    if (h) h.addEventListener('change', validate); 
    if (a) a.addEventListener('change', validate);
});cl