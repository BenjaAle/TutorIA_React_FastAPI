import asyncio
import os
import sys

# Ensure backend imports work when running this script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routers.fonetica import obtener_fonemas
from config import generar_audio

async def generate_all_phonemes():
    fonemas = obtener_fonemas()
    base_dir = os.path.join(os.path.dirname(__file__), "static", "audios", "fonemas")
    os.makedirs(base_dir, exist_ok=True)

    tareas = []

    for f in fonemas:
        id_fonema = f["id"]

        # Extract the first example word cleanly
        ejemplo_limpio = (
            f["ejemplos"][0].split(" ")[0]
            if f.get("ejemplos") and len(f["ejemplos"]) > 0
            else ""
        )

        # We only play the example word because phonetic approximations (like "ih") get read incorrectly by Edge-TTS
        texto_a_reproducir = ejemplo_limpio

        ruta_audio = os.path.join(base_dir, f"{id_fonema}.mp3")

        print(f"Queueing: '{texto_a_reproducir}' -> {id_fonema}.mp3")
        tareas.append(generar_audio(texto_a_reproducir, ruta_audio, retries=5))

    print(
        f"\nIniciando generación de {len(tareas)} archivos de audio. Por favor espera...\n"
    )

    await asyncio.gather(*tareas)
    print("¡Generación completada exitosamente!")


if __name__ == "__main__":
    asyncio.run(generate_all_phonemes())
