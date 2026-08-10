from config import GEMINI_MODEL, client, get_current_user
# pyrefly: ignore [missing-import]
from google.genai import types
from models import Mensaje, RenombrarRequest, NuevoChat
import sqlite3
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends

router = APIRouter()


@router.post("/crear_chat")
def crear_chat(datos: NuevoChat, user_id: str = Depends(get_current_user)):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()

    c.execute(
        "INSERT INTO chats (titulo, user_id) VALUES (?, ?)", (datos.titulo, user_id)
    )

    chat_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"chat_id": chat_id, "titulo": datos.titulo}


@router.get("/chats")
def obtener_chats(user_id: str = Depends(get_current_user)):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()
    c.execute(
        "SELECT id, titulo FROM chats WHERE user_id = ? ORDER BY id DESC", (user_id,)
    )

    chats = [{"id": row[0], "titulo": row[1]} for row in c.fetchall()]
    conn.close()
    return chats


@router.put("/chats/{chat_id}")
def renombrar_chat(
    chat_id: int, req: RenombrarRequest, user_id: str = Depends(get_current_user)
):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()

    c.execute(
        "UPDATE chats SET titulo = ? WHERE id = ? AND user_id = ?",
        (req.titulo, chat_id, user_id),
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Renombrado exitosamente"}


@router.delete("/chats/{chat_id}")
def eliminar_chat(chat_id: int, user_id: str = Depends(get_current_user)):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()
    c.execute("DELETE FROM chats WHERE id = ? AND user_id = ?", (chat_id, user_id))
    c.execute(
        "DELETE FROM mensajes WHERE chat_id = ? AND user_id = ?", (chat_id, user_id)
    )
    conn.commit()
    conn.close()
    return {"mensaje": "Eliminado exitosamente"}


@router.get("/chats/{chat_id}/mensajes")
def obtener_mensajes(chat_id: int, user_id: str = Depends(get_current_user)):
    conn = sqlite3.connect("tutor.db")
    c = conn.cursor()
    c.execute(
        "SELECT rol, texto FROM mensajes WHERE chat_id = ? AND user_id = ? ORDER BY id ASC",
        (chat_id, user_id),
    )

    mensajes = [{"rol": row[0], "texto": row[1]} for row in c.fetchall()]
    conn.close()
    return mensajes


@router.post("/chat")
def conversar(mensaje: Mensaje, user_id: str = Depends(get_current_user)):
    try:
        conn = sqlite3.connect("tutor.db")
        c = conn.cursor()

        # A) Guardamos lo que dijo el usuario
        c.execute(
            "INSERT INTO mensajes (chat_id, rol, texto, user_id) VALUES (?, ?, ?, ?)",
            (mensaje.chat_id, "user", mensaje.texto, user_id),
        )
        conn.commit()

        # B) Reconstruimos la memoria para Gemini, leyendo la base de datos
        c.execute(
            "SELECT rol, texto FROM mensajes WHERE chat_id = ? ORDER BY id DESC LIMIT 15",
            (mensaje.chat_id,),
        )
        historial_bd = c.fetchall()

        # Los invertimos para que queden en orden cronológico correcto (del más viejo al más nuevo)
        historial_bd.reverse()

        historial_gemini = []
        # Pasamos todos los mensajes menos el último (que es el que enviaremos ahora, para que no lo lea 2 veces)
        for rol, texto in historial_bd[:-1]:

            # gemini pide roles "user" o "model", mientras que en la BDD tenemos "user" y "bot"
            gemini_rol = "user" if rol == "user" else "model"

            # se agregan a las cajas de memoria content y part de Gemini
            historial_gemini.append(
                types.Content(role=gemini_rol, parts=[types.Part.from_text(text=texto)])
            )

        # C) Creamos la sesión de IA inyectándole la memoria del pasado
        chat_ia = client.chats.create(
            model=GEMINI_MODEL,
            # Reglas de comportamiento de la IA
            config={
                "system_instruction": "Eres un amigable y experto tutor de inglés. Responde de forma concisa, conversacional y educativa."
            },
            # Contexto de la conversación (memoria)
            history=historial_gemini,
        )

        # D) Le enviamos el mensaje actual
        respuesta = chat_ia.send_message(mensaje.texto)

        # E) Guardamos la respuesta de la IA
        c.execute(
            "INSERT INTO mensajes (chat_id, rol, texto, user_id) VALUES (?, ?, ?, ?)",
            (mensaje.chat_id, "bot", respuesta.text, user_id),
        )
        conn.commit()
        conn.close()

        return {"respuesta": respuesta.text}
    except Exception as e:
        return {"respuesta": f"Error: {str(e)}"}


