"""One-time migration to the indexed Redis layout.

Old layout: polls found by scanning "*:meta"; one string key per voter
("{poll_id}:users:{email}") and per vote ("{poll_id}:votes:{uuid}").

New layout: a "polls" set indexes all poll ids; voters live in the
"{poll_id}:users" hash (email -> status) and vote counts in the
"{poll_id}:results" hash (option -> count).

Safe to re-run: legacy keys are deleted after being folded in, so a second
run finds nothing to migrate.

Usage: REDIS_CONNECTION_STRING=... uv run python migrate.py
"""

import os
from collections import Counter

import redis


def main():
    r = redis.from_url(os.environ["REDIS_CONNECTION_STRING"], decode_responses=True)

    poll_ids = sorted(k.split(":")[0] for k in r.scan_iter(match="*:meta", count=1000))
    print(f"found {len(poll_ids)} polls")

    for poll_id in poll_ids:
        r.sadd("polls", poll_id)

        user_keys = list(r.scan_iter(match=f"{poll_id}:users:*", count=1000))
        if user_keys:
            statuses = r.mget(user_keys)
            mapping = {
                key.split(":")[-1]: status
                for key, status in zip(user_keys, statuses)
                if status
            }
            if mapping:
                r.hset(f"{poll_id}:users", mapping=mapping)
            r.delete(*user_keys)

        vote_keys = list(r.scan_iter(match=f"{poll_id}:votes:*", count=1000))
        if vote_keys:
            counts = Counter(v for v in r.mget(vote_keys) if v)
            for option, count in counts.items():
                r.hincrby(f"{poll_id}:results", option, count)
            r.delete(*vote_keys)

        print(f"  {poll_id}: {len(user_keys)} user keys, {len(vote_keys)} vote keys")

    print("done")


if __name__ == "__main__":
    main()
