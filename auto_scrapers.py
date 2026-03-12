import os
import subprocess
import sys

def ejecutar_scrapers():
    carpeta = 'scrapers'

    # Verifica que la carpeta exista
    if not os.path.exists(carpeta):
        print(f"La carpeta '{carpeta}' no existe en este directorio.")
        return

    # Busca todos los archivos .py dentro de la carpeta
    archivos_py = [f for f in os.listdir(carpeta) if f.endswith('.py')]

    if not archivos_py:
        print(f"No hay archivos .py en la carpeta '{carpeta}'.")
        return

    # Ejecuta cada archivo encontrado
    for archivo in archivos_py:
        ruta_script = os.path.join(carpeta, archivo)
        print(f"Ejecutando: {archivo} ...")
        
        # Llama al script usando el mismo ejecutable de Python actual
        subprocess.run([sys.executable, ruta_script])
        
        print(f"Finalizado: {archivo}\n")

if __name__ == '__main__':
    ejecutar_scrapers()