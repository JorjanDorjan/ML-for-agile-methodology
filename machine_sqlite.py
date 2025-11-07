import sqlite3
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os

# Variables globales
scaler = None
conexion = None
cursor = None

def conectar_sqlite():
    """Conectar a SQLite (no requiere instalación adicional)"""
    global conexion, cursor
    try:
        conexion = sqlite3.connect("agileboard.db")
        cursor = conexion.cursor()
        print("✅ Conexión exitosa a SQLite.")
        return True
    except Exception as e:
        print(f"❌ Error conectando a SQLite: {e}")
        return False

def crear_datos_demo():
    """Crear datos de ejemplo si la tabla está vacía"""
    try:
        # Crear tabla sprints si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tareas_completadas INTEGER,
                tareas_pendientes INTEGER,
                problemas_reportados INTEGER,
                evaluacion_likert INTEGER,
                estado TEXT
            )
        """)
        
        # Crear tabla predicciones si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predicciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sprint_id INTEGER,
                probabilidad_retraso REAL,
                recomendacion TEXT
            )
        """)
        
        # Insertar datos de ejemplo
        datos_demo = [
            (25, 8, 2, 4, 'En tiempo'),
            (30, 12, 3, 3, 'En tiempo'),
            (20, 15, 5, 2, 'Retrasado'),
            (35, 5, 1, 5, 'En tiempo'),
            (18, 20, 6, 1, 'Retrasado'),
            (28, 10, 2, 4, 'En tiempo'),
            (22, 18, 4, 2, 'Retrasado'),
            (32, 7, 1, 5, 'En tiempo'),
            (15, 25, 8, 1, 'Retrasado'),
            (40, 3, 0, 5, 'En tiempo'),
            (26, 9, 3, 4, 'En tiempo'),
            (19, 16, 6, 2, 'Retrasado'),
            (33, 6, 1, 5, 'En tiempo'),
            (17, 22, 7, 1, 'Retrasado'),
            (38, 4, 0, 5, 'En tiempo')
        ]
        
        cursor.execute("SELECT COUNT(*) FROM sprints")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("📊 Insertando datos de ejemplo...")
            cursor.executemany("""
                INSERT INTO sprints (tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert, estado)
                VALUES (?, ?, ?, ?, ?)
            """, datos_demo)
            conexion.commit()
            print(f"✅ {len(datos_demo)} registros insertados.")
        else:
            print(f"📊 Tabla sprints ya tiene {count} registros.")
            
    except Exception as e:
        print(f"❌ Error creando datos demo: {e}")
        return False
    return True

def entrenar_modelo():
    global scaler
    try:
        query = """
        SELECT id, tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert, estado
        FROM sprints
        """
        df = pd.read_sql(query, conexion)
        
        if df.empty:
            print("❌ No hay datos en la tabla sprints.")
            return False
            
        print("📊 Datos obtenidos de la base:")
        print(df.head())
        
        X = df[['tareas_completadas', 'tareas_pendientes', 'problemas_reportados', 'evaluacion_likert']]
        y = (df['estado'] == 'Retrasado').astype(int)  # 1 = retrasado, 0 = no retrasado
        
        print(f"📈 Distribución de clases: {y.value_counts().to_dict()}")
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        modelo = RandomForestClassifier(n_estimators=100, random_state=42)
        modelo.fit(X_train_scaled, y_train)
        predicciones = modelo.predict(X_test_scaled)
        precision = accuracy_score(y_test, predicciones)
        
        print(f"🎯 Precisión del modelo: {round(precision*100, 2)}%")
        joblib.dump(modelo, "modelo_retrasos.pkl")
        joblib.dump(scaler, "scaler_retrasos.pkl")  # Guardar también el scaler
        print("💾 Modelo guardado como modelo_retrasos.pkl")
        print("💾 Scaler guardado como scaler_retrasos.pkl")
        return True
        
    except Exception as e:
        print(f"❌ Error entrenando modelo: {e}")
        return False

def predecir_sprint(sprint_id, tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert):
    try:
        # Cargar modelo y scaler
        modelo_cargado = joblib.load("modelo_retrasos.pkl")
        scaler_cargado = joblib.load("scaler_retrasos.pkl")
        
        nuevo_sprint = [[tareas_completadas, tareas_pendientes, problemas_reportados, evaluacion_likert]]
        nuevo_sprint_scaled = scaler_cargado.transform(nuevo_sprint)
        
        prob = modelo_cargado.predict_proba(nuevo_sprint_scaled)[0][1]
        
        recomendacion = "Reducir backlog o redistribuir tareas." if prob > 0.5 else "El equipo avanza correctamente."
        
        insert_query = """
        INSERT INTO predicciones (sprint_id, probabilidad_retraso, recomendacion)
        VALUES (?, ?, ?)
        """
        cursor.execute(insert_query, (sprint_id, float(prob), recomendacion))
        conexion.commit()
        
        print(f"🔮 Predicción guardada para el sprint {sprint_id}. Probabilidad de retraso: {round(prob*100,2)}%")
        print(f"💡 Recomendación: {recomendacion}")
        return True
        
    except Exception as e:
        print(f"❌ Error en predicción: {e}")
        return False

def mostrar_predicciones():
    """Mostrar todas las predicciones guardadas"""
    try:
        cursor.execute("SELECT * FROM predicciones ORDER BY id DESC LIMIT 10")
        predicciones = cursor.fetchall()
        
        if predicciones:
            print("\n📋 Últimas predicciones:")
            for pred in predicciones:
                print(f"  Sprint {pred[1]}: {pred[2]*100:.1f}% retraso - {pred[3]}")
        else:
            print("📋 No hay predicciones guardadas.")
            
    except Exception as e:
        print(f"❌ Error mostrando predicciones: {e}")

def main():
    print("🚀 Iniciando machine_sqlite.py...")
    
    # Conectar a SQLite
    if not conectar_sqlite():
        return
    
    # Crear datos demo si es necesario
    if not crear_datos_demo():
        return
    
    # Entrenar modelo
    if not entrenar_modelo():
        return
    
    # Hacer predicción de ejemplo
    print("\n🔮 Ejecutando predicción de ejemplo...")
    predecir_sprint(sprint_id=1, tareas_completadas=30, tareas_pendientes=12, problemas_reportados=3, evaluacion_likert=5)
    
    # Mostrar predicciones
    mostrar_predicciones()
    
    # Cerrar conexión
    if cursor:
        cursor.close()
    if conexion:
        conexion.close()
    print("🔚 Conexión cerrada correctamente.")

if __name__ == "__main__":
    main()
