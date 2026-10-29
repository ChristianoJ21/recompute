"""Reference fleet: the six devices of Penjelasan_ReCompute/recompute_demo.py.

TOY NUMBERS for tests and contract examples only. Never essay evidence,
never presented as measurements (PRD Section 8).
"""


def rng(low, high=None):
    return {"low": low, "high": low if high is None else high}


I_OLD = rng(8, 10)          # kgCO2e per compute-unit, current model
I_NEW = rng(3, 4)           # kgCO2e per compute-unit, replacement model
E_NEW = rng(900, 1100)      # kgCO2e to manufacture the replacement
T = rng(3)                  # years of service ahead

MEMORY_UPGRADE = {"component": "memory module", "I_upgraded": rng(5, 6), "E_component": rng(150, 200)}

WORKLOADS = [
    {"id": "WL-LAB", "name": "student lab (light inference)", "W": rng(20)},
]


def _inputs(W, i_old=I_OLD):
    return {"I_old": i_old, "I_new": I_NEW, "W": rng(W), "T": T, "E_new": E_NEW}


def _device(id_, workload, W, reliability_ok=True, upgrade_options=None, i_old=I_OLD):
    return {
        "id": id_,
        "model": "GPU server · 4× NVIDIA A100 (sample)",
        "device_type": "gpu_server",
        "install_date": "2022-03-01",
        "location": f"Jakarta, Indonesia · Hall A / {workload}",
        "components": [{"type": "gpu", "model": "NVIDIA A100"}, {"type": "memory", "model": "DDR4-3200 RDIMM"}],
        "reliability_ok": reliability_ok,
        "inputs": _inputs(W, i_old),
        "upgrade_options": upgrade_options or [],
        "sample_data": True,
    }


DEVICES = [
    _device("GPU-SRV-001", "large-model training", 100),
    _device("GPU-SRV-002", "light inference", 20),
    _device("GPU-SRV-003", "large-model training", 100, upgrade_options=[MEMORY_UPGRADE]),
    _device("GPU-SRV-004", "large-model training", 100, reliability_ok=False),
    _device("GPU-SRV-005", "large-model training", 100, i_old=None),
    _device("GPU-SRV-006", "mid-size training", 50),
]

# Expected outcome per device under PRD Section 5.2 (v1.1)
EXPECTED = {
    "GPU-SRV-001": "REDEPLOY",
    "GPU-SRV-002": "KEEP",
    "GPU-SRV-003": "UPGRADE",
    "GPU-SRV-004": "RECYCLE",
    "GPU-SRV-005": "INSUFFICIENT_DATA",
    "GPU-SRV-006": "UNCERTAIN",
}
