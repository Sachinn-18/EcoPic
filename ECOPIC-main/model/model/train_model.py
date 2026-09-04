import cv2
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

# Ensure dataset directory exists
DATASET_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dataset"))
os.makedirs(DATASET_PATH, exist_ok=True)

def extract_comprehensive_features(img):
    """
    Extracts 12 advanced structural, edge, contour, texture, and color features
    to distinguish real physical eco-activities from synthetic green cheats.
    """
    if img is None:
        return None

    height, width, _ = img.shape
    total_pixels = height * width

    # 1. Convert to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    R, G, B = img_rgb[:, :, 0], img_rgb[:, :, 1], img_rgb[:, :, 2]

    mean_R, mean_G, mean_B = np.mean(R), np.mean(G), np.mean(B)

    # 2. Color Variance & Complexity (Monochrome / Plain Screen Filter)
    color_std = float((np.std(R) + np.std(G) + np.std(B)) / 3.0)

    # 3. Structural Edge Detection (Canny Edge Density)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0) / total_pixels)

    # 4. Contour & Object Structure Analysis
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contour_count = float(len(contours))
    large_contours = [c for c in contours if cv2.contourArea(c) > (total_pixels * 0.005)]
    large_contour_count = float(len(large_contours))

    # 5. Texture Variation (Laplacian Variance)
    texture_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 6. HSV Color Space Analysis
    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    H, S, V = img_hsv[:, :, 0], img_hsv[:, :, 1], img_hsv[:, :, 2]

    # Green Vegetation Mask (Hue 35-85, Saturation >= 40, Value >= 30)
    veg_mask = (H >= 35) & (H <= 85) & (S >= 40) & (V >= 30)
    vegetation_ratio = float(np.sum(veg_mask) / total_pixels)

    # Earth / Soil / Bark Mask (Hue 10-35, Saturation >= 30, Value >= 30)
    earth_mask = (H >= 10) & (H < 35) & (S >= 30) & (V >= 30)
    earth_ratio = float(np.sum(earth_mask) / total_pixels)

    # Sky / Water Mask (Hue 85-130, Saturation >= 30)
    sky_water_mask = (H > 85) & (H <= 130) & (S >= 30) & (V >= 40)
    sky_water_ratio = float(np.sum(sky_water_mask) / total_pixels)

    # 7. Spatial Contiguity & Organic Leaf Shape Check
    # Real plants have cohesive green blobs; noise has scattered pixels
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(veg_mask.astype(np.uint8))
    largest_green_blob_ratio = 0.0
    if num_labels > 1:
        # Exclude background label 0
        areas = stats[1:, cv2.CC_STAT_AREA]
        largest_green_blob_ratio = float(np.max(areas) / total_pixels)

    return [
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

def generate_synthetic_training_dataset():
    """Generates synthetic dataset covering diverse real & cheat images for robust RF training."""
    X_data, y_data = [], []

    np.random.seed(42)

    # -------------------------------------------------------------------------
    # CLASS 0: CHEAT / FAKE / SYNTHETIC GREEN / PLAIN SCREEN / NON-ECO (Label 0)
    # -------------------------------------------------------------------------
    for _ in range(150):
        # 0.1 Plain solid green screen
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        img[:, :, 1] = np.random.randint(180, 255)
        img[:, :, 0] = np.random.randint(0, 30)
        img[:, :, 2] = np.random.randint(0, 30)
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(0)

    for _ in range(150):
        # 0.2 Uniform green noise (like green wallpaper / simple noise)
        img = np.zeros((300, 300, 3), dtype=np.uint8)
        img[:, :, 0] = np.random.randint(0, 40, (300, 300))
        img[:, :, 1] = np.random.randint(150, 240, (300, 300))
        img[:, :, 2] = np.random.randint(0, 40, (300, 300))
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(0)

    for _ in range(150):
        # 0.3 Non-eco indoor / random red / blue / grey / dark images
        img = np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)
        img[:, :, 1] = np.random.randint(0, 80, (300, 300)) # low green
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(0)

    # -------------------------------------------------------------------------
    # CLASS 1: LOW ECO ACTION (Indoor pot / Small green item) (Label 1)
    # -------------------------------------------------------------------------
    for _ in range(200):
        img = np.random.randint(50, 180, (300, 300, 3), dtype=np.uint8)
        # Small plant in center
        cv2.circle(img, (150, 150), 60, (20, 180, 30), -1)
        cv2.rectangle(img, (120, 200), (180, 280), (40, 80, 140), -1) # pot
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(1)

    # -------------------------------------------------------------------------
    # CLASS 2: MODERATE ECO ACTION (Gardening, Composting, Green Transit) (Label 2)
    # -------------------------------------------------------------------------
    for _ in range(200):
        img = np.random.randint(30, 150, (300, 300, 3), dtype=np.uint8)
        # Foliage top half
        img[0:180, :, 1] = np.random.randint(140, 230, (180, 300))
        # Soil bottom half
        img[180:300, :, 0] = np.random.randint(100, 160, (120, 300))
        img[180:300, :, 1] = np.random.randint(60, 100, (120, 300))
        img[180:300, :, 2] = np.random.randint(20, 50, (120, 300))
        # Add structural contours (leaves and stems)
        cv2.ellipse(img, (100, 100), (40, 70), 30, 0, 360, (10, 200, 40), -1)
        cv2.ellipse(img, (200, 120), (50, 80), -20, 0, 360, (15, 210, 35), -1)
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(2)

    # -------------------------------------------------------------------------
    # CLASS 3: HIGH ECO ACTION (Tree Planting, Sapling in Soil, Waste Cleanup) (Label 3)
    # -------------------------------------------------------------------------
    for _ in range(250):
        img = np.random.randint(20, 140, (300, 300, 3), dtype=np.uint8)
        # Dense vegetation
        img[0:200, :, 1] = np.random.randint(150, 245, (200, 300))
        img[0:200, :, 0] = np.random.randint(10, 60, (200, 300))
        img[0:200, :, 2] = np.random.randint(10, 60, (200, 300))
        # Soil base
        img[200:300, :, 0] = np.random.randint(120, 170, (100, 300))
        img[200:300, :, 1] = np.random.randint(70, 110, (100, 300))
        img[200:300, :, 2] = np.random.randint(20, 60, (100, 300))
        # Sapling stem and detailed leaves
        cv2.line(img, (150, 260), (150, 80), (30, 80, 120), 8)
        for y_pos in [100, 130, 160]:
            cv2.ellipse(img, (150, y_pos), (60, 25), 25, 0, 360, (20, 220, 40), -1)
            cv2.ellipse(img, (150, y_pos), (60, 25), -25, 0, 360, (15, 230, 35), -1)
        feat = extract_comprehensive_features(img)
        if feat: X_data.append(feat); y_data.append(3)

    return np.array(X_data), np.array(y_data)

def train_and_evaluate_random_forest():
    """Trains Random Forest model and outputs Precision, Recall, F1 Score & Accuracy."""
    print("Generating dataset for Random Forest model training...")
    X, y = generate_synthetic_training_dataset()

    print(f"Total Training Samples Collected: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    # Train Random Forest Classifier with 200 estimators
    print("\nTraining RandomForestClassifier (n_estimators=200, max_depth=12)...")
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=4,
        random_state=42
    )
    rf_model.fit(X_train, y_train)

    # Evaluate Model
    y_pred = rf_model.predict(X_test)
    train_acc = rf_model.score(X_train, y_train)
    test_acc = rf_model.score(X_test, y_test)

    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')

    print("\n" + "="*60)
    print("RANDOM FOREST MODEL PERFORMANCE METRICS")
    print("="*60)
    print(f"Training Accuracy: {train_acc * 100:.2f}%")
    print(f"Testing Accuracy:  {test_acc * 100:.2f}%")
    print(f"Weighted Precision: {precision * 100:.2f}%")
    print(f"Weighted Recall:    {recall * 100:.2f}%")
    print(f"Weighted F1 Score:  {f1 * 100:.2f}%")
    print("="*60)

    target_names = ["0: Cheat/Non-Eco", "1: Low Eco", "2: Moderate Eco", "3: High Eco"]
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=target_names))

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save trained Random Forest Model
    model_output_path = os.path.join(os.path.dirname(__file__), "green_classifier.pkl")
    joblib.dump(rf_model, model_output_path)
    print(f"\nModel successfully saved to: {model_output_path}")

if __name__ == "__main__":
    train_and_evaluate_random_forest()
