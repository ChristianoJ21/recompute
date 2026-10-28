"""ReCompute decision engine: PRD Section 5.2 (v1.1) = essay Section 4.3, Table 2.

Pure functions: no database, no I/O, no clock (the caller passes evaluated_at).
Replace only if (I_old - I_new) * W * T > E_new, run at both ends of every range.
"""
from datetime import timezone

OUTCOMES = ("KEEP", "UPGRADE", "REDEPLOY", "RECYCLE", "UNCERTAIN", "INSUFFICIENT_DATA")
REQUIRED_INPUTS = ("I_old", "I_new", "W", "T", "E_new")
UPGRADE_INPUTS = ("I_upgraded", "E_component")

# Which end of each range a scenario reads. pro_replace makes change look as good as possible.
PRO_REPLACE = {
    "I_old": "high", "I_new": "low", "I_upgraded": "low",
    "E_new": "low", "E_component": "low",
    "W": "high", "T": "high", "W_light": "high",
}
SCENARIOS = {
    "pro_keep": {key: ("low" if end == "high" else "high") for key, end in PRO_REPLACE.items()},
    "pro_replace": PRO_REPLACE,
}


def evaluate(device, workloads, evaluated_at):
    """Return the Section 5.2 result object for one device."""
    if not device.get("reliability_ok", False):
        return _result(device, evaluated_at, "RECYCLE",
                       "Failed the reliability check, so it goes to formal recycling with its passport.")

    inputs = device.get("inputs") or {}
    upgrades = device.get("upgrade_options") or []
    missing = _missing_fields(inputs, upgrades)
    if missing:
        return _result(device, evaluated_at, "INSUFFICIENT_DATA",
                       f"Missing validated inputs: {', '.join(missing)}. The engine does not estimate them.",
                       missing_fields=missing)

    _validate_ranges(inputs, upgrades, workloads)
    runs = {name: _run_scenario(inputs, upgrades, workloads, ends) for name, ends in SCENARIOS.items()}
    outcome, target, reason = _combine(runs, workloads)
    return _result(
        device, evaluated_at, outcome, reason,
        net_min=runs["pro_keep"][0]["net_kg"],
        net_max=runs["pro_replace"][0]["net_kg"],
        target=target,
        scenarios={name: summary for name, (summary, _) in runs.items()},
    )


def _missing_fields(inputs, upgrades):
    missing = [name for name in REQUIRED_INPUTS if inputs.get(name) is None]
    for i, option in enumerate(upgrades):
        missing += [f"upgrade_options[{i}].{name}" for name in UPGRADE_INPUTS if option.get(name) is None]
    return missing


def _validate_ranges(inputs, upgrades, workloads):
    named = [(name, inputs[name]) for name in REQUIRED_INPUTS]
    named += [(f"upgrade_options[{i}].{name}", option[name])
              for i, option in enumerate(upgrades) for name in UPGRADE_INPUTS]
    named += [(f"workload {wl['id']}.W", wl["W"]) for wl in workloads]
    for name, value in named:
        low, high = value.get("low"), value.get("high")
        if not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in (low, high)):
            raise ValueError(f"{name}: low and high must be numbers, got {value!r}")
        if low < 0 or low > high:
            raise ValueError(f"{name}: need 0 <= low <= high, got low={low}, high={high}")


def _run_scenario(inputs, upgrades, workloads, ends):
    """One pass of Table 2 at one end of the ranges -> (summary, candidates {target: rank})."""
    def at(key, value):
        return float(value[ends[key]])

    i_old, i_new = at("I_old", inputs["I_old"]), at("I_new", inputs["I_new"])
    w, t, e_new = at("W", inputs["W"]), at("T", inputs["T"]), at("E_new", inputs["E_new"])
    net = (i_old - i_new) * w * t - e_new

    def summary(outcome):
        return {"outcome": outcome, "net_kg": round(net, 2)}

    if net <= 0:
        return summary("KEEP"), {}

    net_up = {opt["component"]: (i_old - at("I_upgraded", opt["I_upgraded"])) * w * t
              - at("E_component", opt["E_component"]) for opt in upgrades}
    upgrade_targets = {component: value for component, value in net_up.items() if value >= net}
    if upgrade_targets:
        return summary("UPGRADE"), upgrade_targets

    redeploy_targets = {wl["id"]: wl["W"]["high"] for wl in workloads
                        if (i_old - i_new) * at("W_light", wl["W"]) * t <= e_new}
    if redeploy_targets:
        return summary("REDEPLOY"), redeploy_targets

    return summary("RECYCLE"), {}


def _combine(runs, workloads):
    """Same outcome at both ends -> that outcome; otherwise UNCERTAIN (essay safeguard 2)."""
    (keep, keep_targets), (replace, replace_targets) = runs["pro_keep"], runs["pro_replace"]
    if keep["outcome"] != replace["outcome"]:
        return "UNCERTAIN", None, (
            f"The recommendation changes within the input ranges ({keep['outcome']} at the pro-keep end, "
            f"{replace['outcome']} at the pro-replace end); a human decides.")

    outcome = keep["outcome"]
    if outcome == "KEEP":
        return outcome, None, ("Replacing does not pay back its manufacturing emissions "
                               "at either end of the input ranges.")
    if outcome == "RECYCLE":
        return outcome, None, ("Replacement is justified for the current workload, and no lighter "
                               "workload in the fleet keeps the device below the break-even.")

    common = [target for target in keep_targets if target in replace_targets]
    kind = "component" if outcome == "UPGRADE" else "workload"
    if not common:
        return "UNCERTAIN", None, (f"Both ends recommend {outcome}, but no single {kind} qualifies "
                                   "at both ends; a human decides.")

    target = max(common, key=lambda t: keep_targets[t])
    if outcome == "UPGRADE":
        return outcome, target, (f"Replacing the {target} saves at least as much as replacing the whole "
                                 "device, at both ends of the input ranges.")
    name = next(wl["name"] for wl in workloads if wl["id"] == target)
    return outcome, target, (f"Replacement is justified for the current workload, but on '{name}' keeping "
                             "the device stays below the break-even at both ends of the input ranges.")


def _result(device, evaluated_at, outcome, reason, *, net_min=None, net_max=None,
            missing_fields=None, target=None, scenarios=None):
    return {
        "device_id": device["id"],
        "outcome": outcome,
        "reason": reason,
        "net_min_kg": net_min,
        "net_max_kg": net_max,
        "missing_fields": missing_fields or [],
        "target": target,
        "scenarios": scenarios,
        "evaluated_at": evaluated_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sample_data": bool(device.get("sample_data", True)),
    }
