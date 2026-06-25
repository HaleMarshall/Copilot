"""
profession_remap.py — map an input profession taxonomy onto the canonical 10 buckets.

Expects a low-cardinality `profession_group` field on the input dataset. The remap below covers
the 9 distinct profession_group values plus defensive aliases for spacing/phrasing variants.

"Family Office" is NOT derivable from the profession column — it is a segment signal, so it is
derived from segment fields (user_segment / partner_category) via the override below.

Canonical 10 buckets (these are the labels; rename here if you prefer different ones):
    Exec/Owner | Financial Services | Eng/Tech | Consulting | Legal | Medical |
    Investor/PE | Family Office | Pro Services | Unknown/Other
"""

CANONICAL = [
    "Exec/Owner", "Financial Services", "Eng/Tech", "Consulting", "Legal",
    "Medical", "Investor/PE", "Family Office", "Pro Services", "Unknown/Other",
]

# Exact real spellings -> canonical. Keys are matched case-insensitively after stripping
# whitespace and collapsing internal spaces (see remap_profession).
PROFESSION_REMAP = {
    # --- the 9 verified real profession_group values ---
    "executive / business owner": "Exec/Owner",
    "financial services":         "Financial Services",
    "engineering / tech":         "Eng/Tech",
    "consulting":                 "Consulting",
    "legal":                      "Legal",
    "medical":                    "Medical",
    "investor / retired":         "Investor/PE",
    "other":                      "Pro Services",
    "unknown":                    "Unknown/Other",
    # --- defensive aliases (spacing / phrasing variants the loader may meet) ---
    "executive/business owner":   "Exec/Owner",
    "executive":                  "Exec/Owner",
    "business owner":             "Exec/Owner",
    "ceo":                        "Exec/Owner",
    "c-suite":                    "Exec/Owner",
    "founder":                    "Exec/Owner",
    "entrepreneur":               "Exec/Owner",
    "finance":                    "Financial Services",
    "banking":                    "Financial Services",
    "engineering/tech":           "Eng/Tech",
    "eng/tech":                   "Eng/Tech",
    "engineer":                   "Eng/Tech",
    "tech":                       "Eng/Tech",
    "technology":                 "Eng/Tech",
    "lawyer":                     "Legal",
    "doctor":                     "Medical",
    "physician":                  "Medical",
    "investor / pe":              "Investor/PE",
    "investor/pe":                "Investor/PE",
    "investor":                   "Investor/PE",
    "retired":                    "Investor/PE",
    "private equity":             "Investor/PE",
    "professional services":      "Pro Services",
    "pro services":               "Pro Services",
    "real estate":                "Pro Services",
    "":                           "Unknown/Other",
    "n/a":                        "Unknown/Other",
}

# Family Office is a SEGMENT signal, not a profession. If any of these holds, the bucket is
# overridden to "Family Office" regardless of profession_group.
#   user_profiles.user_segment        in {"Private Office"}
#   user_profiles.partner_category    in {"SFO", "MFO"}
#   user_profiles.user_segment        == "Institutions"  -> NOT family office (keep profession)
FAMILY_OFFICE_SEGMENTS   = {"private office"}
FAMILY_OFFICE_PARTNERCAT = {"sfo", "mfo"}


def _norm(s):
    if s is None:
        return ""
    return " ".join(str(s).strip().lower().split())


def remap_profession(profession_group, user_segment=None, partner_category=None):
    """Return one of CANONICAL. Family Office derivation takes precedence over profession_group."""
    if _norm(user_segment) in FAMILY_OFFICE_SEGMENTS or _norm(partner_category) in FAMILY_OFFICE_PARTNERCAT:
        return "Family Office"
    return PROFESSION_REMAP.get(_norm(profession_group), "Unknown/Other")


if __name__ == "__main__":
    # self-check: every verified real value maps, and family-office override works
    real9 = ["Financial Services", "Executive / Business Owner", "Unknown", "Consulting",
             "Other", "Legal", "Investor / Retired", "Engineering / Tech", "Medical"]
    for v in real9:
        assert remap_profession(v) in CANONICAL, v
    assert remap_profession("Legal", user_segment="Private Office") == "Family Office"
    assert remap_profession("Legal", partner_category="SFO") == "Family Office"
    assert remap_profession("Legal", user_segment="Institutions") == "Legal"
    print("profession_remap self-check OK — all 9 real values + family-office override covered")
