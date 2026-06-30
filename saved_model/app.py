from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
import tensorflow as tf
import keras
import numpy as np
import pandas as pd
import joblib
import json
import time
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# --- Load models + artifacts (once, at startup) ---
print("Loading models and artifacts...")
model_lstm = keras.models.load_model('lstm_risk_model.keras')
model_cnn  = keras.models.load_model('cnn_risk_model.keras')
model      = model_lstm  # fallback alias
scalers_loaded = joblib.load('dynamic_feature_scalers.pkl')
static_scaler_loaded = joblib.load('static_feature_scaler.pkl')
with open('encoding_maps.json') as f:
    encoding_maps_loaded = json.load(f)
with open('feature_schema.json') as f:
    schema_loaded = json.load(f)

DYNAMIC_ORDER = schema_loaded['dynamic_features_order']
N_TIMESTEPS   = schema_loaded['n_timesteps']
FEATURE_IDX   = {name: i for i, name in enumerate(DYNAMIC_ORDER)}
EARLY_WARNING_WEEK = 13
print("Models loaded successfully.")

# --- Groq client ---
GROQ_API_KEY = "YOUR_GROQ_API_KEY"
client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

# --- MySQL ---
DB_CONFIG = {
    'host':     'localhost',
    'port':     3306,
    'user':     'root',
    'password': '',
    'database': 'student_monitoring_db'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ── helpers ──────────────────────────────────────────────────────────────────

def get_risk_tier(risk_score):
    if risk_score < 0.4:
        return "Low"
    elif risk_score < 0.7:
        return "Medium"
    else:
        return "High"

def get_recommended_action(risk_tier, subject_data):
    if risk_tier == "Low":
        return "Maintain current study rhythm"

    code_module = subject_data.get("code_module", "")
    engagement = subject_data.get("engagement_score_recent", 0)
    score = subject_data.get("assessment_score_recent", 0)
    cum_avg = subject_data.get("cumulative_avg_score", 0)
    latency = subject_data.get("submission_latency_recent", 0)

    if risk_tier == "High":
        if (score > 0 and score < 50) or (cum_avg > 0 and cum_avg < 50):
            return f"Schedule a tutor session to review {code_module} concepts"
        elif engagement < 5:
            return f"Increase your activity on the {code_module} platform"
        elif latency > 2:
            return "Submit upcoming course assessments early"
        else:
            return "Book a session with your academic tutor"
    else:  # Medium
        if (score > 0 and score < 70) or (cum_avg > 0 and cum_avg < 70):
            return f"Review recent feedback on {code_module} assessments"
        elif engagement < 15:
            return f"Spend more study time interacting with course materials"
        elif latency > 0:
            return "Schedule a regular weekly study slot to stay ahead"
        else:
            return "Draft a study and revision plan for upcoming topics"

LOW_RISK_TEMPLATE = (
    "Your engagement and performance this semester have been consistently strong. "
    "We have noticed your steady work and positive results so far, which are excellent signs of progress.\n\n"
    "Please continue maintaining your current study rhythm as you head into the next set of topics. "
    "Keep up the great work!"
)

SYSTEM_PROMPT = """You are an empathetic academic advisor assistant for a university student monitoring system.
Generate a personalized, supportive intervention message for a student based on their behavioral data.

STRICT RULES:
- Write 80-150 words for message_text. Do not write fewer than 80 words.
- Format the message_text into EXACTLY two paragraphs, separated by a blank line (using two newline characters \\n\\n).
  * The first paragraph should highlight their current standing, note positive indicators (such as early submissions or strong historical grades), and gently state the area needing support.
  * The second paragraph must focus directly on the recommended action, details of how it will help, and details of available resources.
- Match the tone to the risk tier:
  * Low risk -> warm encouragement, celebrate consistency, NO concern language whatsoever
  * Medium risk -> supportive nudge, acknowledge good effort, gently flag one area to watch
  * High risk -> empathetic urgency, concrete support steps, never shame or alarm
- NEVER say "get back on track", "falling behind", "struggling", or similar concern phrases for Low risk students.
- NEVER interpret a missing assessment score (marked as "No assessment due this week") as a poor result.
- Reference at least one concrete positive data point (e.g. cumulative average, submission timing, engagement).
- NEVER mention exact risk scores, percentages, or the word "risk".
- NEVER make medical, psychological, or mental health diagnoses or assumptions.
- Incorporate the programmatically determined recommended_action seamlessly as the primary recommendation in the second paragraph.
- Respond ONLY with valid JSON (no markdown, no extra text), using this exact schema:
{
  "risk_tier": "Low" | "Medium" | "High",
  "message_text": "the intervention message (containing exactly two paragraphs separated by \\n\\n)",
  "recommended_action": "short phrase describing the action"
}
"""

def build_user_prompt(subject_data, risk_tier, recommended_action):
    assessment_info = (
        f"{subject_data['assessment_score_recent']}/100"
        if subject_data['assessment_score_recent'] > 0
        else "No assessment due this week"
    )

    if subject_data['assessment_score_recent'] == 0:
        submission_info = "N/A (no assessment this week)"
    elif subject_data['submission_latency_recent'] > 0:
        submission_info = f"{subject_data['submission_latency_recent']} days late"
    elif subject_data['submission_latency_recent'] < 0:
        submission_info = f"{abs(subject_data['submission_latency_recent'])} days early"
    else:
        submission_info = "submitted on time"

    return f"""Student data for subject {subject_data['code_module']}:
- Overall risk level: {risk_tier}
- Recent weekly engagement (clicks): {subject_data['engagement_score_recent']}
- Most recent assessment score: {assessment_info}
- Submission timing: {submission_info}
- Cumulative average score so far: {subject_data['cumulative_avg_score']}/100
- Credits for this course: {subject_data['studied_credits']}

The recommended action has been programmatically determined as: "{recommended_action}"

Generate a personalized intervention message that encourages the student to take this recommended action.
Respond ONLY with valid JSON using this exact schema:
{{
  "risk_tier": "{risk_tier}",
  "message_text": "the intervention message",
  "recommended_action": "{recommended_action}"
}}"""

def generate_intervention(subject_data):
    risk_tier  = get_risk_tier(subject_data["risk_score"])
    recommended_action = get_recommended_action(risk_tier, subject_data)
    user_prompt = build_user_prompt(subject_data, risk_tier, recommended_action)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    res_json = json.loads(response.choices[0].message.content)
    res_json["recommended_action"] = recommended_action
    return res_json

def fetch_enrollment_data(cursor, enrollment_id, up_to_week):
    cursor.execute("""
        SELECT e.studied_credits, e.num_of_prev_attempts,
               s.highest_education, s.age_band, e.code_module
        FROM enrollments e
        JOIN students s ON e.id_student = s.id_student
        WHERE e.enrollment_id = %s
    """, (enrollment_id,))
    static_row = cursor.fetchone()

    cursor.execute("""
        SELECT week, engagement_score, assessment_score, submission_latency,
               assessment_due_flag, cumulative_avg_score
        FROM weekly_behavior
        WHERE enrollment_id = %s AND week <= %s
        ORDER BY week
    """, (enrollment_id, up_to_week))
    weekly_rows = cursor.fetchall()
    return static_row, weekly_rows

def build_lstm_input(static_row, weekly_rows):
    studied_credits, num_prev_attempts, highest_ed, age_band, code_module = static_row

    X_input = np.zeros((1, N_TIMESTEPS, len(DYNAMIC_ORDER)))
    for row in weekly_rows:
        week, eng, score, latency, due_flag, cum_avg = row
        if week < N_TIMESTEPS:
            X_input[0, week] = [eng, score, latency, due_flag, cum_avg]

    valid_mask = np.zeros(N_TIMESTEPS, dtype=bool)
    valid_mask[:len(weekly_rows)] = True
    for feat_name, idx in FEATURE_IDX.items():
        if feat_name in scalers_loaded:
            vals        = X_input[0, :, idx].reshape(-1, 1)
            transformed = scalers_loaded[feat_name].transform(vals).flatten()
            transformed[~valid_mask] = 0
            X_input[0, :, idx] = transformed

    edu_encoded  = encoding_maps_loaded['education_order'].get(highest_ed, 0)
    age_encoded  = encoding_maps_loaded['age_order'].get(age_band, 0)
    static_raw   = pd.DataFrame(
        [[studied_credits, num_prev_attempts]],
        columns=['studied_credits', 'num_of_prev_attempts']
    )
    static_scaled = static_scaler_loaded.transform(static_raw)
    static_input  = np.array([[static_scaled[0][0], static_scaled[0][1],
                                edu_encoded, age_encoded]])
    return X_input, static_input, code_module

def run_agent_for_enrollment(cursor, conn, enrollment_id,
                             up_to_week=EARLY_WARNING_WEEK, model_choice='lstm'):
    static_row, weekly_rows = fetch_enrollment_data(cursor, enrollment_id, up_to_week)
    if not weekly_rows:
        return None

    selected_model = model_cnn if model_choice == 'cnn' else model_lstm
    model_ver_tag  = 'cnn_v1' if model_choice == 'cnn' else 'lstm_v1'

    X_input, static_input, code_module = build_lstm_input(static_row, weekly_rows)
    risk_score = float(selected_model.predict([X_input, static_input], verbose=0)[0][0])

    cursor.execute("""
        INSERT INTO risk_predictions
            (enrollment_id, risk_score, week_evaluated, model_version)
        VALUES (%s, %s, %s, %s)
    """, (enrollment_id, risk_score, up_to_week, model_ver_tag))
    conn.commit()
    prediction_id = cursor.lastrowid

    last_assessment_row = next(
        (row for row in reversed(weekly_rows) if row[2] > 0),
        weekly_rows[-1]
    )
    subject_data = {
        "code_module":               code_module,
        "risk_score":                risk_score,
        "engagement_score_recent":   weekly_rows[-1][1],
        "assessment_score_recent":   last_assessment_row[2],
        "cumulative_avg_score":      weekly_rows[-1][5],
        "submission_latency_recent": last_assessment_row[3],
        "studied_credits":           static_row[0]
    }
    try:
        intervention = generate_intervention(subject_data)
        risk_tier = intervention['risk_tier']
        message_text = intervention['message_text']
        recommended_action = intervention['recommended_action']
    except Exception:
        risk_tier = get_risk_tier(risk_score)
        recommended_action = get_recommended_action(risk_tier, subject_data)
        if risk_tier == 'Low':
            message_text = LOW_RISK_TEMPLATE
        else:
            message_text = (
                f"Based on your performance in {code_module}, "
                f"we recommend that you {recommended_action.lower()} "
                "to support your academic progress."
            )

    cursor.execute("""
        INSERT INTO interventions
            (prediction_id, risk_tier, message_text, recommended_action, status)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        prediction_id,
        risk_tier,
        message_text,
        recommended_action,
        'pending'
    ))
    conn.commit()

    return {
        "enrollment_id": enrollment_id,
        "prediction_id": prediction_id,
        "risk_score":    risk_score,
        "risk_tier":     risk_tier,
        "message_text":  message_text,
        "recommended_action": recommended_action
    }


# ── routes ────────────────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT rp.risk_score
        FROM risk_predictions rp
        INNER JOIN (
            SELECT enrollment_id, MAX(predicted_at) as latest
            FROM risk_predictions
            GROUP BY enrollment_id
        ) latest_rp
          ON rp.enrollment_id = latest_rp.enrollment_id
         AND rp.predicted_at  = latest_rp.latest
    """)
    scores = [row[0] for row in cursor.fetchall()]
    cursor.close()
    conn.close()

    total  = len(scores)
    low    = sum(1 for s in scores if s < 0.4)
    medium = sum(1 for s in scores if 0.4 <= s < 0.7)
    high   = sum(1 for s in scores if s >= 0.7)
    avg    = sum(scores) / total if total else 0

    return jsonify({
        "total_monitored":    total,
        "low_risk":           low,
        "medium_risk":        medium,
        "high_risk":          high,
        "average_risk_score": round(avg, 3)
    })


@app.route('/api/students', methods=['GET'])
def get_students():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT e.enrollment_id, e.id_student, e.code_module, e.code_presentation,
               rp.prediction_id, rp.risk_score, rp.week_evaluated, rp.predicted_at, rp.model_version,
               i.risk_tier, i.message_text, i.recommended_action, i.status
        FROM enrollments e
        JOIN risk_predictions rp ON e.enrollment_id = rp.enrollment_id
        JOIN interventions     i  ON rp.prediction_id = i.prediction_id
        ORDER BY rp.risk_score DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)


@app.route('/api/student/<enrollment_id>', methods=['GET'])
def get_student_detail(enrollment_id):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT e.*, s.highest_education, s.age_band
        FROM enrollments e
        JOIN students s ON e.id_student = s.id_student
        WHERE e.enrollment_id = %s
    """, (enrollment_id,))
    enrollment_info = cursor.fetchone()

    cursor.execute("""
        SELECT week, engagement_score, assessment_score, submission_latency,
               assessment_due_flag, cumulative_avg_score
        FROM weekly_behavior
        WHERE enrollment_id = %s
        ORDER BY week
    """, (enrollment_id,))
    weekly_data = cursor.fetchall()

    cursor.execute("""
        SELECT rp.prediction_id, rp.risk_score, rp.week_evaluated, rp.predicted_at, rp.model_version,
               i.risk_tier, i.message_text, i.recommended_action, i.status
        FROM risk_predictions rp
        LEFT JOIN interventions i ON rp.prediction_id = i.prediction_id
        WHERE rp.enrollment_id = %s
        ORDER BY rp.predicted_at DESC
    """, (enrollment_id,))
    predictions = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "enrollment":     enrollment_info,
        "weekly_behavior": weekly_data,
        "predictions":    predictions
    })


@app.route('/api/run-agent/<enrollment_id>', methods=['POST'])
def trigger_agent(enrollment_id):
    data = request.get_json(silent=True) or {}
    model_choice = data.get('model_choice', 'lstm')
    conn   = get_db_connection()
    cursor = conn.cursor()
    try:
        result = run_agent_for_enrollment(cursor, conn, enrollment_id, model_choice=model_choice)
        cursor.close()
        conn.close()
        if result is None:
            return jsonify({"error": "No data available for this enrollment"}), 404
        return jsonify(result)
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route('/api/run-batch', methods=['POST'])
def run_batch():
    data        = request.get_json()
    week        = int(data.get('week', 13))
    risk_filter = data.get('risk_filter', 'All')   # 'All'|'High'|'Medium'|'High+Medium'
    limit       = data.get('limit', None)           # None = dhammaan
    model_choice = data.get('model_choice', 'lstm')
    selected_model = model_cnn if model_choice == 'cnn' else model_lstm
    model_ver_tag  = 'cnn_v1' if model_choice == 'cnn' else 'lstm_v1'

    conn   = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT enrollment_id FROM enrollments")
    all_ids = [row[0] for row in cursor.fetchall()]
    if limit:
        all_ids = all_ids[:int(limit)]

    counts = {"high": 0, "medium": 0, "low": 0, "skipped": 0}
    start  = time.time()

    for eid in all_ids:
        try:
            static_row, weekly_rows = fetch_enrollment_data(cursor, eid, week)
            if not weekly_rows:
                counts["skipped"] += 1
                continue

            X_input, static_input, code_module = build_lstm_input(static_row, weekly_rows)
            risk_score = float(selected_model.predict([X_input, static_input], verbose=0)[0][0])
            tier       = get_risk_tier(risk_score)

            # Apply filter
            if risk_filter == 'High'         and tier != 'High':
                counts["skipped"] += 1; continue
            if risk_filter == 'Medium'       and tier != 'Medium':
                counts["skipped"] += 1; continue
            if risk_filter == 'High+Medium'  and tier == 'Low':
                counts["skipped"] += 1; continue

            # Save prediction (always — keeps history)
            cursor.execute("""
                INSERT INTO risk_predictions
                    (enrollment_id, risk_score, week_evaluated, model_version)
                VALUES (%s, %s, %s, %s)
            """, (eid, risk_score, week, model_ver_tag))
            conn.commit()
            prediction_id = cursor.lastrowid

            # Generate intervention
            if tier == 'Low':
                message_text       = LOW_RISK_TEMPLATE
                recommended_action = "Maintain current study rhythm"
                counts["low"] += 1
            else:
                last_assessment_row = next(
                    (row for row in reversed(weekly_rows) if row[2] > 0),
                    weekly_rows[-1]
                )
                subject_data = {
                    "code_module":               code_module,
                    "risk_score":                risk_score,
                    "engagement_score_recent":   weekly_rows[-1][1],
                    "assessment_score_recent":   last_assessment_row[2],
                    "cumulative_avg_score":      weekly_rows[-1][5],
                    "submission_latency_recent": last_assessment_row[3],
                    "studied_credits":           static_row[0]
                }
                try:
                    intervention       = generate_intervention(subject_data)
                    message_text       = intervention['message_text']
                    recommended_action = intervention['recommended_action']
                    time.sleep(1.2)   # Groq rate limit protection
                except Exception:
                    recommended_action = get_recommended_action(tier, subject_data)
                    message_text       = (
                        f"Based on your performance in {code_module}, "
                        f"we recommend that you {recommended_action.lower()} "
                        "for personalized academic support."
                    )

                if tier == 'High':
                    counts["high"] += 1
                else:
                    counts["medium"] += 1

            cursor.execute("""
                INSERT INTO interventions
                    (prediction_id, risk_tier, message_text, recommended_action, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (prediction_id, tier, message_text, recommended_action, 'pending'))
            conn.commit()

        except Exception:
            counts["skipped"] += 1
            continue

    cursor.close()
    conn.close()

    duration = round(time.time() - start, 1)
    return jsonify({
        "success":          True,
        "week_evaluated":   week,
        "total_processed":  len(all_ids) - counts["skipped"],
        "high_risk":        counts["high"],
        "medium_risk":      counts["medium"],
        "low_risk":         counts["low"],
        "skipped":          counts["skipped"],
        "duration_seconds": duration
    })


@app.route('/api/student-portal/<int:id_student>', methods=['GET'])
def get_student_portal(id_student):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id_student FROM students WHERE id_student = %s",
        (id_student,)
    )
    if not cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({"error": "Student ID not found"}), 404

    cursor.execute("""
        SELECT e.enrollment_id, e.code_module, e.code_presentation,
               rp.risk_score, rp.week_evaluated, rp.predicted_at,
               i.risk_tier, i.message_text, i.recommended_action,
               i.status, i.sent_at
        FROM enrollments e
        JOIN risk_predictions rp ON e.enrollment_id = rp.enrollment_id
        JOIN interventions     i  ON rp.prediction_id = i.prediction_id
        WHERE e.id_student = %s AND i.status = 'sent'
        ORDER BY rp.predicted_at DESC
    """, (id_student,))
    messages = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify({"id_student": id_student, "messages": messages})


@app.route('/api/interventions/<int:prediction_id>', methods=['PUT'])
def update_intervention(prediction_id):
    data   = request.get_json()
    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE interventions
        SET message_text = %s, recommended_action = %s
        WHERE prediction_id = %s
    """, (data.get('message_text'), data.get('recommended_action'), prediction_id))
    conn.commit()
    affected = cursor.rowcount
    cursor.close(); conn.close()

    if affected == 0:
        return jsonify({"error": "Intervention not found"}), 404
    return jsonify({"success": True})


@app.route('/api/interventions/<int:prediction_id>/send', methods=['POST'])
def send_intervention(prediction_id):
    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE interventions
        SET status = 'sent', sent_at = NOW()
        WHERE prediction_id = %s
    """, (prediction_id,))
    conn.commit()
    affected = cursor.rowcount
    cursor.close(); conn.close()

    if affected == 0:
        return jsonify({"error": "Intervention not found"}), 404
    return jsonify({"success": True, "status": "sent"})


@app.route('/api/model-comparison', methods=['GET'])
def get_model_comparison():
    comparison_data = [
        {
            'model': 'LSTM (Proposed)',
            'key': 'lstm',
            'auc': 0.9841,
            'accuracy': 0.9422,
            'precision': 0.9631,
            'recall': 0.9075,
            'f1': 0.9345,
            'description': 'Recurrent neural network capable of capturing long-term temporal sequence patterns and dynamic clickstream behavior across weeks.',
            'is_proposed': True
        },
        {
            'model': 'CNN (1D Conv)',
            'key': 'cnn',
            'auc': 0.9755,
            'accuracy': 0.9233,
            'precision': 0.9391,
            'recall': 0.8888,
            'f1': 0.9133,
            'description': '1D Convolutional network utilizing localized feature extraction filters over short-term temporal windows.',
            'is_proposed': False
        },
        {
            'model': 'Random Forest',
            'key': 'rf',
            'auc': 0.9804,
            'accuracy': 0.9368,
            'precision': 0.9683,
            'recall': 0.8899,
            'f1': 0.9274,
            'description': 'Ensemble tree-based baseline evaluated on aggregated/flattened sequence statistics.',
            'is_proposed': False
        },
        {
            'model': 'Logistic Regression',
            'key': 'lr',
            'auc': 0.9800,
            'accuracy': 0.9339,
            'precision': 0.9458,
            'recall': 0.9065,
            'f1': 0.9257,
            'description': 'Linear baseline model evaluated on flattened feature vectors.',
            'is_proposed': False
        }
    ]
    return jsonify(comparison_data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)