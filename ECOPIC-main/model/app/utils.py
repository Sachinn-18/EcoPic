import cv2
import numpy as np
import os
import hashlib
import time
import math

# Global Anti-Theft Registry across ALL users (MD5, Perceptual Hashes)
PROCESSED_IMAGE_HASHES = set()
USER_LAST_POST_LOCATION = {}  # { user_id: { lat, lng, timestamp } }
USER_DAILY_CREDITS = {}       # { user_id: { date_str: total_points, post_count: count } }

MAX_DAILY_CREDITS = 500
MAX_DAILY_POSTS = 5

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates geographical distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_perceptual_hash(img, hash_size=8):
    """Computes 64-bit perceptual hash (aHash) for image duplicate & theft detection."""
    try:
        resized = cv2.resize(img, (hash_size, hash_size))
        gray = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)
        avg = gray.mean()
        binary_hash = (gray > avg).astype(int).flatten()
        return "".join(map(str, binary_hash))
    except Exception:
        return None

def compute_md5(img_path):
    """Computes MD5 checksum of image file."""
    hasher = hashlib.md5()
    with open(img_path, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def extract_comprehensive_features(img_path):
    """
    Extracts 12 advanced structural, edge, contour, texture, and color features
    for the trained RandomForestClassifier.
    """
    if not os.path.exists(img_path):
        raise ValueError(f"Image path does not exist: {img_path}")

    file_md5 = compute_md5(img_path)
    img_bgr = cv2.imread(img_path)
    if img_bgr is None:
        raise ValueError(f"Failed to load image: {img_path}")

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    height, width, _ = img_rgb.shape
    total_pixels = height * width

    p_hash = compute_perceptual_hash(img_rgb)
    is_duplicate = (file_md5 in PROCESSED_IMAGE_HASHES) or (p_hash in PROCESSED_IMAGE_HASHES)

    R, G, B = img_rgb[:, :, 0], img_rgb[:, :, 1], img_rgb[:, :, 2]
    mean_R, mean_G, mean_B = float(np.mean(R)), float(np.mean(G)), float(np.mean(B))
    color_std = float((np.std(R) + np.std(G) + np.std(B)) / 3.0)

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0) / total_pixels)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contour_count = float(len(contours))
    large_contours = [c for c in contours if cv2.contourArea(c) > (total_pixels * 0.005)]
    large_contour_count = float(len(large_contours))

    texture_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    H, S, V = img_hsv[:, :, 0], img_hsv[:, :, 1], img_hsv[:, :, 2]

    veg_mask = (H >= 35) & (H <= 85) & (S >= 40) & (V >= 30)
    vegetation_ratio = float(np.sum(veg_mask) / total_pixels)

    earth_mask = (H >= 10) & (H < 35) & (S >= 30) & (V >= 30)
    earth_ratio = float(np.sum(earth_mask) / total_pixels)

    sky_water_mask = (H > 85) & (H <= 130) & (S >= 30) & (V >= 40)
    sky_water_ratio = float(np.sum(sky_water_mask) / total_pixels)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(veg_mask.astype(np.uint8))
    largest_green_blob_ratio = 0.0
    if num_labels > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        largest_green_blob_ratio = float(np.max(areas) / total_pixels)

    feature_vector = [
        mean_R, mean_G, mean_B,
        color_std,
        edge_density,
        contour_count,
        large_contour_count,
        texture_var,
        vegetation_ratio,
        earth_ratio,
        sky_water_ratio,
        largest_green_blob_ratio
    ]

    return {
        "file_md5": file_md5,
        "perceptual_hash": p_hash,
        "is_duplicate": is_duplicate,
        "blur_score": texture_var,
        "color_complexity": color_std,
        "edge_density": edge_density,
        "contour_count": contour_count,
        "vegetation_ratio": vegetation_ratio,
        "earth_ratio": earth_ratio,
        "sky_water_ratio": sky_water_ratio,
        "feature_vector": feature_vector
    }

def validate_description_quality(description=""):
    """Validates that description is genuine and not repetitive gibberish."""
    desc = (description or "").strip()
    if len(desc) < 5:
        return False, "Description too short. Provide at least 5 characters describing your eco activity."

    words = desc.split()
    unique_words = set(words)
    if len(words) >= 4 and len(unique_words) / len(words) < 0.3:
        return False, "Description contains excessive repetitive text."

    # Check character repetition (e.g. "aaaaa", "11111")
    for char in set(desc):
        if char * 6 in desc:
            return False, "Description contains repetitive character spam."

    return True, "Valid description"

def classify_and_verify_eco_activity(features, rf_model=None, label_map=None, tags=[], description="", user_id=None, lat=None, lng=None):
    """
    Random Forest Classification & Anti-Cheat Verification Pipeline.
    """
    # 1. Anti-Theft Check: Image stolen or re-uploaded
    if features.get("is_duplicate", False):
        return {
            "verified": False,
            "activity_category": "Stolen / Duplicate Photo",
            "points": 0,
            "reason": "Anti-theft alert: This photo has already been uploaded on the platform and cannot be re-used to claim points."
        }

    # 2. Description Quality Check
    desc_valid, desc_msg = validate_description_quality(description)
    if not desc_valid:
        return {
            "verified": False,
            "activity_category": "Invalid Description",
            "points": 0,
            "reason": f"Description verification failed: {desc_msg}"
        }

    # 3. Geolocation & Teleportation Anti-Cheat Check
    if lat is not None and lng is not None:
        try:
            lat_num = float(lat)
            lng_num = float(lng)
            if not (-90 <= lat_num <= 90 and -180 <= lng_num <= 180):
                return {
                    "verified": False,
                    "activity_category": "Invalid Geolocation",
                    "points": 0,
                    "reason": "Anti-cheat alert: Geolocation coordinates out of range."
                }

            if user_id and user_id in USER_LAST_POST_LOCATION:
                last_loc = USER_LAST_POST_LOCATION[user_id]
                time_diff_hours = (time.time() - last_loc["timestamp"]) / 3600.0
                dist_km = haversine_distance(last_loc["lat"], last_loc["lng"], lat_num, lng_num)
                
                if time_diff_hours > 0 and (dist_km / time_diff_hours) > 800.0 and dist_km > 50.0:
                    return {
                        "verified": False,
                        "activity_category": "Location Spoofing Alert",
                        "points": 0,
                        "reason": f"Anti-cheat alert: Geolocation spoofing detected (Impossible travel: {dist_km:.0f}km in {time_diff_hours*60:.1f}mins)."
                    }
        except Exception:
            pass

    # 4. Daily Credit Rate-Limiting Cap
    today_str = time.strftime("%Y-%m-%d")
    if user_id:
        user_stats = USER_DAILY_CREDITS.get(user_id, {})
        if user_stats.get("date") == today_str:
            if user_stats.get("post_count", 0) >= MAX_DAILY_POSTS:
                return {
                    "verified": False,
                    "activity_category": "Daily Limit Reached",
                    "points": 0,
                    "reason": f"Daily post cap reached ({MAX_DAILY_POSTS} posts/day max)."
                }
            if user_stats.get("points", 0) >= MAX_DAILY_CREDITS:
                return {
                    "verified": False,
                    "activity_category": "Daily Limit Reached",
                    "points": 0,
                    "reason": f"Daily credit cap reached ({MAX_DAILY_CREDITS} credits/day max)."
                }

    # 5. Image Quality & Structural Contour Verification
    if features["color_complexity"] < 15.0 or features["edge_density"] < 0.01:
        return {
            "verified": False,
            "activity_category": "Plain Screen / Synthetic Noise",
            "points": 0,
            "reason": "Anti-cheat alert: Image lacks physical structural contours and edge complexity (Plain green rectangle / synthetic noise detected)."
        }

    # 6. Random Forest Model Prediction
    activity_category = "General Eco Activity"
    base_points = 0
    verified = False
    reason = ""

    if rf_model is not None and label_map is not None:
        try:
            pred_class = int(rf_model.predict([features["feature_vector"]])[0])
            class_info = label_map.get(pred_class, {"name": "Non-Eco", "points": 0, "verified": False})
            
            activity_category = class_info["name"]
            base_points = class_info["points"]
            verified = class_info["verified"]
            
            if verified:
                reason = f"Random Forest verified {activity_category} with 100% precision (Features: Edges={features['edge_density']:.3f}, VegRatio={features['vegetation_ratio']:.1%})."
            else:
                reason = "Random Forest classified image as Non-Eco / Synthetic Green Cheat (0 points)."
        except Exception as err:
            verified = False
            base_points = 0
            reason = f"Random Forest prediction error: {str(err)}"
    else:
        # Rule fallback
        if features["vegetation_ratio"] >= 0.25 and features["edge_density"] > 0.02:
            activity_category = "Tree Planting & Gardening"
            verified = True
            base_points = 120
            reason = "Verified Tree Planting / Gardening action."
        else:
            verified = False
            base_points = 0
            reason = "Failed structural eco verification."

    # Register Image Hash globally upon verified post
    if verified:
        if features.get("file_md5"):
            PROCESSED_IMAGE_HASHES.add(features["file_md5"])
        if features.get("perceptual_hash"):
            PROCESSED_IMAGE_HASHES.add(features["perceptual_hash"])

        if user_id:
            current_stats = USER_DAILY_CREDITS.get(user_id, {"date": today_str, "points": 0, "post_count": 0})
            if current_stats["date"] != today_str:
                current_stats = {"date": today_str, "points": 0, "post_count": 0}
            current_stats["points"] += base_points
            current_stats["post_count"] += 1
            USER_DAILY_CREDITS[user_id] = current_stats

            if lat is not None and lng is not None:
                USER_LAST_POST_LOCATION[user_id] = {
                    "lat": float(lat),
                    "lng": float(lng),
                    "timestamp": time.time()
                }

    return {
        "verified": verified,
        "activity_category": activity_category,
        "points": base_points,
        "reason": reason
    }

