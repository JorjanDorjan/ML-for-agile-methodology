from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector  # MySQL for integration with machine.py data
import pandas as pd  # Data handling for SQL reads
from sklearn.preprocessing import StandardScaler  # Match scaling approach in machine.py
import joblib  # Load persisted RandomForest model saved by machine.py

# Optional ML: simple baseline using scikit-learn if available
try:
    from sklearn.linear_model import LinearRegression
    import numpy as np
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False


DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')


def _load_db() -> Dict[str, Any]:
    if not os.path.exists(DATA_FILE):
        db = {
            "projects": [],
            "areas": [
                {"id": "a1", "name": "Desarrollo", "description": "Ingeniería y desarrollo de productos"},
                {"id": "a2", "name": "Recursos Humanos", "description": "Gestión de talento"},
                {"id": "a3", "name": "Operaciones", "description": "Operación y logística"},
            ],
            "teams": [],
            "sprints": [],
            "kpis": [],
            "suggestions": [],
            "users": [
                {"email": "demo@empresa.com", "password": "demo123", "role": "scrum_master", "areaId": "a1", "name": "Usuario Demo", "position": "Scrum Master", "seniorityYears": 2, "phone": "+52 55 0000 0000"},
                {"email": "lider@empresa.com", "password": "lider123", "role": "lider_area", "areaId": "a2", "name": "Líder RH", "position": "Líder de Área", "seniorityYears": 5, "phone": "+52 55 1111 1111"},
                {"email": "empleado@empresa.com", "password": "empleado123", "role": "employee", "areaId": "a3", "name": "Empleado Ops", "position": "Analista", "seniorityYears": 1, "phone": "+52 55 2222 2222"}
            ],
            "profiles": [],
            "work_methods": {
                "public": {
                    "description": "Marco ágil basado en Scrum y prácticas Lean."
                },
                "private": {}
            }
        }
        _save_db(db)
        # Ensure profiles created from users
        return _load_db()
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_db(db: Dict[str, Any]) -> None:
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)


app = Flask(__name__)
CORS(app)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + 'Z'


# --- MySQL helpers (align with machine.py) ---
def _mysql_connect():
    try:
        return mysql.connector.connect(
            host="mysql-304b4705-jurgenzabala-1b33.g.aivencloud.com",
            user="avnadmin",
            password="AVNS_U1xwNhM7GkIvQAdsD7B",
            database="agileboard",
            port=17096,
            ssl_ca="ca.pem"
        )
    except Exception as e:
        raise RuntimeError(f"Error conectando a MySQL: {e}")


def _load_sprints_df() -> pd.DataFrame:
    conn = _mysql_connect()
    try:
        query = (
            "SELECT id, tareas_completadas, tareas_pendientes, problemas_reportados, "
            "evaluacion_likert, estado FROM sprints"
        )
        df = pd.read_sql(query, conn)
        return df
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.route('/api/health', methods=['GET'])
def health() -> Any:
    return jsonify({"ok": True, "time": _now_iso()})


# --- Auth (very simple demo auth) ---
@app.route('/api/login', methods=['POST'])
def login() -> Any:
    body = request.get_json(force=True, silent=True) or {}
    email = body.get('email')
    password = body.get('password')
    db = _load_db()
    user = next((u for u in db.get('users', []) if u.get('email') == email and u.get('password') == password), None)
    if not user:
        return jsonify({"error": "Credenciales inválidas"}), 401
    profile = next((p for p in db['profiles'] if p.get('email') == email), None)
    if not profile:
        profile = {
            "id": str(uuid.uuid4()),
            "name": user.get('name'),
            "photoUrl": "",
            "position": user.get('position', 'Empleado'),
            "seniorityYears": user.get('seniorityYears', 1),
            "areaId": user.get('areaId', 'a1'),
            "role": user.get('role', 'employee'),
            "email": email,
            "phone": user.get('phone', ''),
            "activities": [],
            "calendar": [],
            "team": []
        }
        db['profiles'].append(profile)
        _save_db(db)
    return jsonify({"token": profile['id'], "profile": profile})


# --- Profiles ---
@app.route('/api/profiles/me', methods=['GET'])
def get_me() -> Any:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    db = _load_db()
    profile = next((p for p in db['profiles'] if p['id'] == token), None)
    if not profile:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(profile)


# --- Areas ---
@app.route('/api/areas', methods=['GET'])
def list_areas() -> Any:
    db = _load_db()
    return jsonify(db['areas'])


# --- Projects ---
@app.route('/api/projects', methods=['GET'])
def list_projects() -> Any:
    db = _load_db()
    return jsonify(db['projects'])


@app.route('/api/projects', methods=['POST'])
def create_project() -> Any:
    body = request.get_json(force=True, silent=True) or {}
    required = ["name", "objectives", "startDate", "endDate", "owners", "resources"]
    missing = [k for k in required if k not in body]
    if missing:
        return jsonify({"error": f"Faltan campos: {', '.join(missing)}"}), 400
    db = _load_db()
    project = {
        "id": str(uuid.uuid4()),
        "name": body["name"],
        "objectives": body["objectives"],
        "startDate": body["startDate"],
        "endDate": body["endDate"],
        "owners": body["owners"],  # list of profile ids or names
        "resources": body["resources"],
        "status": body.get("status", "en_revision"),  # en_revision, iniciando, en_desarrollo, finalizado
        "areaId": body.get("areaId"),
        "createdAt": _now_iso(),
        "updatedAt": _now_iso()
    }
    db['projects'].append(project)
    _save_db(db)
    return jsonify(project), 201


@app.route('/api/projects/<pid>', methods=['PUT'])
def update_project(pid: str) -> Any:
    body = request.get_json(force=True, silent=True) or {}
    db = _load_db()
    for p in db['projects']:
        if p['id'] == pid:
            p.update({k: v for k, v in body.items() if k in p})
            p['updatedAt'] = _now_iso()
            _save_db(db)
            return jsonify(p)
    return jsonify({"error": "Proyecto no encontrado"}), 404


@app.route('/api/projects/<pid>', methods=['DELETE'])
def delete_project(pid: str) -> Any:
    db = _load_db()
    before = len(db['projects'])
    db['projects'] = [p for p in db['projects'] if p['id'] != pid]
    _save_db(db)
    if len(db['projects']) == before:
        return jsonify({"error": "Proyecto no encontrado"}), 404
    return jsonify({"ok": True})


# --- Suggestions & Self-assessments ---
@app.route('/api/suggestions', methods=['GET'])
def list_suggestions() -> Any:
    db = _load_db()
    return jsonify(db['suggestions'])


@app.route('/api/suggestions', methods=['POST'])
def create_suggestion() -> Any:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    body = request.get_json(force=True, silent=True) or {}
    db = _load_db()
    profile = next((p for p in db['profiles'] if p['id'] == token), None)
    if not profile:
        return jsonify({"error": "Unauthorized"}), 401
    suggestion = {
        "id": str(uuid.uuid4()),
        "authorId": profile['id'],
        "authorRole": profile['role'],
        "areaId": profile['areaId'],
        "type": body.get('type', 'general'),  # duda, sugerencia, autoevaluacion
        "title": body.get('title', ''),
        "content": body.get('content', ''),
        "status": "en_revision_lider",  # flujo: en_revision_lider -> revisado_equipo -> aprobado/rechazado
        "createdAt": _now_iso(),
        "updatedAt": _now_iso()
    }
    db['suggestions'].append(suggestion)
    _save_db(db)
    return jsonify(suggestion), 201


@app.route('/api/suggestions/<sid>/status', methods=['PUT'])
def update_suggestion_status(sid: str) -> Any:
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    body = request.get_json(force=True, silent=True) or {}
    new_status = body.get('status')
    if new_status not in {"en_revision_lider", "revisado_equipo", "aprobado", "rechazado"}:
        return jsonify({"error": "Estado inválido"}), 400
    db = _load_db()
    profile = next((p for p in db['profiles'] if p['id'] == token), None)
    if not profile:
        return jsonify({"error": "Unauthorized"}), 401
    for s in db['suggestions']:
        if s['id'] == sid:
            # Simple RBAC: only leaders or scrum masters can change status
            if profile['role'] not in {"lider_area", "lider_equipo", "scrum_master", "admin"}:
                return jsonify({"error": "Permisos insuficientes"}), 403
            s['status'] = new_status
            s['updatedAt'] = _now_iso()
            _save_db(db)
            return jsonify(s)
    return jsonify({"error": "Sugerencia no encontrada"}), 404


# --- KPIs ---
@app.route('/api/kpis', methods=['GET'])
def list_kpis() -> Any:
    db = _load_db()
    return jsonify(db['kpis'])


@app.route('/api/kpis', methods=['POST'])
def create_kpi() -> Any:
    body = request.get_json(force=True, silent=True) or {}
    db = _load_db()
    kpi = {
        "id": str(uuid.uuid4()),
        "areaId": body.get('areaId'),
        "name": body.get('name'),
        "value": body.get('value'),
        "sprint": body.get('sprint'),
        "date": body.get('date', _now_iso())
    }
    db['kpis'].append(kpi)
    _save_db(db)
    return jsonify(kpi), 201


@app.route('/api/seed/kpis-demo', methods=['POST'])
def seed_kpis_demo() -> Any:
    """Populate demo KPI data for ML: value ≈ 30 + 5*sprint + noise."""
    db = _load_db()
    area_id = (request.get_json(silent=True) or {}).get('areaId', 'a1')
    base = 30.0
    slope = 5.0
    import random
    for s in range(1, 13):  # 12 sprints
        val = base + slope * s + random.uniform(-2.0, 2.0)
        db['kpis'].append({
            "id": str(uuid.uuid4()),
            "areaId": area_id,
            "name": "kpi_velocidad",
            "value": round(val, 2),
            "sprint": s,
            "date": _now_iso()
        })
    _save_db(db)
    return jsonify({"ok": True, "added": 12})


# --- Simple ML endpoints ---
@app.route('/api/ml/train', methods=['POST'])
def ml_train() -> Any:
    if not SKLEARN_AVAILABLE:
        return jsonify({"error": "scikit-learn no disponible"}), 501
    body = request.get_json(force=True, silent=True) or {}
    feature_keys: List[str] = body.get('features', ['value'])
    target_key: str = body.get('target', 'value')
    db = _load_db()
    data = db.get('kpis', [])
    if len(data) < 2:
        return jsonify({"error": "Datos insuficientes para entrenamiento"}), 400
    try:
        X = np.array([[float(item.get(k, 0.0)) for k in feature_keys] for item in data])
        y = np.array([float(item.get(target_key, 0.0)) for item in data])
        model = LinearRegression()
        model.fit(X, y)
        # Persist a tiny model snapshot
        coef = model.coef_.tolist()
        intercept = float(model.intercept_)
        db['ml_model'] = {
            'feature_keys': feature_keys,
            'target_key': target_key,
            'coef': coef,
            'intercept': intercept,
            'trainedAt': _now_iso()
        }
        _save_db(db)
        return jsonify({"ok": True, "metrics": {"r2": float(model.score(X, y))}})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/ml/predict', methods=['POST'])
def ml_predict() -> Any:
    db = _load_db()
    model = db.get('ml_model')
    if not model:
        return jsonify({"error": "Modelo no entrenado"}), 400
    body = request.get_json(force=True, silent=True) or {}
    features = model['feature_keys']
    try:
        x = [float(body.get(k, 0.0)) for k in features]
        y = sum(c * v for c, v in zip(model['coef'], x)) + model['intercept']
        return jsonify({"prediction": y})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- SQL-backed endpoints integrating with machine.py model ---
@app.route('/api/sql/sprints', methods=['GET'])
def sql_list_sprints() -> Any:
    try:
        df = _load_sprints_df()
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sql/predicciones', methods=['GET'])
def sql_list_predicciones() -> Any:
    try:
        conn = _mysql_connect()
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, sprint_id, probabilidad_retraso, recomendacion FROM predicciones ORDER BY id DESC LIMIT 100"
        )
        rows = cur.fetchall() or []
        cur.close()
        conn.close()
        # Normalize float serialization
        for r in rows:
            if isinstance(r.get('probabilidad_retraso'), (float, int)):
                r['probabilidad_retraso'] = float(r['probabilidad_retraso'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sql/predict', methods=['POST'])
def sql_predict() -> Any:
    """Predict using the RandomForest saved by machine.py. We refit a StandardScaler
    on current sprints (same feature set) to mirror machine.py preprocessing,
    then transform the incoming features before model.predict_proba.
    Also persists into predicciones as machine.py does.
    """
    body = request.get_json(force=True, silent=True) or {}
    try:
        sprint_id = int(body.get('sprint_id'))
        tareas_completadas = float(body.get('tareas_completadas', 0))
        tareas_pendientes = float(body.get('tareas_pendientes', 0))
        problemas_reportados = float(body.get('problemas_reportados', 0))
        evaluacion_likert = float(body.get('evaluacion_likert', 0))
    except Exception:
        return jsonify({"error": "Parámetros inválidos"}), 400

    # Load training data to build scaler like machine.py
    df = _load_sprints_df()
    if df.empty:
        return jsonify({"error": "No hay datos en sprints"}), 400
    feature_cols = ['tareas_completadas', 'tareas_pendientes', 'problemas_reportados', 'evaluacion_likert']
    try:
        X = df[feature_cols]
    except Exception:
        return jsonify({"error": "Estructura de sprints inválida"}), 500

    scaler = StandardScaler()
    scaler.fit(X)
    x_new = [[tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert]]
    x_new_scaled = scaler.transform(x_new)

    # Load model saved by machine.py
    try:
        model = joblib.load("modelo_retrasos.pkl")
    except Exception as e:
        return jsonify({"error": f"No se pudo cargar modelo_retrasos.pkl: {e}"}), 500

    try:
        prob = float(model.predict_proba(x_new_scaled)[0][1])
    except Exception as e:
        return jsonify({"error": f"Error al predecir: {e}"}), 500

    recomendacion = "Reducir backlog o redistribuir tareas." if prob > 0.5 else "El equipo avanza correctamente."

    # Persist into predicciones like machine.py
    try:
        conn = _mysql_connect()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO predicciones (sprint_id, probabilidad_retraso, recomendacion) VALUES (%s, %s, %s)",
            (sprint_id, prob, recomendacion),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        return jsonify({"error": f"Error guardando predicción: {e}"}), 500

    return jsonify({
        "sprint_id": sprint_id,
        "probabilidad_retraso": prob,
        "recomendacion": recomendacion,
    })
from flask import send_from_directory
import os

# --- servir el archivo HTML principal (frontend) ---
@app.route('/')
def servir_index():
    return send_from_directory(os.getcwd(), 'index.html')

# --- servir archivos estáticos (CSS, JS, imágenes, etc.) ---
@app.route('/<path:filename>')
def servir_archivos(filename):
    return send_from_directory(os.getcwd(), filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)




