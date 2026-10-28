"""Hash chain over a device's passport events (stretch S1, PRD Section 4).

Each event stores the hash of the device's previous event (prev_hash) and its own hash over its contents
plus prev_hash, so changing or removing any earlier event breaks every later link. This makes rewrites
*detectable*, not impossible: someone who rewrites the whole chain also changes head_hash, so the head
must be recorded outside the database (e.g. printed on the passport label) to catch that.
"""
import hashlib
import json

from db.models import iso

GENESIS_HASH = "0" * 64


def event_hash(device_id, created_at, kind, payload, actor, prev_hash):
    """SHA-256 of the event's canonical JSON. The row id is left out: it is not known until after insert."""
    canonical = json.dumps(
        {"device_id": device_id, "created_at": iso(created_at), "kind": kind,
         "payload": payload, "actor": actor, "prev_hash": prev_hash},
        sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def verify(device_id, events):
    """Check events (oldest first) link up and are unchanged; report the first event that fails."""
    expected_prev = GENESIS_HASH
    for event in events:
        if event.prev_hash != expected_prev:
            return report(device_id, len(events), expected_prev, event.id,
                          "link broken: an earlier event was removed or reordered")
        if event_hash(event.device_id, event.created_at, event.kind, event.payload,
                      event.actor, event.prev_hash) != event.hash:
            return report(device_id, len(events), expected_prev, event.id,
                          "contents changed after the event was written")
        expected_prev = event.hash
    return report(device_id, len(events), expected_prev, None, None)


def report(device_id, checked, head, bad_id, reason):
    return {"device_id": device_id, "valid": bad_id is None, "events_checked": checked,
            "head_hash": head, "first_bad_event_id": bad_id, "reason": reason}
