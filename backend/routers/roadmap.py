import os
import json
import sqlite3

# pyrefly: ignore [missing-import]
from fastapi import APIRouter

# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class ProgresoRequest(BaseModel):
    user_id: str
    node_id: str
    status: str = "completed"


def get_db_connection():
    conn = sqlite3.connect("tutor.db")
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/")
def get_roadmap():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(current_dir, "..", "roadmap_data.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@router.get("/progreso/{user_id}")
def get_progreso(user_id: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        "SELECT node_id, status FROM progreso_roadmap WHERE user_id = ?", (user_id,)
    )
    filas = c.fetchall()
    conn.close()

    progreso = {}
    for f in filas:
        progreso[f["node_id"]] = f["status"]

    return progreso


@router.post("/progreso")
def actualizar_progreso(req: ProgresoRequest):
    conn = get_db_connection()
    c = conn.cursor()

    # Comprobar si ya existe
    c.execute(
        "SELECT id FROM progreso_roadmap WHERE user_id = ? AND node_id = ?",
        (req.user_id, req.node_id),
    )
    existe = c.fetchone()

    if existe:
        c.execute(
            "UPDATE progreso_roadmap SET status = ? WHERE user_id = ? AND node_id = ?",
            (req.status, req.user_id, req.node_id),
        )
    else:
        c.execute(
            "INSERT INTO progreso_roadmap (user_id, node_id, status) VALUES (?, ?, ?)",
            (req.user_id, req.node_id, req.status),
        )

    conn.commit()
    conn.close()

    return {"message": "Progreso actualizado"}
