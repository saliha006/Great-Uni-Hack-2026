import pytest
from engine.priors import ReadingSupport
from engine.readability import flesch_kincaid_grade, needs_simplification, syllables

SIMPLE = "The cat sat on the mat. It was warm. The sun was out."
DENSE = ("Osmotic regulation necessitates the coordinated physiological integration of transmembrane "
         "transport mechanisms, intracellular signalling cascades, and compartmentalised electrochemical gradients.")


@pytest.mark.parametrize("word,expected", [("cat", 1), ("water", 2), ("make", 1), ("table", 2), ("nation", 2),
                                           ("osmosis", 3), ("free", 1)])
def test_syllable_heuristic(word, expected):
    assert syllables(word) == expected


def test_vowel_pairs_read_as_one_syllable_known_undercount():
    # Splitting "io" would fix "biology" but break every "-tion" word; the grade stays approximate.
    assert syllables("biology") == 3


def test_simple_text_scores_low_and_dense_text_high():
    assert flesch_kincaid_grade(SIMPLE) < 3
    assert flesch_kincaid_grade(DENSE) > 16


def test_no_words_has_no_grade():
    assert flesch_kincaid_grade("") is None and flesch_kincaid_grade("123 ... !!") is None


def test_text_without_end_punctuation_counts_as_one_sentence():
    assert flesch_kincaid_grade("the cat sat on the mat") == flesch_kincaid_grade("the cat sat on the mat.")


def test_simplification_uses_the_profile_threshold():
    assert needs_simplification(DENSE) and not needs_simplification(SIMPLE)
    assert not needs_simplification(DENSE, ReadingSupport(simplify_above_fk_grade=40))
    assert not needs_simplification("")
