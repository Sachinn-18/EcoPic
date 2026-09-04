from flask import Blueprint, request, jsonify
from app.utils import extract_comprehensive_features, classify_and_verify_eco_activity
from model.model_loader import model, label_map
import os
import json

bp = Blueprint('api', __name__)
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@bp.route('/upload', methods=['POST'])
def upload_image():

    # 1️⃣ Check if file exists in the request
    if "image" not in request.files:
        return jsonify({"error": "No file part 'image' in request"}), 400

    file = request.files["image"]

    # 2️⃣ Check if filename is valid
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # 3️⃣ Extract metadata (tags, description, user_id, lat, lng)
    tags = []
    description = request.form.get("description", "")
    user_id = request.form.get("user_id")
    lat = request.form.get("latitude")
    lng = request.form.get("longitude")

    tags_raw = request.form.get("tags", "")
    if tags_raw:
        try:
            tags = json.loads(tags_raw) if tags_raw.startswith("[") else [tags_raw]
        except Exception:
            tags = [tags_raw]

    # 4️⃣ Save file safely
    path = os.path.join(UPLOAD_DIR, file.filename)
    file.save(path)

    # 5️⃣ Extract 12 comprehensive structural, contour, texture & color features
    try:
        features = extract_comprehensive_features(path)
    except Exception as e:
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

    # 6️⃣ Execute Random Forest Classification & Anti-Cheat Verification Engine
    result = classify_and_verify_eco_activity(
        features,
        rf_model=model,
        label_map=label_map,
        tags=tags,
        description=description,
        user_id=user_id,
        lat=lat,
        lng=lng
    )

    verified = result["verified"]
    activity_category = result["activity_category"]
    points = result["points"]
    reason = result["reason"]

    # 7️⃣ Build response
    message = (
        f"Verified {activity_category}! You earned {points} carbon credits. ({reason})"
        if verified else
        f"Verification failed: {reason} (0 carbon credits earned)."
    )

    response = {
        "developer_data": {
            "verified": verified,
            "activity_category": activity_category,
            "anti_cheat_duplicate": features.get("is_duplicate", False),
            "blur_score": features["blur_score"],
            "color_complexity": features["color_complexity"],
            "vegetation_ratio": features["vegetation_ratio"],
            "earth_ratio": features["earth_ratio"],
            "sky_water_ratio": features["sky_water_ratio"],
            "natural_eco_score": features.get("natural_eco_score", features["vegetation_ratio"] + 0.5 * features["earth_ratio"])
        },
        "user_data": {
            "carbon_credit_points": points,
            "activity_category": activity_category,
            "verified": verified,
            "message": message
        }
    }

    return jsonify(response)
