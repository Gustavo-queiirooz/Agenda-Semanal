from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta, date, time
from typing import List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from starlette.middleware.cors import CORSMiddleware

# =============================================================================
# CONFIG
# =============================================================================
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for a school app

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Agenda Colaborativa")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agenda")

# =============================================================================
# HELPERS
# =============================================================================
USER_COLORS = ["#0ea5e9", "#10b981", "#a855f7", "#f97316", "#ef4444",
               "#eab308", "#14b8a6", "#ec4899", "#6366f1", "#84cc16"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def serialize_user(u: dict, include_email: bool = True) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u["name"],
        "email": u["email"] if include_email else None,
        "role": u["role"],
        "color": u.get("color", "#0ea5e9"),
        "active": u.get("active", True),
        "team_id": str(u["team_id"]) if u.get("team_id") else None,
        "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
    }


def serialize_team(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "name": t["name"],
        "description": t.get("description", ""),
    }


def serialize_appointment(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "user_id": str(a["user_id"]),
        "team_id": str(a["team_id"]) if a.get("team_id") else None,
        "title": a["title"],
        "date": a["date"],  # YYYY-MM-DD string
        "start_time": a["start_time"],  # HH:MM
        "end_time": a["end_time"],
        "location": a.get("location", ""),
        "description": a.get("description", ""),
        "color": a.get("color"),
        "created_at": a.get("created_at").isoformat() if a.get("created_at") else None,
        "updated_at": a.get("updated_at").isoformat() if a.get("updated_at") else None,
    }


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Usuário desativado")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user


# =============================================================================
# MODELS
# =============================================================================
class LoginPayload(BaseModel):
    email: str
    password: str


class TeamCreate(BaseModel):
    name: str
    description: str = ""


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"  # user | admin
    team_id: Optional[str] = None
    color: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    team_id: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None


class AppointmentPayload(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str
    location: str = ""
    description: str = ""
    color: Optional[str] = None


# =============================================================================
# AUTH
# =============================================================================
@api.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Usuário desativado")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(str(user["_id"]))
    return {"token": token, "user": serialize_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# =============================================================================
# TEAMS
# =============================================================================
@api.get("/teams")
async def list_teams(user: dict = Depends(get_current_user)):
    teams = await db.teams.find().to_list(500)
    return [serialize_team(t) for t in teams]


@api.post("/teams")
async def create_team(payload: TeamCreate, admin: dict = Depends(require_admin)):
    doc = {
        "name": payload.name,
        "description": payload.description,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.teams.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_team(doc)


@api.put("/teams/{team_id}")
async def update_team(team_id: str, payload: TeamUpdate, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nada para atualizar")
    res = await db.teams.update_one({"_id": ObjectId(team_id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    return serialize_team(team)


@api.delete("/teams/{team_id}")
async def delete_team(team_id: str, admin: dict = Depends(require_admin)):
    await db.teams.delete_one({"_id": ObjectId(team_id)})
    return {"ok": True}


# =============================================================================
# USERS
# =============================================================================
@api.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    # All authenticated users can see the team roster (needed for filters)
    users = await db.users.find().to_list(1000)
    is_admin = user.get("role") == "admin"
    return [serialize_user(u, include_email=is_admin or str(u["_id"]) == str(user["_id"])) for u in users]


@api.post("/users")
async def create_user(payload: UserCreate, admin: dict = Depends(require_admin)):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    if payload.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Função inválida")

    # Assign color if not provided
    color = payload.color
    if not color:
        count = await db.users.count_documents({})
        color = USER_COLORS[count % len(USER_COLORS)]

    team_id = None
    if payload.team_id:
        team_id = ObjectId(payload.team_id)
    else:
        default_team = await db.teams.find_one({})
        if default_team:
            team_id = default_team["_id"]

    doc = {
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "color": color,
        "active": True,
        "team_id": team_id,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_user(doc)


@api.put("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, admin: dict = Depends(require_admin)):
    updates = {}
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        updates["password_hash"] = hash_password(data["password"])
    for field in ("name", "role", "color", "active"):
        if field in data and data[field] is not None:
            updates[field] = data[field]
    if "email" in data and data["email"]:
        updates["email"] = data["email"].lower().strip()
    if "team_id" in data:
        updates["team_id"] = ObjectId(data["team_id"]) if data["team_id"] else None

    if not updates:
        raise HTTPException(status_code=400, detail="Nada para atualizar")

    res = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_user(updated)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if str(admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Você não pode excluir a si mesmo")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.appointments.delete_many({"user_id": ObjectId(user_id)})
    return {"ok": True}


# =============================================================================
# APPOINTMENTS
# =============================================================================
def _validate_time_range(payload: AppointmentPayload):
    try:
        datetime.strptime(payload.date, "%Y-%m-%d")
        s = datetime.strptime(payload.start_time, "%H:%M")
        e = datetime.strptime(payload.end_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Data/horário inválidos")
    if e <= s:
        raise HTTPException(status_code=400, detail="O horário final deve ser após o inicial")


@api.get("/appointments")
async def list_appointments(
    start: str,  # YYYY-MM-DD
    end: str,
    user: dict = Depends(get_current_user),
):
    """Return appointments in [start, end] range for the current user's team."""
    query = {"date": {"$gte": start, "$lte": end}}
    if user.get("team_id"):
        query["team_id"] = user["team_id"]
    appts = await db.appointments.find(query).to_list(2000)
    return [serialize_appointment(a) for a in appts]


@api.post("/appointments")
async def create_appointment(payload: AppointmentPayload, user: dict = Depends(get_current_user)):
    _validate_time_range(payload)
    doc = {
        "user_id": user["_id"],
        "team_id": user.get("team_id"),
        "title": payload.title,
        "date": payload.date,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "location": payload.location,
        "description": payload.description,
        "color": payload.color or user.get("color"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = await db.appointments.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_appointment(doc)


@api.put("/appointments/{appt_id}")
async def update_appointment(appt_id: str, payload: AppointmentPayload, user: dict = Depends(get_current_user)):
    _validate_time_range(payload)
    appt = await db.appointments.find_one({"_id": ObjectId(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    is_owner = str(appt["user_id"]) == str(user["_id"])
    is_admin = user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Você só pode editar seus próprios compromissos")

    updates = {
        "title": payload.title,
        "date": payload.date,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "location": payload.location,
        "description": payload.description,
        "color": payload.color or appt.get("color"),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.appointments.update_one({"_id": ObjectId(appt_id)}, {"$set": updates})
    updated = await db.appointments.find_one({"_id": ObjectId(appt_id)})
    return serialize_appointment(updated)


@api.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: str, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"_id": ObjectId(appt_id)})
    if not appt:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    is_owner = str(appt["user_id"]) == str(user["_id"])
    is_admin = user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Você só pode excluir seus próprios compromissos")
    await db.appointments.delete_one({"_id": ObjectId(appt_id)})
    return {"ok": True}


@api.get("/appointments/conflicts")
async def check_conflicts(
    date: str, start_time: str, end_time: str,
    exclude_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {"date": date, "team_id": user.get("team_id")}
    appts = await db.appointments.find(query).to_list(500)
    conflicts = []
    for a in appts:
        if exclude_id and str(a["_id"]) == exclude_id:
            continue
        if a["start_time"] < end_time and a["end_time"] > start_time:
            conflicts.append(serialize_appointment(a))
    return conflicts


# =============================================================================
# SEED
# =============================================================================
async def seed_data():
    # Team
    team = await db.teams.find_one({"name": "Equipe Escolar"})
    if not team:
        res = await db.teams.insert_one({
            "name": "Equipe Escolar",
            "description": "Equipe padrão da escola",
            "created_at": datetime.now(timezone.utc),
        })
        team_id = res.inserted_id
    else:
        team_id = team["_id"]

    seed_users = [
        {"name": "Administrador", "email": "admin@agenda.local", "role": "admin", "color": "#0f172a"},
        {"name": "Gustavo", "email": "gustavo@agenda.local", "role": "user", "color": "#0ea5e9"},
        {"name": "Benedito", "email": "benedito@agenda.local", "role": "user", "color": "#10b981"},
        {"name": "João", "email": "joao@agenda.local", "role": "user", "color": "#a855f7"},
        {"name": "Maria", "email": "maria@agenda.local", "role": "user", "color": "#f97316"},
    ]
    default_pw = os.environ.get("ADMIN_PASSWORD", "senha123")
    for u in seed_users:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            # Ensure password matches env for admin (idempotent)
            if u["role"] == "admin" and not verify_password(default_pw, existing["password_hash"]):
                await db.users.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"password_hash": hash_password(default_pw)}}
                )
            continue
        await db.users.insert_one({
            "name": u["name"],
            "email": u["email"],
            "password_hash": hash_password(default_pw),
            "role": u["role"],
            "color": u["color"],
            "active": True,
            "team_id": team_id,
            "created_at": datetime.now(timezone.utc),
        })

    # Seed appointments (only if none exist)
    count = await db.appointments.count_documents({})
    if count == 0:
        # Use current week Monday as base
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        users_map = {}
        async for u in db.users.find({"role": "user"}):
            users_map[u["name"]] = u

        demo = [
            ("Gustavo", "Reunião pedagógica", 0, "14:00", "15:00", "Sala da Coordenação"),
            ("Benedito", "Atendimento aos pais", 0, "14:00", "15:30", "Sala 12"),
            ("Maria", "Aula de Português", 1, "08:00", "09:00", "Sala 3"),
            ("João", "Conselho de classe", 2, "10:00", "11:30", "Auditório"),
            ("Gustavo", "Planejamento semanal", 3, "09:00", "10:00", "Sala dos Professores"),
            ("Maria", "Atendimento individual", 4, "15:00", "16:00", "Sala 8"),
        ]
        for name, title, weekday, s, e, loc in demo:
            u = users_map.get(name)
            if not u:
                continue
            d = monday + timedelta(days=weekday)
            await db.appointments.insert_one({
                "user_id": u["_id"],
                "team_id": team_id,
                "title": title,
                "date": d.isoformat(),
                "start_time": s,
                "end_time": e,
                "location": loc,
                "description": "",
                "color": u.get("color"),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.appointments.create_index([("team_id", 1), ("date", 1)])
    await seed_data()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
