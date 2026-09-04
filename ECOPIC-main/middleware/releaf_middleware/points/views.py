import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


FLASK_MODEL_URL = "http://127.0.0.1:5000/upload"   # Your working model endpoint


@api_view(["POST"])
def reward(request):
    """
    Receives post details from Node backend,
    sends image to Flask ML model,
    returns { points: X } back to Node.
    """

    try:
        post_id = request.data.get("post_id")
        user_id = request.data.get("user_id")
        tags = request.data.get("tags", [])
        description = request.data.get("description")
        image_url = request.data.get("image_url")

        if not image_url:
            return Response(
                {"error": "image_url is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # -----------------------------
        # 1️⃣ DOWNLOAD IMAGE FROM URL
        # -----------------------------
        try:
            print(f"[Middleware] Downloading image from: {image_url}")
            image_data = requests.get(image_url).content
            print("Downloading:", image_url)
            print("Image bytes length:", len(image_data))

        except Exception as e:
            print("[Middleware] Error downloading image:", e)
            return Response(
                {"points": 200, "fallback": True, "reason": "Image download failed"},
                status=200
            )

        # -----------------------------
        # 2️⃣ SEND IMAGE TO FLASK MODEL
        # -----------------------------
        try:
            print("[Middleware] Sending image to Flask ML model...")
            flask_response = requests.post(
                FLASK_MODEL_URL,
                files={"image": image_data},
                timeout=15
            ).json()

        except Exception as e:
            print("[Middleware] ML model failed:", e)
            # Fallback to safe default
            return Response(
                {"points": 200, "fallback": True, "reason": "ML model offline"},
                status=200
            )

        # -----------------------------
        # 3️⃣ PARSE FLASK MODEL RESPONSE
        # -----------------------------
        try:
            points = flask_response["user_data"]["carbon_credit_points"]
        except Exception:
            print("[Middleware] ML response invalid:", flask_response)
            points = 200   # fallback

        # -----------------------------
        # 4️⃣ RETURN TO NODE BACKEND
        # -----------------------------
        print(f"[Middleware] Awarded points: {points}")

        return Response({"points": points}, status=200)

    except Exception as e:
        print("[Middleware] Unexpected server error:", e)
        return Response(
            {"points": 200, "fallback": True, "reason": "Unexpected error"},
            status=200
        )
