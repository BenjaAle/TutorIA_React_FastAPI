import json
import os

# cd static/historia_manual
# python texto_a_json.py

BASE_DIR = os.path.dirname(__file__)
TXT_PATH = os.path.join(BASE_DIR, "texto_crudo.txt")
JSON_PATH = os.path.join(BASE_DIR, "historia_manual.json")


def texto_a_json():
    print("--- CONVERTIDOR DE TEXTO PLANO A JSON ---")

    if not os.path.exists(TXT_PATH):
        # Crear archivo vacío si no existe
        with open(TXT_PATH, "w", encoding="utf-8") as f:
            f.write("Pega tu texto aqui y ejecuta este script")
        print(
            f"❌ No se encontró '{TXT_PATH}'. Se ha creado un archivo en blanco para que pegues ahí tu texto."
        )
        return

    # 1. Leer el texto plano
    with open(TXT_PATH, "r", encoding="utf-8") as f:
        lineas_crudas = f.readlines()

    lineas_formateadas = []

    # 2. Desglosar línea por línea saltándose los renglones vacíos
    for linea in lineas_crudas:
        texto = linea.strip()
        if not texto:
            continue

        lineas_formateadas.append(
            {"en": texto, "es": "", "ipa": ""}  # Por defecto vacío
        )

    # 3. Empaquetar como la estructura final
    datos = {
        "titulo": "Believer - Imagine Dragons",
        "tematica": "Canción",
        "lineas": lineas_formateadas,
    }

    # 4. Sobrescribir el viejo historia_manual.json
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

    print(
        f"✅ ¡Éxito! Se han procesado {len(lineas_formateadas)} líneas correctamente."
    )
    print("El archivo 'historia_manual.json' acaba de ser sobrescrito y actualizado.")
    print("Ahora puedes ejecutar: python inyectar_historia.py")


if __name__ == "__main__":
    texto_a_json()
