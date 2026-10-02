# Counsel notes: relationships (analyst, 2026-10-01)

File: `data/research/relationships.json`. Analyst `cursor-grok-relationships`.
25 sources, 29 orgs, 31 relationships, 11 gaps. Quotes checked against raw copies in `scratch/analyst-relationships/`. `node scripts/validate.mjs relationships` reported 0 errors.

Kinds: 13 government awards (DARPA QBI), 12 government contracts (UK testbeds, EuroHPC, DLR), 2 acquisitions, 2 investments, 1 subsidiary, 1 hosting. One relationship is `announced` (Australia–PsiQuantum, “will invest”); the rest are `completed`.

## Scrutinise

1. **Kind `acquisition` for the Honeywell–Cambridge Quantum deal.** The 30 Nov 2021 Honeywell and Quantinuum releases say “business combination”, “combined”, and “formed”, not “acquired”. There is no merger kind in the schema. The separate Honeywell→Quantinuum relationship is kind `subsidiary` and records the November 2021 “majority stake”, “approximately 54 percent”, and “nearly $300 million”. It is not a 2026 ownership figure.

2. **Honeywell after the Quantinuum IPO is unsourced here.** `www.sec.gov` returned HTTP 403 for Honeywell’s 10-Q for the quarter ended 2026-06-30 (accession `0000773840-26-000124`, seen in the `data.sec.gov` submissions index) and for IonQ’s Oxford Ionics 8-K (accession `0001193125-25-205489`). Wayback CDX returned no snapshot of the 10-Q and timed out on the other lookups. This file does not set `parent` on `co:quantinuum`. `trapped_ion.json` still sets `parent` to `co:honeywell`, and build fills a missing parent from the later file, so the published parent may still be Honeywell. The IonQ press release announces completion and does not state the share or cash consideration.

3. **This file is alphabetically before `superconducting_a.json`, `superconducting_b.json`, and `trapped_ion.json`, so its org scalar fields win at build.**
   - `co:google` headquarters becomes the Googleplex street on the Google locations page.
   - `co:aqt` becomes Technikerstrasse 1-3, 6020 Innsbruck, from the AQT contact page. `trapped_ion.json` has Technikerstrasse 17/1.
   - `co:oxford-ionics` is city “Oxford, UK” (DARPA Stage A). That replaces the OX5 1PF affiliation string in `trapped_ion.json`. An APS full-text fetch did not contain that postcode.
   - `co:riken` is country-level Japan from the IBM release (“a national research laboratory in Japan”). That keeps `superconducting_b.json`’s Wako city from becoming the headquarters field. The System Two relationship places the machine at R-CCS and at a 24 June 2025 ceremony in Kobe; it does not say Wako.
   - `co:quantinuum` uses the Broomfield street on the about page. That page lists the address and does not contain the word “headquarters”.
   - `co:ionq` uses the contact page’s “mailing address”.

4. **Orgs already defined in `neutral_atom.json` or `photonic.json` keep those files’ headquarters**, because those files sort first. This file’s Atom Computing record says Boulder, Colorado, as DARPA Stage B states; the Berkeley street in `neutral_atom.json` remains the published headquarters. Pasqal is country “France” here (“French startup PASQAL”); Palaiseau remains from `neutral_atom.json`. planqc is “Garching near Munich”; the street address remains from `neutral_atom.json`.

5. **UK testbed names.** The 5 February 2024 GOV.UK table says “QuEra UK Ltd” (Exeter) and “Rigetti UK” (London). Those rows are recorded against `co:quera` and `co:rigetti`. The £30 million figure is the programme total in the UKRI/NQCC sentence, not an amount on any one contract. Cold Quanta UK is named and was not mapped to `co:infleqtion`; the fetched pages do not say Infleqtion. Aegiq was not recorded.

6. **DARPA QBI.** Stage B (as of 6 Nov 2025) is one award each for Atom Computing, Diraq, IBM, IonQ, Photonic Inc., Quantinuum, Quantum Motion, QuEra, and Xanadu. Stage A (3 April 2025 page) is recorded only for Alice & Bob, Oxford Ionics, and Rigetti. Google is dated 9 Sept 2025 because the page’s editor’s note says Google Quantum AI was added that day. No per-company dollar amount is stated. “Selected” is the selection announcement; the page does not say a contract with each company has been signed. Nord Quantique, Silicon Quantum Computing, Atlantic Quantum, and Hewlett Packard Enterprise are named and were not given orgs. Microsoft and PsiQuantum are described as having entered the final phase of US2QC, without a selection date or amount, and were not recorded as a relationship. Modalities for Diraq, Quantum Motion, and Photonic Inc. are the atlas categories for DARPA’s qubit-approach phrases (“silicon CMOS spin qubits”, “MOS-based silicon spin qubits”, “optically-linked silicon spin qubits”).

7. **Australia–PsiQuantum.** Status is `announced` because the Prime Minister’s release says the governments “will invest”. Amount value `470000000` AUD expands “approximately $470 million”. The release writes “$”, not “AUD”. The same sentence says almost $1 billion in total and approximately $470 million from each of the Australian and Queensland governments. `industry.gov.au` timed out. The release’s “fault tolerant” wording is not in the description.

8. **Other amount expansions.** Honeywell `300000000` USD is “nearly $300 million”. planqc/DLR `29000000` EUR is “29 million EUR”. The planqc page date `2022-05-04` is the visible article timestamp; the body does not restate a calendar date.

9. **IBM as a Quantinuum shareholder** is one sentence (“Other shareholders include IBM”) with no percentage. HPCQS is a 30 May 2022 procurement win (“won by”), not a statement that the machines were already installed that day. EuroHPC’s Spain host is not in this file. The EuroHPC “Discover” page is typed `gov_report` and is the source for “located in Luxembourg”.

10. **Undated pages.** Quantinuum about, IonQ contact, AQT contact, Google locations, Quandela about/contact, and the EuroHPC discover page use access date 2026-10-01 where no publication date was on the page. The NQCC testbed page’s visible prose has no date; `document_date` 2024-02-05 is the JSON-LD `datePublished`, the same day as the GOV.UK release. The PsiQuantum Griffith page’s `document_date` 2026-05-26 is the HTML `datePublished` meta value.

## Biggest gaps

SEC filing text for the IonQ closing consideration and for Honeywell’s stake after the June 2026 IPO. A dated DARPA document for the Microsoft and PsiQuantum US2QC selections. DOE’s 9 September 2024 $65 million release does not name a canonical hardware company. No fetched government page for a China award, or for a national award in Canada, Korea, the Netherlands, or Denmark. No completed-acquisition document for Pasqal, Atom Computing, or PsiQuantum.
