import json
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from functools import wraps

import redis
from dotenv import load_dotenv
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import BaseModel, ValidationError

load_dotenv('../.env')

app = Flask(__name__)
CORS(
    app,
    origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    supports_credentials=True,
)

r = redis.from_url(
    os.getenv("REDIS_CONNECTION_STRING", "redis://localhost:6379/0"),
    decode_responses=True
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class User(BaseModel):
    name: str
    email: str
    image_url: str | None = None


class PollUserStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    VOTED = "VOTED"


class PollUser(User):
    status: PollUserStatus


class ChoiceType(Enum):
    SINGLE = "SINGLE"
    MULTIPLE = "MULTIPLE"


class AccessType(Enum):
    PUBLIC = "PUBLIC"
    LINK_ONLY = "LINK_ONLY"
    INVITE_ONLY = "INVITE_ONLY"


class ColorScheme(Enum):
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


class PollStatus(Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class PollMeta(BaseModel):
    id: str
    created_at: str
    created_by_email: str

    title: str
    choice_type: ChoiceType
    access_type: AccessType
    color_scheme: ColorScheme
    status: PollStatus

    options: list[str]


class Poll(PollMeta):
    created_by: User
    users: list[PollUser] | None = None
    results: dict[str, int] | None = None


def require_jwt(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            abort(401, description="Missing Authorization header")

        # Extract token from "Bearer <token>" format
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            abort(401, description="Invalid Authorization header format")

        token = parts[1]
        try:
            user_data = id_token.verify_oauth2_token(
                token, requests.Request(), GOOGLE_CLIENT_ID
            )
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                image_url=user_data.get("picture"),
            )
            request.user = user
        except ValueError:
            abort(401, description="Invalid token")

        return f(*args, **kwargs)

    return decorated_function


with open("users.json", "r") as f:
    USERS = json.load(f)


def get_results(poll_id: str) -> dict[str, int]:
    results = {}

    for key in r.scan_iter(match=f"{poll_id}:votes:*", count=100):
        vote_value = r.get(key)
        if vote_value:
            results[vote_value] = results.get(vote_value, 0) + 1

    return results


def get_poll_users(poll_id: str) -> list[PollUser]:
    poll_users: list[PollUser] = []

    for key in r.scan_iter(match=f"{poll_id}:users:*", count=100):
        user_email = key.split(":")[-1]
        user_status = r.get(key)

        user_info = next(
            (user for user in USERS if user["email"] == user_email),
            {
                "name": user_email,
                "email": user_email,
                "image_url": None,
            },
        )
        poll_users.append(
            PollUser(
                name=user_info["name"],
                email=user_info["email"],
                image_url=user_info.get("image_url"),
                status=PollUserStatus(user_status),
            )
        )

    return poll_users


def get_poll(poll_id: str) -> Poll | None:
    poll_meta = r.hgetall(f"{poll_id}:meta")
    if not poll_meta:
        return None

    poll_meta["options"] = r.lrange(f"{poll_id}:options", 0, -1)

    poll_meta["created_by"] = next(
        (user for user in USERS if user["email"] == poll_meta["created_by_email"]), None
    )
    poll_meta["created_by"] = poll_meta["created_by"] or User(
        name=poll_meta["created_by_email"],
        email=poll_meta["created_by_email"],
        image_url=None,
    )

    poll_meta["users"] = get_poll_users(poll_id)

    if poll_meta["status"] == "CLOSED":
        poll_meta["results"] = get_results(poll_id)

    return Poll(id=poll_id, **poll_meta)


def can_see_poll(user: User, poll: Poll) -> bool:
    # if poll.access_type == AccessType.PUBLIC:
    #     return True
    # elif poll.access_type == AccessType.LINK_ONLY:
    #     return True
    # elif poll.access_type == AccessType.INVITE_ONLY:
    # return False

    if poll.created_by_email == user.email:
        return True

    return any(pu.email == user.email for pu in poll.users)


@app.route("/users", methods=["GET"])
@require_jwt
def get_users():
    return jsonify(USERS)


@app.route("/polls", methods=["GET"])
@require_jwt
def get_polls_view():
    polls: list[Poll] = []

    for key in r.scan_iter(match="*:meta", count=100):
        poll = get_poll(key.split(":")[0])
        if poll and can_see_poll(request.user, poll):
            polls.append(poll)

    # sort polls by created_at descending
    polls.sort(key=lambda p: p.created_at, reverse=True)

    return jsonify([p.model_dump(mode="json") for p in polls])


@app.route("/polls/<poll_id>", methods=["GET"])
@require_jwt
def get_poll_view(poll_id):
    poll = get_poll(poll_id)
    if not poll:
        abort(404, description="Poll not found")

    if not can_see_poll(request.user, poll):
        abort(403, description="You do not have access to this poll")

    return jsonify(poll.model_dump(mode="json"))


@app.route("/polls", methods=["POST"])
@require_jwt
def create_poll_view():
    data = request.get_json()

    try:
        poll_meta = PollMeta(
            id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            created_by_email=request.user.email,
            title=data["title"],
            options=data["options"],
            choice_type=ChoiceType(data["choice_type"]),
            access_type=AccessType(data.get("access_type") or AccessType.INVITE_ONLY),
            color_scheme=ColorScheme(data["color_scheme"]),
            status=PollStatus.OPEN,
        ).model_dump(mode="json")

    except ValidationError as error:
        return jsonify(error.errors()), 400

    poll_id = poll_meta.pop("id")
    options = poll_meta.pop("options")

    pipeline = r.pipeline()
    pipeline.hset(f"{poll_id}:meta", mapping=poll_meta)
    pipeline.rpush(f"{poll_id}:options", *options)
    # always add the creator as an eligible user
    pipeline.set(f"{poll_id}:users:{request.user.email}", PollUserStatus.ELIGIBLE.value)
    pipeline.execute()

    return jsonify(get_poll(poll_id).model_dump(mode="json")), 201


@app.route("/polls/<poll_id>", methods=["DELETE"])
@require_jwt
def delete_poll_view(poll_id):
    poll = get_poll(poll_id)
    if not poll:
        abort(404, description="Poll not found")

    if poll.created_by_email != request.user.email:
        abort(403, description="Only the poll creator can delete the poll")

    # Delete all related keys
    keys = list(r.scan_iter(match=f"{poll_id}:*", count=100))
    if keys:
        r.delete(*keys)

    return jsonify({"success": True})


@app.route("/polls/<poll_id>/users", methods=["POST"])
@require_jwt
def add_poll_users_view(poll_id):
    poll = get_poll(poll_id)
    if not poll:
        abort(404, description="Poll not found")

    if poll.created_by_email != request.user.email:
        abort(403, description="Only the poll creator can add users to the poll")

    data = request.get_json()
    users: list[User] = data.get("users", [])

    pipeline = r.pipeline()

    for user in users:
        pipeline.set(f"{poll_id}:users:{user['email']}", PollUserStatus.ELIGIBLE.value)

    pipeline.execute()

    return jsonify(get_poll(poll_id).model_dump(mode="json"))


@app.route("/polls/<poll_id>/vote", methods=["POST"])
@require_jwt
def vote_in_poll_view(poll_id):
    poll = get_poll(poll_id)
    if not poll:
        abort(404, description="Poll not found")

    data = request.get_json()
    values = data.get("values")

    if not values:
        abort(400, description="No vote values provided")

    invalid_values = set(values) - set(poll.options)
    if invalid_values:
        abort(400, description=f"Invalid vote options: {', '.join(invalid_values)}")

    pipeline = r.pipeline()

    for value in set(values):
        vote_id = str(uuid.uuid4())
        pipeline.set(f"{poll_id}:votes:{vote_id}", value)

    pipeline.set(f"{poll_id}:users:{request.user.email}", PollUserStatus.VOTED.value)

    pipeline.execute()

    return jsonify({"success": True})


@app.route("/polls/<poll_id>/close", methods=["POST"])
@require_jwt
def close_poll_view(poll_id):
    poll = get_poll(poll_id)
    if not poll:
        abort(404, description="Poll not found")

    if poll.created_by_email != request.user.email:
        abort(403, description="Only the poll creator can close the poll")

    r.hset(f"{poll_id}:meta", "status", PollStatus.CLOSED.value)

    return jsonify(get_poll(poll_id).model_dump(mode="json"))


if __name__ == "__main__":
    app.run(debug=True, port=8000)
