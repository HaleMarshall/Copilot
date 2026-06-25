"""
country_to_region.py — derive the 8-way region bucket from the country string.

Source columns (confirmed from the export):
    peer_investor_features.csv -> `country`                (65 distinct — FULL list verified below)
    user_profiles.xlsx        -> `user_residence_country_name`  (91 distinct — superset; audit when read)
Both are free-form country *names* (not ISO codes). Normalized helpers also exist:
`user_residence_supported_country` (25 vals incl. literal "RoW"), `user_residence_sub_region`,
`user_residence_region`.

NULLS/BLANKS: appear as empty/NaN (~0.6%). No "Unknown"/"Not provided" token. Explicit catch-all
is the literal "RoW". Blank/NaN and "RoW" -> bucket "RoW".

8-way buckets: DACH | UK | N-Europe | S-Europe | Middle East | US/CA | Asia | RoW

COVERAGE: every one of the 65 verified `country` values maps explicitly (proven by the
__main__ self-audit -> 0 unintended fall-throughs). Parenthetical regulatory suffixes are stripped
before matching (e.g. "United Arab Emirates (except DIFC and ADGM)" -> "united arab emirates").
Unknown spellings -> RoW (safe default).

JUDGEMENT CALLS (flip in one place if you disagree — all flagged ⚑ inline):
  ⚑ France            -> S-Europe   (your sub_region pairs it as "France & Benelux" = N-Europe)
  ⚑ Ireland           -> N-Europe   (could be UK)
  ⚑ Australia         -> Asia       (treated as APAC, matching sub_region "Asia")
  ⚑ Central/E./Balkan -> S-Europe   (PL,CZ,SK,HU,UA,SI,HR,RO,BG as one "continental-Europe" group;
                                      flip to RoW, or split into a 9th "E-Europe" bucket, if preferred)
  ⚑ Turkey            -> Middle East (could be RoW/Europe)
  Baltics (LT,LV,EE) -> N-Europe ; Crown deps (Jersey,Guernsey,IoM) -> UK ;
  offshore non-EU (Cayman,Bermuda,Mauritius,Panama,BVI) -> RoW.
"""

COUNTRY_TO_REGION = {
    # --- DACH ---
    "germany": "DACH", "switzerland": "DACH", "austria": "DACH", "liechtenstein": "DACH",
    # --- UK (incl. Crown dependencies) ---
    "united kingdom": "UK", "uk": "UK", "great britain": "UK", "england": "UK",
    "scotland": "UK", "wales": "UK", "northern ireland": "UK",
    "jersey": "UK", "guernsey": "UK", "isle of man": "UK",
    # --- N-Europe (Nordics + Benelux + Baltics + Ireland⚑) ---
    "netherlands": "N-Europe", "belgium": "N-Europe", "luxembourg": "N-Europe",
    "sweden": "N-Europe", "denmark": "N-Europe", "finland": "N-Europe", "norway": "N-Europe",
    "iceland": "N-Europe",
    "ireland": "N-Europe",                                  # ⚑ could be UK
    "lithuania": "N-Europe", "latvia": "N-Europe", "estonia": "N-Europe",   # Baltics
    # --- S-Europe (Mediterranean + continental-Europe catch ⚑) ---
    "france": "S-Europe",                                   # ⚑ vs N-Europe ("France & Benelux")
    "italy": "S-Europe", "spain": "S-Europe", "portugal": "S-Europe", "greece": "S-Europe",
    "cyprus": "S-Europe", "malta": "S-Europe", "monaco": "S-Europe", "andorra": "S-Europe",
    # ⚑ Central/Eastern/Balkan Europe grouped here as one decision:
    "czech republic": "S-Europe", "czechia": "S-Europe", "poland": "S-Europe",
    "slovakia": "S-Europe", "hungary": "S-Europe", "slovenia": "S-Europe",
    "croatia": "S-Europe", "romania": "S-Europe", "bulgaria": "S-Europe", "ukraine": "S-Europe",
    "belarus": "S-Europe", "bosnia and herzegovina": "S-Europe", "serbia": "S-Europe",
    # --- Middle East ---
    "israel": "Middle East", "united arab emirates": "Middle East", "uae": "Middle East",
    "saudi arabia": "Middle East", "qatar": "Middle East", "kuwait": "Middle East",
    "bahrain": "Middle East", "lebanon": "Middle East", "jordan": "Middle East", "oman": "Middle East",
    "turkey": "Middle East",                                # ⚑ could be RoW/Europe
    # --- US/CA ---
    "united states": "US/CA", "united states of america": "US/CA", "usa": "US/CA",
    "u.s.": "US/CA", "us": "US/CA", "america": "US/CA", "canada": "US/CA",
    # --- Asia (incl. APAC / Oceania per your "Asia" bucket) ---
    "singapore": "Asia", "india": "Asia", "hong kong": "Asia", "macao": "Asia", "macau": "Asia",
    "china": "Asia", "japan": "Asia", "taiwan": "Asia", "thailand": "Asia", "malaysia": "Asia",
    "indonesia": "Asia", "philippines": "Asia", "vietnam": "Asia", "sri lanka": "Asia",
    "bangladesh": "Asia", "pakistan": "Asia",
    "republic of korea": "Asia", "south korea": "Asia", "korea": "Asia",
    "australia": "Asia",                                    # ⚑ APAC (Oceania -> Asia)
    "new zealand": "Asia", "papua new guinea": "Asia",      # ⚑ Oceania -> Asia (consistent w/ AU/NZ)
    # --- RoW (explicit; everything else also defaults here) ---
    "row": "RoW", "rest of world": "RoW",
    "cayman islands": "RoW", "bermuda": "RoW", "british virgin islands": "RoW", "bvi": "RoW",
    "mauritius": "RoW", "panama": "RoW", "brazil": "RoW", "mexico": "RoW", "colombia": "RoW",
    "paraguay": "RoW", "peru": "RoW", "south africa": "RoW", "argentina": "RoW", "nigeria": "RoW",
    "egypt": "RoW", "russia": "RoW", "russian federation": "RoW",   # ⚑ value is "Russian Federation"
    "chile": "RoW", "dominican republic": "RoW", "chad": "RoW", "morocco": "RoW", "tunisia": "RoW",
    "the democratic republic of the congo": "RoW", "united republic of tanzania": "RoW",
    "namibia": "RoW", "azerbaijan": "RoW",                  # ⚑ Caucasus -> RoW (could be ME)
    "cote d'ivoire": "RoW", "cte d'ivoire": "RoW",          # mojibake variant (accent stripped)
}

DEFAULT_REGION = "RoW"


def _norm(s):
    if s is None:
        return ""
    return " ".join(str(s).strip().lower().split())


def country_to_region(country_name):
    """Map a raw country string -> one of the 8 buckets. NaN/blank/unknown -> RoW.
    Strips parenthetical regulatory suffixes so e.g. 'Qatar (excl. ...)' matches 'qatar'."""
    n = _norm(country_name)
    if n in COUNTRY_TO_REGION:
        return COUNTRY_TO_REGION[n]
    base = _norm(n.split("(", 1)[0])          # drop "(except DIFC and ADGM)" etc.
    return COUNTRY_TO_REGION.get(base, DEFAULT_REGION)


def audit_coverage(distinct_values):
    """Return values that fall through to RoW *by default* (i.e. not an explicit RoW/blank),
    so any new spelling needing a rule is surfaced rather than silently bucketed."""
    intended_row = {"", "row", "rest of world"}
    missed = []
    for v in distinct_values:
        n = _norm(v)
        if n in intended_row:
            continue
        base = _norm(n.split("(", 1)[0])
        if n not in COUNTRY_TO_REGION and base not in COUNTRY_TO_REGION:
            missed.append(v)
    return missed


# Full verified DISTINCT of peer_investor_features.country (65 values), for the self-audit.
_PEER_COUNTRY_DISTINCT = [
    "Germany","United Kingdom","United States","France","Switzerland","Netherlands","Singapore",
    "Hong Kong","Belgium","Italy","United Arab Emirates (except DIFC and ADGM)","Austria","Luxembourg",
    "Spain","Israel","","Czech Republic","Portugal","Sweden","Lithuania","Denmark","Greece","Australia",
    "Finland","Monaco","Ireland","Jersey","Poland","Liechtenstein","Slovakia","India","Canada","Hungary",
    "Romania","Slovenia","China","Guernsey","Cayman Islands","Kuwait","Colombia","Thailand","Saudi Arabia",
    "Malta","Bulgaria","Brazil","Qatar (excl. Qatar Financial Centre)","Paraguay","Latvia","Bermuda",
    "Norway","Cyprus","Croatia","South Africa","Japan","Taiwan","Bahrain","Panama","Mexico","Mauritius",
    "Peru","Malaysia","Turkey","Cte d'Ivoire","Macao","Republic of Korea","Ukraine",
]

# Full verified DISTINCT of user_profiles.user_residence_country_name (91 values, the 48k superset).
_PROFILE_COUNTRY_DISTINCT = [
    "United Kingdom","United States","Germany","France","Switzerland","Netherlands","Singapore",
    "Hong Kong","Belgium","Italy","Spain","United Arab Emirates (except DIFC and ADGM)","Luxembourg",
    "Israel","Austria","Greece","India","Sweden","","Portugal","Australia","Denmark","Poland","Ireland",
    "China","Czech Republic","Finland","Canada","Brazil","Malaysia","Lithuania","Republic of Korea",
    "Philippines","Mexico","Thailand","Norway","Qatar (excl. Qatar Financial Centre)","Taiwan","Argentina",
    "Monaco","Russian Federation","Cyprus","Indonesia","Jersey","Kuwait","Bulgaria","Hungary","Estonia",
    "Saudi Arabia","Bahrain","New Zealand","Malta","Guernsey","Slovenia","Slovakia","Liechtenstein",
    "Latvia","South Africa","Japan","Bermuda","Colombia","Nigeria","British Virgin Islands","Cayman Islands",
    "Panama","Turkey","Iceland","Romania","Paraguay","Jordan","Mauritius","Chad","Croatia","Egypt",
    "Dominican Republic","The Democratic Republic Of The Congo","Cte d'Ivoire","Peru","Belarus","Morocco",
    "Sri Lanka","Bosnia and Herzegovina","Chile","Tunisia","United Republic Of Tanzania","Bangladesh",
    "Namibia","Papua New Guinea","Azerbaijan","Macao","Ukraine","Lebanon",
]

if __name__ == "__main__":
    from collections import Counter
    for label, distinct in [("peer_investor_features.country", _PEER_COUNTRY_DISTINCT),
                            ("user_residence_country_name", _PROFILE_COUNTRY_DISTINCT)]:
        missed = audit_coverage(distinct)
        print(f"\n{label}: {len(distinct)} distinct values")
        print("  unintended RoW fall-throughs:", missed if missed else "NONE — full coverage")
        tally = Counter(country_to_region(v) for v in distinct)
        print("  " + " · ".join(f"{b} {tally.get(b,0)}" for b in
              ["DACH","UK","N-Europe","S-Europe","Middle East","US/CA","Asia","RoW"]))
