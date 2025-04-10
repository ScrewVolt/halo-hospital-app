from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import openai
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://halo-hospital.netlify.app", "http://localhost:5173"]}})

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
2. Focus on key medical terms like "pain", "medication", "blood pressure", "vomiting", "history", "follow-up", etc.
3. Provide a concise and clinically useful **Summary**.
4. Create a structured **Nursing Chart** using this format:

- Assessment:
- Diagnosis:
- Plan:
- Interventions:
- Evaluation:

Ensure accuracy and clarity in professional tone.
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        summary = response.choices[0].message.content
        return jsonify({"summary": summary})
    except Exception as e:
        print("❌ OpenAI API error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
