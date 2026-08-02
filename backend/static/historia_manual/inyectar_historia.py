import sqlite3
import os
import json
import asyncio

# cd static/historia_manual
# python inyectar_historia.py

# pyrefly: ignore [missing-import]
import edge_tts

# 1. Definimos las rutas exactas
BASE_DIR = os.path.dirname(__file__)

# Subimos DOS niveles hacia la carpeta base "backend" donde vive la base de datos
# Porque ahora estamos en backend/static/historia_manual/
PARENT_DIR = os.path.dirname(BASE_DIR)  # Sube a "static"
GRANDPARENT_DIR = os.path.dirname(PARENT_DIR)  # Sube a "backend"

DB_PATH = os.path.join(GRANDPARENT_DIR, "tutor.db")
JSON_PATH = os.path.join(BASE_DIR, "historia_manual.json")

# Usamos la misma voz premium que en tu servidor web
VOZ_IA = "en-US-AvaNeural"


async def generar_audio(texto, ruta):
    communicate = edge_tts.Communicate(texto, VOZ_IA, rate="-7%")
    await communicate.save(ruta)


async def inyectar_historia():
    print("--- INYECTOR DE HISTORIAS MODO MANUAL ---")

    if not os.path.exists(JSON_PATH):
        print(f"❌ Error fatal: No encontré el archivo '{JSON_PATH}'.")
        print("Por favor crea el archivo JSON primero con tu historia.")
        return

    # Leer el manual escrito por el usuario
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        try:
            datos = json.load(f)
        except json.JSONDecodeError:
            print("❌ Error: Tu archivo JSON tiene un error de sintaxis.")
            return

    titulo = datos.get("titulo", "Historia Personalizada")
    tematica = datos.get("tematica", "Manual")
    lineas = datos.get("lineas", [])

    if not lineas:
        print("❌ Error: No encontré la propiedad 'lineas' en el JSON.")
        return

    print(f"📘 Leyendo historia: '{titulo}'...")

    # 1. Base de Datos: Insertar historia principal
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO historias (titulo, tematica) VALUES (?, ?)", (titulo, tematica)
    )
    historia_id = c.lastrowid

    # 2. Carpetas: Crear la carpeta de audio para esa ID
    carpeta_historia_relativa = f"static/audios/historia_{historia_id}"
    carpeta_historia_absoluta = os.path.join(GRANDPARENT_DIR, carpeta_historia_relativa)
    os.makedirs(carpeta_historia_absoluta, exist_ok=True)

    # 3. Audio: Generar las tareas concurrentes
    tareas_audio = []
    print(f"🔊 Generando {len(lineas)} audios simultáneamente (Edge TTS)...")

    for i, linea in enumerate(lineas):
        texto_en = linea.get("en", "").strip()
        ruta_archivo = os.path.join(carpeta_historia_absoluta, f"linea_{i}.mp3")

        # Agregamos la tarea a la cola
        tareas_audio.append(generar_audio(texto_en, ruta_archivo))

    # Ejecuta TODA la generación de audios de golpe y espera a que termine
    if tareas_audio:
        await asyncio.gather(*tareas_audio)

    # 4. Inyectar finalmente todas las oraciones en línea a la base de datos
    for i, linea in enumerate(lineas):
        oracion_en = linea.get("en", "").strip()
        oracion_es = linea.get("es", "").strip()
        oracion_ipa = linea.get("ipa", "").strip()  # Si no hay ipa, la deja vacía

        # Guardamos la ruta estática para que FastAPI la sirva (ej: static/audios/historia_30/linea_1.mp3)
        ruta_db = f"{carpeta_historia_relativa}/linea_{i}.mp3"

        c.execute(
            """
            INSERT INTO lineas_historia 
            (historia_id, orden, oracion_en, oracion_es, ruta_audio, oracion_ipa) 
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (historia_id, i, oracion_en, oracion_es, ruta_db, oracion_ipa),
        )

    # 5. Guardar los cambios finales
    conn.commit()
    conn.close()

    print(f"\n✅ ¡Éxito letal! '{titulo}' se ha inyectado con audio premium.")
    print("Vuelve a React y recarga la página de Historias.")


if __name__ == "__main__":
    asyncio.run(inyectar_historia())
