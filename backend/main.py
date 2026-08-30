import os
import sqlite3

# pyrefly: ignore [missing-import]
import firebase_admin

# pyrefly: ignore [missing-import]
from firebase_admin import credentials

# pyrefly: ignore [missing-import]
from fastapi import FastAPI

# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles  # Para que la web lea estaticos js y css

# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from routers import chats, anki, historias, fonetica, vocabulario, ejercicios, roadmap

# Inicializar Firebase Admin
cred = credentials.Certificate("credenciales_firebase.json")
firebase_admin.initialize_app(cred)


# Inicializar la base de datos
def iniciar_bd():
    # Abrir archivo de la BDD (o crearlo)
    conn = sqlite3.connect("tutor.db")

    # Crear cursor para ejecutar comandos SQL
    c = conn.cursor()

    # Tabla para guardar las sesiones de chat (barra lateral)
    # id, titulo del chat
    c.execute(
        """CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT)"""
    )
    # Tabla para guardar los mensajes de cada chat (extraidos para memoria y extracción a Anki)
    # rol: yo o IA. extraido: 0 = no extraido, 1 = ya extraido a Anki
    # id, chat_id, rol, texto, extraido
    c.execute(
        """CREATE TABLE IF NOT EXISTS mensajes (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, rol TEXT, texto TEXT, extraido INTEGER DEFAULT 0)"""
    )

    # Tabla para guardar historias
    # id, titulo (lo pone la IA), tematica (la que le doy yo)
    c.execute(
        """CREATE TABLE IF NOT EXISTS historias (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, tematica TEXT)"""
    )

    # Tabla para guardar las líneas de cada historia
    # id, historia_id, orden (0,1,2...), oracion_en, oracion_es, ruta_audio
    c.execute(
        """CREATE TABLE IF NOT EXISTS lineas_historia (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, 
                 historia_id INTEGER, 
                 orden INTEGER, 
                 oracion_en TEXT, 
                 oracion_es TEXT, 
                 ruta_audio TEXT)"""
    )

    # Se agrega la columna oracion_ipa
    try:
        c.execute("ALTER TABLE lineas_historia ADD COLUMN oracion_ipa TEXT")
    except sqlite3.OperationalError:
        pass  # Si la columna ya existe, simplemente ignora el error

    # Tabla para destacar las palabras extraidas de las historias.
    # NOTA: En la migración multiusuario, omitimos la palabra como UNIQUE universal y la atamos al usuario luego.
    c.execute(
        """CREATE TABLE IF NOT EXISTS vocabulario_anki (
                    palabra TEXT UNIQUE COLLATE NOCASE
                )"""
    )

    # ==============================================================
    # MIGRACIÓN MULTIUSUARIO: Agregar user_id a todas las tablas base
    # ==============================================================
    try:
        c.execute("ALTER TABLE chats ADD COLUMN user_id TEXT")
        c.execute("ALTER TABLE mensajes ADD COLUMN user_id TEXT")
        c.execute("ALTER TABLE historias ADD COLUMN user_id TEXT")
        c.execute("ALTER TABLE vocabulario_anki ADD COLUMN user_id TEXT")
        # Por defecto, marcamos chats pasados al primer que se loguee o lo dejamos generico
        c.execute("UPDATE chats SET user_id = 'migrado' WHERE user_id IS NULL")
        c.execute("UPDATE mensajes SET user_id = 'migrado' WHERE user_id IS NULL")
        c.execute("UPDATE historias SET user_id = 'migrado' WHERE user_id IS NULL")
    except sqlite3.OperationalError:
        pass

    # Tabla para descartar/guardar oraciones Cloze
    c.execute(
        """CREATE TABLE IF NOT EXISTS oraciones_cloze (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, 
                 ingles TEXT, 
                 espanol TEXT, 
                 user_id TEXT, 
                 chat_id INTEGER,
                 origen TEXT DEFAULT 'anki',
                 palabra_oculta TEXT DEFAULT '')"""
    )

    # Tabla para el progreso de la ruta de aprendizaje
    c.execute(
        """CREATE TABLE IF NOT EXISTS progreso_roadmap (
                 id INTEGER PRIMARY KEY AUTOINCREMENT, 
                 user_id TEXT, 
                 node_id TEXT, 
                 status TEXT DEFAULT 'completed')"""
    )

    conn.commit()
    conn.close()

    # Crear carpeta para guardar los audios de las historias si no existe
    os.makedirs("static/audios", exist_ok=True)


iniciar_bd()

app = FastAPI(title="Tutor de Inglés con IA")

# 1. Configurar CORS
app.add_middleware(
    CORSMiddleware,  # Permite que la web en React (Vite) pueda hacer peticiones a este backend
    allow_origins=["http://localhost:5173"],  # El puerto de Vite (React)
    allow_credentials=True,  # Permite enviar cookies y cabeceras de autenticación
    allow_methods=[
        "*"
    ],  # Permite todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permite todas las cabeceras HTTP
)

# Permiso para ver la carpeta static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routers
app.include_router(chats.router)
app.include_router(anki.router)
app.include_router(historias.router)
app.include_router(fonetica.router)
app.include_router(vocabulario.router)
app.include_router(ejercicios.router)
app.include_router(roadmap.router)
