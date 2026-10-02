# Counsel notes: spin_topo_anneal (analyst, 2026-10-02)

File: 24 sources, 7 orgs, 7 sites, 9 systems, 16 milestones (6 peer-reviewed / 1 preprint / 9 company claim), 3 targets (2 open, 1 missed), 13 gaps. Access and relationships are empty. Quotes were checked against converted copies in `scratch/analyst-spin_topo_anneal/text/`.

Scrutinise:

1. **Microsoft Majorana 1 vs the Nature paper.** `ms:microsoft-majorana1-2025` is a company claim only (Azure blog, 19 February 2025): Microsoft states it “placed eight topological qubits on a chip designed to house one million.” `ms:microsoft-parity-2025` cites only the Nature paper (DOI 10.1038/s41586-024-08445-2). That paper says the parity measurements “do not, by themselves, determine whether the low-energy states detected by interferometry are topological.” Do not let the blog sentence be read as the paper’s conclusion. No encoded-qubit count is recorded; the code is not named.

2. **Science DOI 10.1126/science.ado6285.** science.org returned 403. `src:science-ado6285` is typed `peer_reviewed` because the fetched arXiv abs page (2403.00910) states “Journal reference: Science 388, 199-204 (2025)” and Crossref gives 11 April 2025. The abstract quotes are from that arXiv page, not from Science HTML. The day 2025-04-11 is the Crossref date; the journal-reference line has no day. Reclassify to preprint if the journal text cannot be fetched.

3. **D-Wave listing.** The 26 February 2026 Form 10-K and the 20 May 2025 release say NYSE: QBTS. `data.sec.gov` submissions fetched 2026-10-02 list exchange Nasdaq. Ticker in the file follows the 10-K.

4. **D-Wave sites.** Advantage2 is not pinned to one site. The 10-K says systems were operational in Canada, the United States, and Germany, names Huntsville (Davidson Technologies) and Burnaby, and does not name the German facility. `site:d-wave-huntsville` operator is `co:d-wave`; Davidson Technologies is not a separate org. sec.gov/Archives returned 403; the 10-K text is a Wayback copy. Annealing qubit counts are the company’s “4,400+” / “4400+” and “5,000+” figures, not gate-model qubits. The gate-model / Quantum Circuits discussion in the 10-K is a gap, not a system.

5. **Advantage year.** `ms:d-wave-advantage-2020` dates the release 2020 because the 10-K says “a year later” after a 2019 paragraph. The numeral 2020 is not in the quote. The flux-noise PDF (submodality `superconducting_flux`) has no printed cover date; `document_date` 2022-06 is the “June 2022” prototype sentence in that PDF. The Advantage2 datasheet date 2026-03-02 is the PDF CreationDate.

6. **Bloomsbury vs the paper.** `sys:qm-bloomsbury` is named only in the 26 October 2022 press (Wayback; the live site returned 403). The Nature Electronics paper (DOI 10.1038/s41928-024-01304-y) reports 1,024 silicon quantum-dot devices and does not say Bloomsbury. Those 1,024 dots are not recorded as qubits. The NQCC full-stack system (15 September 2025) has no qubit count and the release does not say Harwell.

7. **Diraq logical-qubit targets** are open company roadmap language (27 August 2026, from the page’s `datePublished` meta; the visible line says “27 Aug”). The statements quote “logical qubits”; no code is named, and nothing is recorded as achieved. The eight-qubit SiMOS device is not placed at the UNSW lab. The lab’s `document_date` 2024-02-21 is likewise the meta `datePublished` (visible text: “21 Feb”).

8. **Intel 2024 target** is `missed` only because the June 2023 release expected a next chip “in 2024” and no later Intel quantum-chip release was fetched. Confirm it was not shipped under another name. The D1 fab is named and not located. newsroom.intel.com returned 403; quotes are from the IR copy.

9. **Quantum Brilliance.** Canberra as HQ is the dateline, which also lists Stuttgart. QB-QDK2.0 is the named machine in the 18 November 2024 purchase release; Fraunhofer IAF’s city is not in that release. The Pawsey sentence does not name a city, and the NV-centre wording used for that system’s submodality is from the later QB-QDK2.0 release, not from the Pawsey sentence itself. No qubit count was stated.

10. **Photonic Inc.** is in this file as the Microsoft spin-photon collaborator, not as a photonic-modality vendor. No product QPU is named. The entanglement milestone is a preprint (arXiv:2406.01704, PDF on photonic.com dated 3 June 2024 in the PDF header) plus Microsoft’s 30 May 2024 blog. No journal version was fetched.
