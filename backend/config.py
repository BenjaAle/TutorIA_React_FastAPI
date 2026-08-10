import os
import json
import urllib.request
import asyncio
# pyrefly: ignore [missing-import]
import edge_tts
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from fastapi import Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# pyrefly: ignore [missing-import]
from firebase_admin import auth as firebase_auth
# pyrefly: ignore [missing-import]
from google import genai

load_dotenv()

api_key_gemini = os.getenv("GEMINI_API_KEY")
api_key_pexels = os.getenv("PEXELS_API_KEY")

if not api_key_gemini or not api_key_pexels:
    raise ValueError("No se encontraron las claves de API")

GEMINI_MODEL = "gemini-2.5-flash"
client = genai.Client(api_key=api_key_gemini)
security = HTTPBearer()

# Configuraciones de Anki
NOMBRE_MAZO = "Ingles_IA"
NOMBRE_TIPO_CARTA = "Basic"
CAMPO_FRENTE = "Front"
CAMPO_REVERSO = "Back"

# Autenticación
def get_current_user(cred: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = firebase_auth.verify_id_token(cred.credentials)
        return decoded_token.get("email") or decoded_token.get("uid")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas o expiradas",
            headers={"WWW-Authenticate": "Bearer"},
        )


VOCAL_TTS = "en-US-AvaNeural"
audio_sem = asyncio.Semaphore(5)

async def generar_audio(texto, nombre_archivo, voz=VOCAL_TTS, retries=3):
    try:
        if not texto or len(texto.strip()) == 0:
            return
        async with audio_sem:
            for intento in range(retries):
                try:
                    comunicacion = edge_tts.Communicate(texto, voz, rate="-5%")
                    await comunicacion.save(nombre_archivo)
                    if os.path.exists(nombre_archivo) and os.path.getsize(nombre_archivo) > 0:
                        return
                except Exception as e:
                    if intento == retries - 1:
                        raise e
                    await asyncio.sleep(1)
    except Exception as e:
        print(f"Aviso: Fallo generando audio: {str(e)}")
        if os.path.exists(nombre_archivo):
            try:
                os.remove(nombre_archivo)
            except:
                pass

def request_anki(action, **params):
    return {"action": action, "version": 6, "params": params}

def invoke_anki(action, **params):
    requestJson = json.dumps(request_anki(action, **params)).encode("utf-8")
    response = json.load(
        urllib.request.urlopen(
            urllib.request.Request("http://127.0.0.1:8765", requestJson)
        )
    )
    if response["error"] is not None:
        raise Exception(response["error"])
    return response["result"]