import copy
from datetime import datetime, timezone

import pytest

from engine.decision import OUTCOMES, evaluate
from reference_fleet import DEVICES, EXPECTED, MEMORY_UPGRADE, WORKLOADS, rng

NOW = datetime(2026, 11, 3, 10, 0, tzinfo=timezone.utc)
BY_ID = {d["id"]: d for d in DEVICES}


def run(device, workloads=WORKLOADS):
    return evaluate(device, workloads, NOW)


def with_changes(device_id, **changes):
    device = copy.deepcopy(BY_ID[device_id])
    device.update(changes)
    return device


@pytest.mark.parametrize("device_id, expected", EXPECTED.items())
def test_reference_device_gets_expected_outcome(device_id, expected):
    assert run(BY_ID[device_id])["outcome"] == expected


def test_reference_fleet_covers_all_six_outcomes():
    assert {run(d)["outcome"] for d in DEVICES} == set(OUTCOMES)


def test_keep_reports_net_range_from_both_scenarios():
    result = run(BY_ID["GPU-SRV-002"])

    # pro_keep: (8-4)*20*3 - 1100 ; pro_replace: (10-3)*20*3 - 900
    assert result["net_min_kg"] == -860.0
    assert result["net_max_kg"] == -480.0
    assert result["target"] is None


def test_redeploy_names_target_workload():
    result = run(BY_ID["GPU-SRV-001"])

    assert result["target"] == "WL-LAB"
    assert (result["net_min_kg"], result["net_max_kg"]) == (100.0, 1200.0)


def test_redeploy_prefers_heaviest_workload_that_qualifies_in_both_scenarios():
    workloads = WORKLOADS + [
        {"id": "WL-EDGE", "name": "edge inference", "W": rng(40)},    # 7*40*3 = 840 <= 900
        {"id": "WL-HEAVY", "name": "fine-tuning", "W": rng(60)},      # 7*60*3 = 1260 > 900
    ]

    result = run(BY_ID["GPU-SRV-001"], workloads)

    assert result["outcome"] == "REDEPLOY"
    assert result["target"] == "WL-EDGE"


def test_upgrade_names_component():
    result = run(BY_ID["GPU-SRV-003"])

    assert result["target"] == "memory module"
    assert result["scenarios"]["pro_keep"]["outcome"] == "UPGRADE"
    assert result["scenarios"]["pro_replace"]["outcome"] == "UPGRADE"


def test_upgrade_picks_option_with_highest_pro_keep_saving():
    better = {"component": "accelerator board", "I_upgraded": rng(4, 5), "E_component": rng(300, 350)}
    device = with_changes("GPU-SRV-003", upgrade_options=[MEMORY_UPGRADE, better])

    # pro_keep net_up: memory (8-6)*300-200 = 400 ; board (8-5)*300-350 = 550
    assert run(device)["target"] == "accelerator board"


def test_recycle_when_no_workload_keeps_device_below_break_even():
    result = run(BY_ID["GPU-SRV-001"], workloads=[])

    assert result["outcome"] == "RECYCLE"
    assert result["scenarios"]["pro_keep"]["outcome"] == "RECYCLE"


def test_unreliable_device_is_recycled_without_calculation():
    result = run(BY_ID["GPU-SRV-004"])

    assert result["net_min_kg"] is None
    assert result["scenarios"] is None
    assert "reliability" in result["reason"]


def test_uncertain_when_keep_and_replace_disagree():
    result = run(BY_ID["GPU-SRV-006"])

    assert result["scenarios"]["pro_keep"] == {"outcome": "KEEP", "net_kg": -500.0}
    assert result["scenarios"]["pro_replace"] == {"outcome": "REDEPLOY", "net_kg": 150.0}
    assert "KEEP" in result["reason"] and "REDEPLOY" in result["reason"]


def test_uncertain_when_upgrade_holds_only_at_one_end_of_the_range():
    shaky = {"component": "memory module", "I_upgraded": rng(5, 7.5), "E_component": rng(150, 200)}
    device = with_changes("GPU-SRV-003", upgrade_options=[shaky])

    # pro_keep: (8-7.5)*300-200 = -50 < net 100 -> REDEPLOY ; pro_replace: 1350 >= 1200 -> UPGRADE
    result = run(device)

    assert result["outcome"] == "UNCERTAIN"
    assert result["scenarios"]["pro_keep"]["outcome"] == "REDEPLOY"
    assert result["scenarios"]["pro_replace"]["outcome"] == "UPGRADE"


def test_insufficient_data_lists_every_missing_field():
    device = copy.deepcopy(BY_ID["GPU-SRV-001"])
    device["inputs"]["I_old"] = None
    del device["inputs"]["W"]
    device["upgrade_options"] = [{"component": "memory module", "I_upgraded": rng(5, 6), "E_component": None}]

    result = run(device)

    assert result["outcome"] == "INSUFFICIENT_DATA"
    assert result["missing_fields"] == ["I_old", "W", "upgrade_options[0].E_component"]
    assert result["net_min_kg"] is None and result["net_max_kg"] is None


def test_reliability_check_comes_before_missing_data():
    device = with_changes("GPU-SRV-005", reliability_ok=False)

    assert run(device)["outcome"] == "RECYCLE"


def test_range_with_low_above_high_is_rejected():
    device = copy.deepcopy(BY_ID["GPU-SRV-001"])
    device["inputs"]["E_new"] = {"low": 1100, "high": 900}

    with pytest.raises(ValueError, match="E_new"):
        run(device)


def test_output_shape_and_labels():
    result = run(BY_ID["GPU-SRV-001"])

    assert set(result) == {
        "device_id", "outcome", "reason", "net_min_kg", "net_max_kg",
        "missing_fields", "target", "scenarios", "evaluated_at", "sample_data",
    }
    assert result["device_id"] == "GPU-SRV-001"
    assert result["evaluated_at"] == "2026-11-03T10:00:00Z"
    assert result["sample_data"] is True
    assert result["reason"]


def test_engine_does_not_mutate_its_inputs():
    device, workloads = copy.deepcopy(BY_ID["GPU-SRV-003"]), copy.deepcopy(WORKLOADS)

    run(device, workloads)

    assert device == BY_ID["GPU-SRV-003"]
    assert workloads == WORKLOADS
