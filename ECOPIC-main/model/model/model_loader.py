import joblib
import os

# Load trained Random Forest model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "green_classifier.pkl")
model = joblib.load(MODEL_PATH)

# Map Random Forest class indices to eco-activity categories & points
label_map = {
    0: {"name": "Cheat / Non-Eco / Plain Green Noise", "points": 0, "verified": False},
    1: {"name": "Low Eco Activity", "points": 20, "verified": True},
    2: {"name": "Moderate Eco Activity", "points": 60, "verified": True},
    3: {"name": "High-Density Tree Planting & Eco Action", "points": 120, "verified": True}
}
