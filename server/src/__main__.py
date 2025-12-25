import base64
import json
import os
import random
import string
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from urllib.parse import parse_qsl

import redis

# Redis connection - lazy loaded
_redis_client = None


def get_redis():
    """Lazy-load Redis connection"""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            os.getenv("REDIS_CONNECTION_STRING", ""),
            decode_responses=True,
        )
    return _redis_client


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "")


# Data Models using dataclasses
@dataclass
class User:
    name: str
    email: str
    image_url: Optional[str] = None


class PollUserStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    VOTED = "VOTED"


@dataclass
class PollUser:
    name: str
    email: str
    status: str
    image_url: Optional[str] = None


class ChoiceType(str, Enum):
    SINGLE = "SINGLE"
    MULTIPLE = "MULTIPLE"


class ColorScheme(str, Enum):
    RED = "RED"
    ORANGE = "ORANGE"
    AMBER = "AMBER"
    YELLOW = "YELLOW"
    LIME = "LIME"
    GREEN = "GREEN"
    TEAL = "TEAL"
    CYAN = "CYAN"
    SKY = "SKY"
    BLUE = "BLUE"
    INDIGO = "INDIGO"
    VIOLET = "VIOLET"
    PURPLE = "PURPLE"
    FUCHSIA = "FUCHSIA"
    PINK = "PINK"
    ROSE = "ROSE"
    SLATE = "SLATE"
    GRAY = "GRAY"
    ZINC = "ZINC"
    NEUTRAL = "NEUTRAL"
    STONE = "STONE"


class PollStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


@dataclass
class PollMeta:
    secret: str
    created_at: str
    created_by_email: str
    title: str
    choice_type: str
    color_scheme: str
    status: str


@dataclass
class Poll:
    id: str
    secret: str
    created_at: str
    created_by_email: str
    title: str
    choice_type: str
    color_scheme: str
    status: str
    options: list
    created_by: dict
    users: Optional[list[PollUser]] = None
    results: Optional[dict] = None


# Load users from JSON
def load_users() -> list[User]:
    users_file = os.path.join(os.path.dirname(__file__), "users.json")
    try:
        with open(users_file, "r") as f:
            return [User(**u) for u in json.load(f)]
    except FileNotFoundError:
        return []


USERS = load_users()


def verify_google_token(token: str) -> Optional[User]:
    """Decode Google JWT token locally"""
    try:
        # JWT format: header.payload.signature
        parts = token.split(".")
        if len(parts) != 3:
            return None

        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed for base64 decoding
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding

        decoded = base64.urlsafe_b64decode(payload)
        user_data = json.loads(decoded)

        # Basic validation - check if required fields exist
        if "email" in user_data:
            return User(
                name=user_data.get("name", user_data.get("email", "")),
                email=user_data.get("email", ""),
                image_url=user_data.get("picture"),
            )

    except Exception:
        pass
    return None


def get_results(poll_id: str) -> dict:
    r = get_redis()
    results = {}

    for key in r.scan_iter(match=f"{poll_id}:votes:*", count=100):
        vote_value = r.get(key)
        if vote_value:
            results[vote_value] = results.get(vote_value, 0) + 1

    return results


def get_poll_users(poll_id: str) -> list[PollUser]:
    r = get_redis()
    poll_users = []
    for key in r.scan_iter(match=f"{poll_id}:users:*", count=100):
        user_email = key.split(":")[-1]
        user_status = r.get(key)

        user_info = next(
            (user for user in USERS if user.email == user_email),
            User(
                name=user_email,
                email=user_email,
                image_url=None,
            ),
        )
        poll_users.append(
            PollUser(
                name=user_info.name,
                email=user_info.email,
                image_url=user_info.image_url,
                status=user_status,
            )
        )

    return poll_users


def get_poll(poll_id: str) -> Optional[Poll]:
    r = get_redis()
    poll_meta = r.hgetall(f"{poll_id}:meta")
    if not poll_meta:
        return None

    poll_meta["id"] = poll_id
    poll_meta["options"] = r.lrange(f"{poll_id}:options", 0, -1)

    created_by = next(
        (user for user in USERS if user.email == poll_meta["created_by_email"]), None
    )
    poll_meta["created_by"] = created_by or {
        "name": poll_meta["created_by_email"],
        "email": poll_meta["created_by_email"],
        "image_url": None,
    }

    poll_meta["users"] = get_poll_users(poll_id)

    poll_age_days = (
        datetime.now(timezone.utc)
        - datetime.fromisoformat(poll_meta["created_at"].replace("Z", "+00:00"))
    ).days

    if poll_age_days >= 7:
        # close polls older than 7 days automatically
        poll_meta["status"] = PollStatus.CLOSED.value
        r.hset(f"{poll_id}:meta", "status", PollStatus.CLOSED.value)

    elif poll_age_days >= 30:
        # delete polls older than 30 days automatically
        keys = list(r.scan_iter(match=f"{poll_id}:*", count=100))
        if keys:
            r.delete(*keys)
        return None

    if poll_meta["status"] == PollStatus.CLOSED.value:
        poll_meta["results"] = get_results(poll_id)

    # remove legacy keys
    if "access_type" in poll_meta:
        poll_meta.pop("access_type", None)
        r.hdel(f"{poll_id}:meta", "access_type")

    # and make sure new keys are properly set
    if "secret" not in poll_meta:
        poll_meta["secret"] = generate_poll_secret()
        r.hset(f"{poll_id}:meta", "secret", poll_meta["secret"])

    return Poll(**poll_meta)


def can_see_poll(user: User, poll: Poll, secret: str = None) -> bool:
    if poll.secret == secret:
        return True

    if poll.created_by_email == user.email:
        return True

    return any(pu.email == user.email for pu in poll.users)


def get_user_from_auth(headers: dict) -> Optional[User]:
    """Extract and verify user from Authorization header"""
    auth_header = headers.get("authorization") or headers.get("Authorization")
    if not auth_header:
        return None

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    return verify_google_token(token)


def cors_headers():
    """Return CORS headers for responses"""
    return {
        "Access-Control-Allow-Origin": FRONTEND_URL,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
    }


def response(status_code: int, body: dict):
    """Helper to create response object"""
    return {
        "statusCode": status_code,
        "headers": cors_headers(),
        "body": json.dumps(body),
    }


def error_response(message: str, status_code: int = 400):
    """Helper to create error response"""
    return response(status_code, {"error": message})


# Route handlers
def handle_get_users(user: User):
    return response(200, [asdict(u) for u in USERS])


def handle_get_polls(user: User):
    r = get_redis()
    polls = []
    for key in r.scan_iter(match="*:meta", count=100):
        poll = get_poll(key.split(":")[0])
        if poll and can_see_poll(user, poll):
            # Hide secret from non-creators
            if poll.created_by_email != user.email:
                poll.secret = ""
            polls.append(poll)

    polls.sort(key=lambda p: p.created_at, reverse=True)
    return response(200, [asdict(p) for p in polls])


def handle_get_poll(user: User, poll_id: str, secret: str = None):
    poll = get_poll(poll_id)
    if not poll:
        return error_response("Poll not found", 404)

    print(secret)

    if not can_see_poll(user, poll, secret):
        return error_response(f"You do not have access to this poll", 403)

    # Hide secret from non-creators
    if poll.created_by_email != user.email:
        poll.secret = ""

    return response(200, asdict(poll))


def generate_poll_secret():
    letters = string.ascii_lowercase
    part1 = "".join(random.choices(letters, k=3))
    part2 = "".join(random.choices(letters, k=4))
    part3 = "".join(random.choices(letters, k=3))
    return f"{part1}-{part2}-{part3}"


def handle_create_poll(user: User, data: dict):
    try:
        poll_meta = PollMeta(
            secret=generate_poll_secret(),
            created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            created_by_email=user.email,
            title=data["title"],
            choice_type=data["choice_type"],
            color_scheme=data["color_scheme"],
            status="OPEN",
        )
    except KeyError as e:
        return error_response(f"Missing required field: {str(e)}", 400)

    poll_id = str(uuid.uuid4())
    options = data["options"]

    r = get_redis()
    pipeline = r.pipeline()
    pipeline.hset(f"{poll_id}:meta", mapping=asdict(poll_meta))
    pipeline.rpush(f"{poll_id}:options", *options)
    pipeline.set(f"{poll_id}:users:{user.email}", PollUserStatus.ELIGIBLE.value)
    pipeline.execute()

    return response(201, asdict(get_poll(poll_id)))


def handle_delete_poll(user: User, poll_id: str):
    poll = get_poll(poll_id)
    if not poll:
        return error_response("Poll not found", 404)

    if poll.created_by_email != user.email:
        return error_response("Only the poll creator can delete the poll", 403)

    r = get_redis()
    keys = list(r.scan_iter(match=f"{poll_id}:*", count=100))
    if keys:
        r.delete(*keys)

    return response(200, {"success": True})


def handle_add_poll_users(user: User, poll_id: str, data: dict):
    poll = get_poll(poll_id)
    if not poll:
        return error_response("Poll not found", 404)

    if poll.created_by_email != user.email:
        return error_response("Only the poll creator can add users to the poll", 403)

    users = data.get("users", [])
    r = get_redis()
    pipeline = r.pipeline()
    for u in users:
        pipeline.set(f"{poll_id}:users:{u['email']}", PollUserStatus.ELIGIBLE.value)
    pipeline.execute()

    return response(200, asdict(get_poll(poll_id)))


def handle_vote_in_poll(user: User, poll_id: str, data: dict):
    poll = get_poll(poll_id)
    if not poll:
        return error_response("Poll not found", 404)

    secret = data.get("secret")
    user_status_key = f"{poll_id}:users:{user.email}"
    r = get_redis()
    user_status = r.get(user_status_key)
    if user_status != PollUserStatus.ELIGIBLE.value and poll.secret != secret:
        return error_response("You are not eligible to vote in this poll", 403)

    if poll.status == PollStatus.CLOSED.value:
        return error_response("Poll is closed", 400)

    values = data.get("values")
    if not values:
        return error_response("No vote values provided", 400)

    invalid_values = set(values) - set(poll.options)
    if invalid_values:
        return error_response(f"Invalid vote options: {', '.join(invalid_values)}", 400)

    r = get_redis()
    pipeline = r.pipeline()
    for value in set(values):
        vote_id = str(uuid.uuid4())
        pipeline.set(f"{poll_id}:votes:{vote_id}", value)

    pipeline.set(f"{poll_id}:users:{user.email}", PollUserStatus.VOTED.value)
    pipeline.execute()

    return response(200, {"success": True})


def handle_close_poll(user: User, poll_id: str):
    poll = get_poll(poll_id)
    if not poll:
        return error_response("Poll not found", 404)

    if poll.created_by_email != user.email:
        return error_response("Only the poll creator can close the poll", 403)

    r = get_redis()
    r.hset(f"{poll_id}:meta", "status", PollStatus.CLOSED.value)
    return response(200, asdict(get_poll(poll_id)))


# Main handler for DigitalOcean Functions
def main(event, context):
    """
    DigitalOcean Functions handler
    """
    http = event.get("http", {})
    method = http.get("method", "GET")

    # Handle OPTIONS for CORS preflight FIRST (before any other processing)
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    path = http.get("path", "/")
    headers = http.get("headers", {})
    body = http.get("body", "")
    # parse query string
    query_string = http.get("queryString", "")
    query = dict(parse_qsl(query_string))

    # Serve index.html for non-API routes
    if "/api" not in path:
        return {
            "statusCode": 404,
            "headers": {"Content-Type": "text/plain"},
            "body": "Not Found",
        }

    # Strip /api prefix from path for routing
    path = path.replace("/api", "", 1)

    # Parse body if present
    data = {}
    if body:
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return error_response("Invalid JSON in request body", 400)

    # Verify authentication
    user = get_user_from_auth(headers)
    if not user:
        return error_response("Unauthorized", 401)

    # Route the request
    path_parts = [p for p in path.split("/") if p]

    secret = query.get("secret")

    # GET /users
    if method == "GET" and path == "/users":
        return handle_get_users(user)

    # GET /polls
    elif method == "GET" and path == "/polls":
        return handle_get_polls(user)

    # GET /polls/{poll_id}
    elif method == "GET" and len(path_parts) == 2 and path_parts[0] == "polls":
        return handle_get_poll(user, path_parts[1], secret)

    # POST /polls
    elif method == "POST" and path == "/polls":
        return handle_create_poll(user, data)

    # DELETE /polls/{poll_id}
    elif method == "DELETE" and len(path_parts) == 2 and path_parts[0] == "polls":
        return handle_delete_poll(user, path_parts[1])

    # POST /polls/{poll_id}/users
    elif (
        method == "POST"
        and len(path_parts) == 3
        and path_parts[0] == "polls"
        and path_parts[2] == "users"
    ):
        return handle_add_poll_users(user, path_parts[1], data)

    # POST /polls/{poll_id}/vote
    elif (
        method == "POST"
        and len(path_parts) == 3
        and path_parts[0] == "polls"
        and path_parts[2] == "vote"
    ):
        return handle_vote_in_poll(user, path_parts[1], data)

    # POST /polls/{poll_id}/close
    elif (
        method == "POST"
        and len(path_parts) == 3
        and path_parts[0] == "polls"
        and path_parts[2] == "close"
    ):
        return handle_close_poll(user, path_parts[1])

    else:
        return error_response("Not found", 404)


# Local development server
if __name__ == "__main__":
    import time
    from flask import Flask, request

    app = Flask(__name__)

    @app.route("/", defaults={"path": ""}, methods=["GET", "POST", "DELETE", "OPTIONS"])
    @app.route("/<path:path>", methods=["GET", "POST", "DELETE", "OPTIONS"])
    def handle_request(path):
        # Add delay for OPTIONS requests (debugging)
        if request.method == "OPTIONS":
            # simulate serverless cold start delay
            time.sleep(0.7)

        # Convert Flask request to DigitalOcean Functions event format
        event = {
            "http": {
                "method": request.method,
                "path": f"/{path}" if path else "/",
                "headers": dict(request.headers),
                "body": request.get_data(as_text=True),
                "queryString": request.query_string.decode("utf-8"),
            },
        }

        # Call the main handler
        result = main(event, {})

        # Convert response back to Flask format
        response = app.make_response(result.get("body", ""))
        response.status_code = result.get("statusCode", 200)
        for key, value in result.get("headers", {}).items():
            response.headers[key] = value

        return response

    app.run(debug=True, port=8000)
