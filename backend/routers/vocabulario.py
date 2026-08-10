# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Request
import sqlite3
from config import get_current_user

router = APIRouter()



@router.get("/api/vocabulario")
async def obtener_vocabulario(user_id: str = Depends(get_current_user)):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()

    # Devolver palabras guardadas
    c.execute("SELECT palabra FROM vocabulario_anki WHERE user_id = ?", (user_id,))
    palabras = [fila[0] for fila in c.fetchall()]
    conn.close()

    # FastAPI convierte la lista de Python a JSON automáticamente
    return palabras




@router.post("/api/vocabulario")
async def guardar_vocabulario(
    request: Request, user_id: str = Depends(get_current_user)
):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()

    # Extraemos los datos del frontend usando await
    datos = await request.json()

    # Manejar lista de palabras o palabra individual
    palabras = datos.get("palabras", [])
    palabra_unica = datos.get("palabra", "")

    if isinstance(palabra_unica, str) and palabra_unica.strip():
        palabras.append(palabra_unica.strip())

    for p in palabras:
        if isinstance(p, str) and p.strip():
            try:
                c.execute(
                    "INSERT INTO vocabulario_anki (palabra, user_id) VALUES (?, ?)",
                    (p.strip(), user_id),
                )
            except sqlite3.IntegrityError:
                pass  # Si la palabra ya existe, se ignora

    conn.commit()
    conn.close()

    # FastAPI convierte este diccionario a JSON
    return {"status": "guardado"}


