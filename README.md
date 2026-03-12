# ⚽ Total Soccer Analytics Dashboard

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0--Elite-blue)
![License](https://img.shields.io/badge/License-Copyright_Restricted-red)

Un dashboard analítico profesional para la predicción de resultados de fútbol a nivel mundial. Este proyecto combina un motor de extracción de datos (Web Scraping) en tiempo real con modelos matemáticos predictivos avanzados para calcular cuotas justas, probabilidades de marcadores y tendencias de apuestas.

## 🚀 Características Principales

* **Motor de Scraping Dinámico (Python):** Extrae, limpia y normaliza datos estadísticos en tiempo real de más de 40 ligas globales, evadiendo bloqueos mediante un sistema de peticiones controladas.
* **Modelo Predictivo Matemático:** Utiliza la **Distribución de Poisson** combinada con el modelo bivariado de **Dixon-Coles** para corregir la subestimación de empates de baja puntuación (0-0, 1-1).
* **Decaimiento Temporal (Time-Decay):** El algoritmo ajusta el peso de la "Fuerza de Ataque/Defensa" de los equipos basándose en su forma reciente, dando mayor relevancia a los últimos partidos jugados.
* **Interfaz de Usuario (UI) Premium:** Diseño oscuro (Dark Theme) optimizado para la legibilidad de datos complejos, completamente responsivo y alimentado dinámicamente por archivos JSON locales.

## 🛠️ Stack Tecnológico

**Backend & Data Pipeline:**
* `Python 3`
* `BeautifulSoup4` (Web Scraping)
* `Requests`

**Frontend & Interfaz:**
* `HTML5` & `CSS3` (Variables nativas, Flexbox, CSS Grid)
* `Vanilla JavaScript` (ES6+, Fetch API, Promesas, Async/Await)

## ⚙️ Instalación y Uso Local

Para ejecutar este proyecto en tu entorno local:

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/josecharrycode/total-soccer-dashboard.git](https://github.com/josecharrycode/total-soccer-dashboard.git)
    ```
2.  **Actualiza la base de datos (Scraping):**
    Asegúrate de tener Python instalado y ejecuta el scraper para descargar los datos de las ligas de la semana en curso:
    ```bash
    python scraper_global.py
    ```
3.  **Inicia el servidor local:**
    Para evitar políticas de bloqueo CORS del navegador al leer los archivos JSON locales, levanta un servidor de desarrollo:
    ```bash
    python -m http.server 8000
    ```
4.  **Abre la aplicación:**
    Navega en tu explorador web a `http://localhost:8000`

## ⚖️ Licencia y Copyright

**© 2026 Jose Charry. Todos los derechos reservados.**

Este proyecto, incluyendo todo su código fuente, algoritmos matemáticos predictivos y diseño de interfaz, es propiedad intelectual exclusiva del autor. 

Queda **estrictamente prohibida** la copia, clonación, distribución, modificación o uso comercial de cualquier parte de este repositorio sin el consentimiento previo, expreso y por escrito del autor. Este repositorio se hace público de buena fe exclusivamente con fines de exhibición de portafolio profesional.