"""
TF-IDF + Multinomial Naive Bayes emergency triage.
Trains on a labeled synthetic corpus and persists the fitted pipelines.
Predictions are class probabilities from the classifier, not keyword if-statements.
"""
from __future__ import annotations

import os
import pickle
from typing import Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

TRAINING_DATA: List[Tuple[str, str, str]] = [
    ("Person collapsed, unconscious, need immediate medical help", "MEDICAL", "CRITICAL"),
    ("Severe chest pain, difficulty breathing", "MEDICAL", "CRITICAL"),
    ("Crew member injured, bleeding heavily from the leg", "MEDICAL", "HIGH"),
    ("Feeling sick with high fever and chills overnight", "MEDICAL", "HIGH"),
    ("Minor cut on hand, need bandage and antiseptic", "MEDICAL", "LOW"),
    ("Headache and fatigue for two days, still working", "MEDICAL", "MEDIUM"),
    ("Someone broke their arm during fieldwork on the glacier", "MEDICAL", "HIGH"),
    ("Medical supplies running low in the clinic cabinet", "MEDICAL", "MEDIUM"),
    ("Doctor needed urgently, possible frostbite on fingers", "MEDICAL", "CRITICAL"),
    ("Stomach pain after eating, mild nausea", "MEDICAL", "MEDIUM"),
    ("Hypothermia suspected, shivering uncontrollably", "MEDICAL", "CRITICAL"),
    ("Requesting paracetamol for a mild headache", "MEDICAL", "LOW"),
    ("Fire in the building, evacuating now", "STRUCTURAL", "CRITICAL"),
    ("Roof damage from storm, water leaking into lab", "STRUCTURAL", "HIGH"),
    ("Power generator failure, backup not working", "STRUCTURAL", "HIGH"),
    ("Window cracked due to pressure differential", "STRUCTURAL", "MEDIUM"),
    ("Door lock broken on storage unit", "STRUCTURAL", "LOW"),
    ("Heating system malfunction in sleeping quarters", "STRUCTURAL", "HIGH"),
    ("Structural integrity compromised in east wing", "STRUCTURAL", "CRITICAL"),
    ("Water pipe burst in kitchen area", "STRUCTURAL", "HIGH"),
    ("Smoke detected in equipment room, possible electrical fire", "STRUCTURAL", "CRITICAL"),
    ("Loose panel on outer wall, not urgent", "STRUCTURAL", "LOW"),
    ("Massive blizzard approaching, visibility zero", "WEATHER", "CRITICAL"),
    ("Extreme wind warning, cannot go outside", "WEATHER", "HIGH"),
    ("Storm damaged antenna, lost communication", "WEATHER", "HIGH"),
    ("Heavy snowfall, paths blocked between modules", "WEATHER", "MEDIUM"),
    ("Temperature dropped below safe operating levels", "WEATHER", "HIGH"),
    ("White-out conditions, cannot return to base", "WEATHER", "CRITICAL"),
    ("Ice formation on critical external equipment", "WEATHER", "MEDIUM"),
    ("Light flurries, operations continuing as planned", "WEATHER", "LOW"),
    ("Katabatic winds picking up, delay the traverse", "WEATHER", "HIGH"),
    ("Main generator stopped working completely", "EQUIPMENT", "CRITICAL"),
    ("Radio communication down on channel two", "EQUIPMENT", "HIGH"),
    ("Vehicle breakdown in the field, stranded", "EQUIPMENT", "HIGH"),
    ("Scientific spectrometer malfunction, data paused", "EQUIPMENT", "MEDIUM"),
    ("Fuel pump not working at the depot", "EQUIPMENT", "HIGH"),
    ("Battery backup depleted on weather station", "EQUIPMENT", "MEDIUM"),
    ("Navigation system failure on snowcat", "EQUIPMENT", "HIGH"),
    ("Spare GPS batteries requested for next week", "EQUIPMENT", "LOW"),
    ("Routine supply request for kitchen stores", "OTHER", "LOW"),
    ("Question about the weekly schedule", "OTHER", "LOW"),
    ("Non-urgent administrative matter regarding leave", "OTHER", "LOW"),
    ("Requesting permission for a short field trip", "OTHER", "LOW"),
    ("Please update the duty roster for Saturday", "OTHER", "LOW"),
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained")
MODEL_PATH = os.path.join(MODEL_DIR, "triage_nb.pkl")


class EmergencyTriageClassifier:
    def __init__(self):
        self.model = None
        self.severity_model = None
        if not self._load():
            self._train_models()
            self._save()

    def _pipelines(self) -> Tuple[Pipeline, Pipeline]:
        cat = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=400, ngram_range=(1, 2), min_df=1)),
            ("clf", MultinomialNB(alpha=0.3)),
        ])
        sev = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=400, ngram_range=(1, 2), min_df=1)),
            ("clf", MultinomialNB(alpha=0.3)),
        ])
        return cat, sev

    def _train_models(self):
        messages = [m for m, _, _ in TRAINING_DATA]
        categories = [c for _, c, _ in TRAINING_DATA]
        severities = [s for _, _, s in TRAINING_DATA]
        self.model, self.severity_model = self._pipelines()
        self.model.fit(messages, categories)
        self.severity_model.fit(messages, severities)

    def _save(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"category": self.model, "severity": self.severity_model}, f)

    def _load(self) -> bool:
        if not os.path.isfile(MODEL_PATH):
            return False
        try:
            with open(MODEL_PATH, "rb") as f:
                payload = pickle.load(f)
            self.model = payload["category"]
            self.severity_model = payload["severity"]
            return True
        except Exception:
            return False

    def predict(self, message: str) -> Dict:
        if not message or not message.strip():
            return {
                "predicted_severity": "LOW",
                "predicted_category": "OTHER",
                "keywords": [],
                "explanation": "Empty message; defaulted to OTHER/LOW.",
                "confidence": 0.0,
                "category_confidence": 0.0,
                "severity_confidence": 0.0,
                "model_type": "TF-IDF + Multinomial Naive Bayes",
            }

        category_probs = self.model.predict_proba([message])[0]
        category_pred = self.model.predict([message])[0]
        category_confidence = float(max(category_probs) * 100)

        severity_probs = self.severity_model.predict_proba([message])[0]
        severity_pred = self.severity_model.predict([message])[0]
        severity_confidence = float(max(severity_probs) * 100)

        vectorizer = self.model.named_steps["tfidf"]
        features = vectorizer.transform([message])
        feature_names = vectorizer.get_feature_names_out()
        weights = features.toarray()[0]
        top_indices = weights.argsort()[-8:][::-1]
        keywords = [feature_names[i] for i in top_indices if weights[i] > 0]

        cat_classes = list(self.model.classes_)
        sev_classes = list(self.severity_model.classes_)
        overall = (category_confidence + severity_confidence) / 2

        explanation = (
            f"Trained Naive Bayes (TF-IDF) P({category_pred}|text)="
            f"{category_confidence:.1f}%, P({severity_pred}|text)={severity_confidence:.1f}%. "
            f"Top n-grams: {', '.join(keywords[:4]) or 'n/a'}."
        )

        return {
            "predicted_severity": severity_pred,
            "predicted_category": category_pred,
            "keywords": keywords,
            "class_probabilities": {
                "category": {c: round(float(p) * 100, 2) for c, p in zip(cat_classes, category_probs)},
                "severity": {c: round(float(p) * 100, 2) for c, p in zip(sev_classes, severity_probs)},
            },
            "explanation": explanation,
            "confidence": round(overall, 1),
            "category_confidence": round(category_confidence, 1),
            "severity_confidence": round(severity_confidence, 1),
            "model_type": "TF-IDF + Multinomial Naive Bayes",
            "training_examples": len(TRAINING_DATA),
        }


_classifier = None


def get_classifier():
    global _classifier
    if _classifier is None:
        _classifier = EmergencyTriageClassifier()
    return _classifier
