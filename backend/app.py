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

    ---

    Conversation:
    {chat_text}

    ---

    Instructions:

    You will return two clearly formatted sections:
    1. A **Summary** — a short paragraph explaining what the visit was about and the outcome.
    2. A **Nursing Chart** — divided into 5 sections:
    - **Assessment**
    - **Diagnosis**
    - **Plan**
    - **Interventions**
    - **Evaluation**

    **Rules for Nursing Chart output:**
    - Each section must start with `**SectionName:**` on its own line.
    - Do NOT include other sections inside a section (e.g. don’t nest Plan inside Assessment).
    - Do NOT repeat the same content across multiple sections.
    - Each section should be short and unique.
    - Respond using clean markdown. Use plain text and bullets as needed.

    ---

    Respond ONLY with this format:

    **Summary:**
    <summary paragraph here>

    **Nursing Chart:**
    **Assessment:**
    ...

    **Diagnosis:**
    ...

    **Plan:**
    ...

    **Interventions:**
    ...

    **Evaluation:**
    ...
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
