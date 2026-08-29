import sqlite3
import random
import json
import re
import os
import base64

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
from config import (
    get_current_user,
    client,
    GEMINI_MODEL,
    invoke_anki,
    NOMBRE_TIPO_CARTA,
    NOMBRE_MAZO,
    generar_audio,
    CAMPO_FRENTE,
    CAMPO_REVERSO,
)

# pyrefly: ignore [missing-import]
from google.genai import types

router = APIRouter(prefix="/ejercicios", tags=["Ejercicios"])


@router.get("/cloze")
def obtener_oraciones_cloze(
    origen: str = "anki", user_id: str = Depends(get_current_user)
):
    try:
        conn = sqlite3.connect("tutor.db")
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute(
            "SELECT id, ingles, espanol, chat_id, origen, palabra_oculta FROM oraciones_cloze WHERE user_id = ? AND origen = ?",
            (user_id, origen),
        )
        filas = c.fetchall()
        conn.close()

        if not filas:
            return {"oraciones": []}

        # Elegir hasta 10 oraciones al azar
        cantidad = min(10, len(filas))
        seleccionadas = random.sample(filas, cantidad)
        oraciones = [dict(row) for row in seleccionadas]

        return {"oraciones": oraciones}
    except Exception as e:
        return {"error": f"Error obteniendo oraciones: {str(e)}"}


@router.post("/generar_cloze")
def generar_cloze_con_ia(user_id: str = Depends(get_current_user)):
    try:
        conn = sqlite3.connect("tutor.db")
        c = conn.cursor()
        c.execute(
            "SELECT rol, texto FROM mensajes WHERE user_id = ? ORDER BY id DESC LIMIT 20",
            (user_id,),
        )
        historial_bd = reversed(c.fetchall())

        historial_texto = ""
        for rol, texto in historial_bd:
            quien = "Alumno" if rol == "user" else "Tutor"
            historial_texto += f"{quien}: {texto}\n\n"

        instrucciones = """
        Eres un creador de ejercicios de inglés muy útil que genera oraciones para un minijuego 'Cloze' de rellenar huecos.
        Analiza este historial reciente de conversación del estudiante (delimitado por <historial>).
        Genera EXACTAMENTE 5 oraciones muy útiles en inglés basadas en sus errores o usando conectores o preposiciones comunes (in, on, at, to, for, with).
        REGLA 1: Devuelve ESTRICTAMENTE un arreglo JSON puro. Nada de markdown.
        REGLA 2: Cada objeto debe tener la oración completa en "ingles", su "espanol", y OBLIGATORIAMENTE la "palabra_oculta" que consideres más desafiante de la oración para que el alumno intente adivinarla.
        Formato esperado:
        [
          {
            "ingles": "She is interested in learning French.",
            "espanol": "Ella está interesada en aprender francés.",
            "palabra_oculta": "interested"
          }
        ]
        """

        historial_seguro = historial_texto.replace("</historial>", "")
        if not historial_seguro.strip():
            historial_seguro = "El alumno ingresó a la plataforma por primera vez. Haz unas oraciones básicas B1."

        usuario_input = f"<historial>\n{historial_seguro}\n</historial>"

        configuracion = types.GenerateContentConfig(
            system_instruction=instrucciones,
            response_mime_type="application/json",
            temperature=0.7,
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL, contents=usuario_input, config=configuracion
        )

        respuesta_limpia = (
            response.text.replace("```json", "").replace("```", "").strip()
        )
        oraciones_ia = json.loads(respuesta_limpia)

        if isinstance(oraciones_ia, dict):
            oraciones_ia = next(
                (v for v in oraciones_ia.values() if isinstance(v, list)), []
            )

        insertadas = 0
        for oracion in oraciones_ia:
            ingles = str(oracion.get("ingles", "")).strip()
            espanol = str(oracion.get("espanol", "")).strip()
            palabra_oculta = str(oracion.get("palabra_oculta", "")).strip()
            if ingles and espanol:
                c.execute(
                    "INSERT INTO oraciones_cloze (ingles, espanol, user_id, chat_id, origen, palabra_oculta) VALUES (?, ?, ?, ?, 'ia', ?)",
                    (ingles, espanol, user_id, 0, palabra_oculta),
                )
                insertadas += 1

        conn.commit()
        conn.close()

        return {
            "mensaje": f"Se generaron e insertaron {insertadas} oraciones nuevas.",
            "exito": True,
        }

    except Exception as e:
        return {"error": f"Error al generar con IA: {str(e)}"}


@router.delete("/cloze/{oracion_id}")
async def eliminar_ejercicio_cloze(
    oracion_id: int, user_id: str = Depends(get_current_user)
):
    try:
        conn = sqlite3.connect("tutor.db")
        c = conn.cursor()
        c.execute(
            "DELETE FROM oraciones_cloze WHERE id = ? AND user_id = ?",
            (oracion_id, user_id),
        )
        conn.commit()
        conn.close()
        return {"exito": True, "mensaje": "Ejercicio eliminado"}
    except Exception as e:
        return {"error": f"Error eliminando ejercicio: {str(e)}"}
