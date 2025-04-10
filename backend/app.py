from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai
from dotenv import load_dotenv
from pathlib import Path

from openai import OpenAI

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

app = Flask(__name__)
CORS(app, resources={r"/*": {
    "origins": [
        r"https://.*\.netlify\.app",
        "http://localhost:5173"
    ]
}}, supports_credentials=True)

@app.after_request
def apply_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin and ("netlify.app" in origin or "localhost" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response



openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route("/summary", methods=["POST"])
def generate_summary():
    data = request.get_json()
    chat_text = data.get("messages", "").strip()

    if not chat_text:
        return jsonify({"error": "No conversation provided"}), 400

    prompt = f"""
    You are a clinical assistant summarizing a medical interaction between a nurse and a patient.

    Conversation:
    ---
    {chat_text}
    ---

    Instructions:
    1. Identify symptoms, medications, actions taken, and any responses or concerns.
    2. Focus on key clinical terms like "pain", "medication", "blood pressure", "vomiting", "history", "follow-up", etc.
    3. Create two clearly separated sections:

    **Summary:**
    A concise paragraph summarizing the full conversation and patient status.

    **Nursing Chart:**
    Use the following format, listing each section clearly and independently — do not repeat content across sections:

    - **Assessment:** (Initial findings, symptoms, and observations)
    - **Diagnosis:** (Formal or working diagnosis)
    - **Plan:** (Planned treatment, medications, tests)
    - **Interventions:** (Actions taken during the visit)
    - **Evaluation:** (Outcome, patient response, next steps)

    Respond in **Markdown** format. Do NOT nest other chart sections inside each heading.
    """


    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        summary = response.choices[0].message.content
        return jsonify({"summary": summary})

    except Exception as e:
        import traceback
        print("🔥 Exception occurred while generating summary:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
