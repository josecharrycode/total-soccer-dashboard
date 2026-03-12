import requests
from bs4 import BeautifulSoup
import json
import os
import logging
from datetime import datetime
import time

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger(__name__)

def safe_request(url, max_retries=3):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            if attempt == max_retries - 1:
                raise

def safe_convert(value, type_func, default=0):
    try:
        return type_func(str(value).replace(',', '.')) if value else default
    except ValueError:
        return default

def obtener_candidatos_ligas():
    """Busca enlaces leyendo la fila completa para extraer el nombre real, NO el botón."""
    url = "https://www.soccerstats.com/leagues.asp"
    candidatos = []
    codigos_vistos = set()
    
    try:
        response = safe_request(url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        for a in soup.find_all('a', href=True):
            href = a['href']
            if 'league=' in href:
                codigo = href.split('league=')[1].split('&')[0].lower()
                if not codigo or codigo in codigos_vistos: 
                    continue
                
                # LA CORRECCIÓN: Subir a la fila (<tr>) para leer las columnas (<td>)
                tr = a.find_parent('tr')
                if not tr: continue
                
                texto = ""
                # Buscar en la fila la columna que tenga el formato "País - Liga"
                for td in tr.find_all('td'):
                    txt = td.text.strip().replace('\n', ' ')
                    if " - " in txt and len(txt) > 5:
                        texto = txt
                        break
                
                # Si no encuentra " - ", buscar el primer texto largo válido que no sea "stats"
                if not texto:
                    for td in tr.find_all('td'):
                        txt = td.text.strip()
                        if len(txt) > 4 and txt.lower() != 'stats' and 'leagues' not in txt.lower():
                            texto = txt
                            break
                            
                # Limpiar basura residual por seguridad
                if texto.lower().endswith(" stats"):
                    texto = texto[:-6].strip()

                if not texto or len(texto) < 4: continue
                
                # Extraer País y Liga
                if " - " in texto:
                    partes = texto.split(" - ", 1)
                    pais = partes[0].strip().title()
                    nombre_liga = partes[1].strip()
                else:
                    pais = "Internacional / Otros"
                    nombre_liga = texto
                    
                # Ignorar Copas y torneos no regulares
                torneos_ignorados = ['champions', 'europa', 'conference', 'libertadores', 'sudamericana', 'world', 'euro ', 'nations', 'america', 'cup', 'qualif']
                if any(t in texto.lower() for t in torneos_ignorados): 
                    continue
                    
                candidatos.append({
                    "code": codigo,
                    "pais": pais,
                    "name": nombre_liga
                })
                codigos_vistos.add(codigo)
                
        return candidatos
    except Exception as e:
        logger.error(f"❌ Error al obtener candidatos: {e}")
        return []

def scrape_corners_data(url):
    try:
        response = safe_request(url)
        corner_data = {}
        soup = BeautifulSoup(response.content, 'html.parser')
        tables = soup.find_all('table')

        for t in tables:
            home_header = t.find('th', string=lambda text: text and ("home" in text.lower() or "hogar" in text.lower()))
            away_header = t.find('th', string=lambda text: text and ("away" in text.lower() or "lejos" in text.lower()))
            
            if home_header: tipo = "local"
            elif away_header: tipo = "visitante"
            else: continue

            rows = t.find_all('tr')[2:]
            for row in rows:
                columns = row.find_all('td')
                if len(columns) < 7: continue
                
                equipo = columns[0].text.strip()
                if "average" in equipo.lower(): continue

                if equipo not in corner_data:
                    corner_data[equipo] = {
                        "local": {"partidos": 0, "corners_favor": 0.0, "corners_contra": 0.0},
                        "visitante": {"partidos": 0, "corners_favor": 0.0, "corners_contra": 0.0}
                    }

                corner_data[equipo][tipo]["partidos"] = safe_convert(columns[1].text.strip(), int)
                corner_data[equipo][tipo]["corners_favor"] = safe_convert(columns[2].text.strip(), float)
                corner_data[equipo][tipo]["corners_contra"] = safe_convert(columns[3].text.strip(), float)

        return corner_data
    except Exception: return {}

def scrape_goals_data(url):
    try:
        response = safe_request(url)
        goals_data = {}
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', {'id': 'btable'})
        
        if not table: return goals_data

        rows = table.find_all('tr')[1:]
        for row in rows:
            columns = row.find_all('td')
            if len(columns) < 10: continue
            
            team = columns[0].get_text(strip=True)
            goals_data[team] = {
                'over_1_5': columns[4].get_text(strip=True),
                'over_2_5': columns[5].get_text(strip=True),
                'over_3_5': columns[6].get_text(strip=True),
                'bts': columns[9].get_text(strip=True)
            }
        return goals_data
    except Exception: return {}

def scrape_positions_data(url):
    try:
        response = safe_request(url)
        positions_data = {}
        soup = BeautifulSoup(response.content, 'html.parser')
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) < 15: continue
                
            position = 1
            teams_found = 0
            
            for row in rows[1:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 8: continue
                    
                cell_texts = [cell.get_text().strip() for cell in cells]
                
                for i, text in enumerate(cell_texts):
                    if (text and len(text) > 2 and not text.isdigit() and any(c.isalpha() for c in text) and text.upper() not in ['LEAGUES', 'MATCHES', 'STATS', 'HOME', 'AWAY']):
                        remaining = cell_texts[i+1:]
                        numbers = [x for x in remaining if x.isdigit()]
                        
                        if len(numbers) >= 6:
                            try:
                                mp, w, d, l, gf, ga = [int(x) for x in numbers[:6]]
                                if mp > 0 and w + d + l == mp and gf >= 0 and ga >= 0:
                                    positions_data[text] = {
                                        "posicion": position, "partidos": mp, "ganados": w,
                                        "empatados": d, "perdidos": l, "goles_favor": gf,
                                        "goles_contra": ga, "diferencia": gf - ga, "puntos": w * 3 + d
                                    }
                                    position += 1
                                    teams_found += 1
                                    break
                            except: continue
                if teams_found >= 20: break
            if teams_found >= 10: return positions_data
        return {}
    except Exception: return {}

def procesar_liga(league):
    try:
        corners_url = f"https://www.soccerstats.com/table.asp?league={league}&tid=cr"
        goals_url = f"https://www.soccerstats.com/table.asp?league={league}&tid=c"
        positions_url = f"https://www.soccerstats.com/latest.asp?league={league}"
        
        positions_data = scrape_positions_data(positions_url)
        
        if not positions_data:
            logger.warning(f"⚠️ Sin datos válidos para la liga: {league} (Descartada)")
            return False

        corners_data = scrape_corners_data(corners_url)
        goals_data = scrape_goals_data(goals_url)
        
        combined_data = {}
        all_teams = set(list(corners_data.keys()) + list(goals_data.keys()) + list(positions_data.keys()))
        
        for team in all_teams:
            combined_data[team] = {
                "corners": corners_data.get(team, {}),
                "goals": goals_data.get(team, {}),
                "position": positions_data.get(team, {})
            }
        
        combined_data['_metadata'] = {
            'fecha_actualizacion': datetime.now().isoformat(),
            'liga': league
        }
        
        os.makedirs('static', exist_ok=True)
        file_path = os.path.join('static', f'{league}_stats.json')
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
        
        logger.info(f"✅ Guardado: {league}_stats.json ({len(positions_data)} equipos)")
        return True
    
    except Exception as e:
        logger.error(f"❌ Error al procesar {league}: {e}")
        return False

if __name__ == "__main__":
    print("\n🔍 BUSCANDO Y FILTRANDO EL CATÁLOGO COMPLETO DE LIGAS EN SOCCERSTATS...")
    candidatos = obtener_candidatos_ligas()
    
    if not candidatos:
        print("⚠️ No se pudieron obtener las ligas. Revisa tu conexión.")
        exit()
        
    print(f"🚀 SE ENCONTRARON {len(candidatos)} LIGAS POTENCIALES VÁLIDAS. INICIANDO DESCARGA...")
    print("=" * 50)

    ligas_exitosas = {}
    exitos = 0
    
    os.makedirs('static', exist_ok=True)

    for cand in candidatos:
        codigo = cand['code']
        logger.info(f"Consultando liga: {codigo.upper()} ({cand['pais']} - {cand['name']})...")
        
        if procesar_liga(codigo):
            exitos += 1
            pais = cand['pais']
            
            if pais not in ligas_exitosas:
                ligas_exitosas[pais] = []
                
            ligas_exitosas[pais].append({
                "code": cand['code'],
                "name": cand['name']
            })
        
        time.sleep(2.5) 
        
    with open('static/leagues_list.json', 'w', encoding='utf-8') as f:
        json.dump(ligas_exitosas, f, ensure_ascii=False, indent=4)

    print("=" * 50)
    print(f"🎉 PROCESO FINALIZADO. {exitos} ligas regulares guardadas listas para el Dashboard.")