from typing import get_args

import pytest
from engine import priors
from engine.types import LIVE_METHODS, Method


def test_has_the_ten_dunlosky_techniques_once_each():
    ids = [t.id for t in priors.TECHNIQUES]
    assert len(ids) == 10 and len(set(ids)) == 10


def test_every_utility_tier_has_a_prior_mean():
    assert {t.utility for t in priors.TECHNIQUES} == set(priors.PRIOR_MEAN)


def test_each_contract_method_maps_to_at_most_one_technique():
    mapped = [m for t in priors.TECHNIQUES for m in t.methods]
    assert len(mapped) == len(set(mapped)) and set(mapped) <= set(get_args(Method))


def test_every_live_method_has_a_prior():
    assert set(LIVE_METHODS) <= set(priors.METHOD_TECHNIQUE)


def test_profiles_are_named_by_need_not_diagnosis():
    assert set(priors.PROFILES) == {"short_blocks", "reading_support", "dyslexia_ui"}


def test_reading_seconds_uses_second_language_speed():
    assert priors.reading_seconds(238) == pytest.approx(60 / 0.65)
