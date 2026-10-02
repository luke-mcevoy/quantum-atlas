# Counsel notes: photonic (resumed 2026-10-02)

File after resume: 45 sources, 5 orgs, 13 sites, 15 systems, 19 milestones
(6 peer-reviewed / 2 preprint / 11 company claim), 16 targets
(1 missed, 1 met, 1 revised, 13 open), 22 gaps.
`node scripts/validate.mjs photonic` passed with 0 errors.

Kept from 2026-10-01 (not re-fetched in this scratch folder; 76 quotes skipped by
`scratch/analyst-photonic/check.py`): PsiQuantum and Xanadu. 23 sources, 2 orgs,
8 sites, 5 systems, 7 milestones, 9 targets, 8 gaps. Analyst string left as
"Claude Opus 5.5 (research analyst agent)". `generated_at` is 2026-10-02.

Added: Quandela, ORCA Computing, USTC Jiuzhang. New quotes were sliced from
fetched HTML and checked (89 quotes, 0 failures). Photonic Inc. was not added
(spin-photon; belongs in `spin_topo_anneal`).

## Scrutinise

1. **12-qubit target marked missed.** `tgt:quandela-12-qubits-2023` uses the
   15 Nov 2022 line "aiming for 12 qubits available online by the end of 2023"
   and the 22 May 2025 Belenos release, which calls Belenos a 12-photonic-qubit
   machine and the end-of-2022 generation a 6-qubit machine. No Quandela
   document says the 2023 date was missed.
2. **Ascella count vs the 2022 cloud release.** Nature Photonics (published
   26 March 2024, DOI 10.1038/s41566-024-01403-4) says Ascella is "based on six
   photonic qubits". The MosaiQ page labels "Ascella – MosaiQ 6". The 15 Nov
   2022 release says "up to 5 photonic qubits". The cloud milestone is not
   linked to `sys:quandela-ascella`. Fidelities 99.6 ± 0.1%, 93.8 ± 0.6% and
   86 ± 1.2% are from the Nature abstract HTML. arXiv:2306.00874 was fetched;
   its abs-page title is "A general-purpose..." and it showed no journal-ref
   line, so it was not cited. Quandela's publications page dates the same DOI
   2023-06-01, which matches the preprint date, not the journal date.
3. **Canopus = 24.** `sys:quandela-canopus` uses the product-page label
   "Canopus – MosaiQ 24" next to "from 6 up to 24 qubits", plus the May 2025
   sentence that Canopus "will double the number of qubits once more" after the
   12-qubit Belenos. No sentence says "Canopus has 24 qubits". The Canopus page
   fetched 2026-10-02 still says it will be available on the cloud in 2026.
4. **Lucy status and place.** The 23 Oct 2025 release says Lucy, a 12-qubit
   machine, was delivered to CEA's TGCC and had "entered an acceptance phase"
   before an opening "at the beginning of 2026". Status is `online` because the
   machine was delivered; no 2026 opening notice was fetched. The release does
   not name the town, so there is no TGCC pin (not placed at Bruyères-le-Châtel).
5. **OVHcloud city.** The Oct 2023 release says MosaiQ went to "one of
   OVHcloud datacenters" and does not name the city. No site was drawn.
6. **Quandela roadmap wording.** Dateline in the body is "Paris, October 11,
   2024"; the page `datePublished` is 2024-10-17. Targets use 2024-10-11.
   "logical (error-free) qubits" in 2025 and "50 of them by 2028" do not name a
   code, so no `logical_qubits` field. The 2025 target is still `open`. The
   2030 "logical qubits" and "fault-tolerant" phrases are inside quotation
   marks in the statements. Contact-page `dateModified` is 2024-09-12; the
   street addresses were taken from the HTML fetched 2026-10-02.
7. **Palaiseau site joins two pages.** The June 2024 pilot-line release names
   IPVF in Paris-Saclay. The street "18 Bd Thomas Gobert, 91120 Palaiseau" is
   the contact page's "Cleanroom – IPVF" line. They are treated as one facility.
8. **ORCA NQCC testbed.** The PT-2 page (published 2024-10-25, still containing
   the sentence on 2026-10-02) says a PT-1 was delivered to the NQCC and that
   ORCA "will next deliver the NQCC Photonic Testbed system in Q1 2025". Target
   left `open`. The town is not named, so it is not pinned to Harwell.
9. **ORCA specs not assigned.** The PT Series page lists "128 qumodes" without
   saying which generation. No fetched ORCA page gives a photon count for PT-1
   or PT-2. The Japan release (16 June 2026) names a PT-2 and Toyota Tsusho but
   not the customer or the city. PT-3 is "the October 2026 launch" on the
   contact page (modified 2026-09-28). That month had not ended on 2026-10-02,
   so the target is open. A Tech Journal interview hosted on orca's site was
   not used.
10. **Jiuzhang peer-review copies.** Jiuzhang (Science, 18 Dec 2020, DOI
    10.1126/science.abe8770) is `peer_reviewed`. A direct GET of science.org
    returned HTTP 403; a request via
    `web.archive.org/web/2021id_/https://science.sciencemag.org/content/370/6523/1460`
    returned article HTML, which is the saved raw file. Jiuzhang 2.0
    (arXiv:2106.15534, 5 Jul 2021 version date) and Jiuzhang 3.0
    (arXiv:2304.12240 v3, 1 Sep 2023) are labelled `preprint`. Crossref records
    Phys. Rev. Lett. 127, 180502 (2021-10-25) and Phys. Rev. Lett. 131, 150601
    (2023-10-10). journals.aps.org and doi.org returned HTTP 403;
    harvest.aps.org returned HTTP 401. The 3.0 sample time is the abstract's
    "1.27 us", not a micro sign. "quantum computational advantage" appears only
    inside quotation marks in the claims.
11. **Jiuzhang status and pin.** All three are `online`. No document says an
    earlier device was retired or gives a street for the optical table. They
    are drawn at USTC's Hefei headquarters. Author affiliations name Hefei
    (230026 and, for 3.0, Hefei National Laboratory 230088) and also Shanghai.
    `co:ustc` is also defined in `superconducting_b.json`; build unions modalities.
12. **Coordinates** for Massy, Palaiseau and Eastbourne Terrace are placements
    for the documented addresses, not surveyed points. London DRIL is city
    precision only ("in London").

## Gaps added this pass

- 2023 12-qubit target judged missed without a company "missed" sentence.
- 2025 logical (error-free) qubit target: no result document, no code named.
- Canopus still described as upcoming in 2026; 24 is a product label.
- Lucy opening and TGCC town.
- OVHcloud datacenter city.
- NQCC testbed delivery and town.
- Which PT generation has 128 qumodes; no photon count for PT-1/PT-2.
- Japan customer site.
- No journal article fetched for the PT systems.
- PRL HTML refused for Jiuzhang 2.0 and 3.0.
- Jiuzhang operating status and facility address; Science fetch was 403 then a
  Wayback URL returned the article.
- QuiX Quantum and other photonic vendors not added.
- Photonic Inc. left for `spin_topo_anneal`.
- 2026-10-01 PsiQuantum and Xanadu raw files were not in this scratch folder.
