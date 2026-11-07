import json
from pathlib import Path
from typing import get_args

from app.schemas import Method

PRIORS = json.loads((Path(__file__).parents[2] / "app/data/priors.json").read_text())


def test_has_the_ten_dunlosky_techniques_once_each():
    ids = [t["id"] for t in PRIORS["techniques"]]
    assert len(ids) == 10 and len(set(ids)) == 10


def test_every_utility_has_a_prior_mean():
    assert {t["utility"] for t in PRIORS["techniques"]} == set(PRIORS["prior_mean_by_utility"])


def test_mapped_methods_are_contract_methods():
    contract = set(get_args(Method))
    assert all(m in contract for t in PRIORS["techniques"] for m in t["methods"])


def test_each_selectable_method_maps_to_exactly_one_technique():
    mapped = [m for t in PRIORS["techniques"] for m in t["methods"]]
    assert len(mapped) == len(set(mapped))


def test_profiles_are_need_based_not_diagnoses():
    assert set(PRIORS["profiles"]) == {"short_blocks", "reading_support", "dyslexia_ui"}


def test_every_entry_has_a_source_field():
    entries = PRIORS["techniques"] + list(PRIORS["profiles"].values())
    assert all("source" in e for e in entries)
