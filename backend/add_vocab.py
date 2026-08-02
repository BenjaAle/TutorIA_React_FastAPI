import sqlite3
import os

# Script se conecta a la BDD
DB_PATH = os.path.join(os.path.dirname(__file__), "tutor.db")


def añadir_palabras(palabras):
    # Conectarse a sqlite
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    añadidas = 0
    for palabra in palabras:
        palabra_limpia = palabra.strip().lower()
        if not palabra_limpia:
            continue

        # 1. Verificar si la palabra ya existe para no duplicar
        c.execute(
            "SELECT id FROM vocabulario_anki WHERE palabra = ?", (palabra_limpia,)
        )
        existe = c.fetchone()

        if not existe:
            # 2. Si no existe, la insertamos
            c.execute(
                "INSERT INTO vocabulario_anki (palabra) VALUES (?)", (palabra_limpia,)
            )
            añadidas += 1
            print(f"✅ Añadida: '{palabra_limpia}'")
        else:
            print(f"⚠️ Ignorada (ya existía): '{palabra_limpia}'")

    # 3. Guardar cambios
    conn.commit()
    conn.close()

    print(f"\nProceso terminado. {añadidas} palabras nuevas guardadas.")


if __name__ == "__main__":
    print("--- Añadir Vocabulario Manualmente ---")
    print("Escribe las palabras que quieres añadir, separadas por COMAS.")
    print("Ejemplo: apple, beautiful, watermelon, go out")
    print("(Para cerrar el script, escribe 'salir')\n")

    while True:
        entrada = input("Palabras a añadir > ")

        if entrada.lower().strip() == "salir":
            print("Saliendo...")
            break

        if not entrada.strip():
            continue

        # Convertimos texto "apple, car" a una lista ["apple", "car"]
        lista_de_palabras = [p.strip() for p in entrada.split(",")]

        añadir_palabras(lista_de_palabras)

# cd backend
# python add_vocab.py