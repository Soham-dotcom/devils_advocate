# Test cases

Paste the **Case text** block into the form at http://localhost:3000/submit.

---

## 1. Maintenance — unmarried major daughter (verified)

**Title:** `Unmarried major daughter's claim for maintenance`
**Case type:** Family · **You represent:** Appellant / Petitioner

**Expected:** ~85-90s. One interpretive contradiction. Judgment leans respondent.
Similar cases led by *Abhilasha vs Parkash (2020)* — the controlling authority —
followed by *Rajnesh vs Neha (2020)*, the leading Indian maintenance judgment.

**Case text:**

```
The petitioner, an unmarried daughter aged 24 years, has filed the present application under Section 125 of the Code of Criminal Procedure seeking maintenance from her father, the respondent herein. The petitioner's mother had earlier filed an application in 2011 on behalf of herself and her three children, which was partly allowed by the Judicial Magistrate First Class by order dated 12.03.2013, granting maintenance to the petitioner only until she attained majority on 08.07.2019.

The petitioner contends that she remains unmarried and unemployed, having discontinued her education for want of funds, and that under Section 20(3) of the Hindu Adoptions and Maintenance Act, 1956, a father is obliged to maintain an unmarried daughter who is unable to maintain herself, irrespective of whether she has attained majority. Reliance is placed on the proposition that Section 125 Cr.P.C. and Section 20 of the 1956 Act operate in different fields and the former does not exclude the latter.

The respondent submits that the claim is not maintainable under Section 125 Cr.P.C. because clause (c) of sub-section (1) confines maintenance for a major child to cases where the child is unable to maintain itself by reason of physical or mental abnormality or injury. It is submitted that the petitioner suffers from no such disability, that she is an able-bodied graduate, and that the appropriate remedy, if any, lies in a civil suit under the 1956 Act and not in summary proceedings under the Code. The respondent further states that he is a retired government employee with limited pension income and has already discharged his obligations.

The Revisional Court dismissed the revision on 19.09.2021, holding that the petitioner had attained majority and did not fall within clause (c). The High Court, exercising jurisdiction under Section 482 Cr.P.C., declined to interfere by its order dated 04.02.2022. The question arising for consideration is whether an unmarried major daughter, not suffering from any physical or mental abnormality, is entitled to claim maintenance from her father in proceedings under Section 125 Cr.P.C.
```

---

## 2. Criminal — quashing of an FIR under Section 482 CrPC

**Title:** `Quashing of FIR in a commercial dispute`
**Case type:** Criminal · **You represent:** Appellant / Petitioner

**Expected:** Similar cases dominated by S.482 CrPC quashing matters. Good test of
whether the statute overlap surfaces `S.482 CrPC` and `S.420 IPC` as the match
reason.

**Case text:**

```
The appellants seek quashing of FIR No. 214 of 2021 registered at Police Station Sector 20, Noida, for offences punishable under Sections 420, 406 and 120B of the Indian Penal Code, invoking the inherent jurisdiction of this Court under Section 482 of the Code of Criminal Procedure. The complaint arises out of a written agreement dated 07.05.2019 for the supply of industrial machinery, under which the complainant paid an advance of Rs. 48,00,000.

The appellants contend that the dispute is purely civil in character. It is submitted that the agreement contained an arbitration clause, that the complainant has already invoked arbitration by notice dated 12.08.2021, and that the criminal complaint filed thereafter on 03.09.2021 is an attempt to apply pressure in a commercial negotiation. It is further contended that the FIR discloses no dishonest intention at the inception of the contract, which is the essential ingredient of cheating under Section 420 IPC, and that mere breach of contract does not attract criminal liability. The appellants rely on the settled proposition that the criminal process ought not to be used as a substitute for civil remedy.

The State and the complainant oppose the petition. It is submitted that the appellants induced the complainant to part with a substantial advance while concealing that the machinery in question had already been sold to a third party in March 2019, that is, prior to the agreement. It is contended that this concealment establishes dishonest intention from the outset, that the existence of a civil remedy does not bar prosecution where the ingredients of a cognizable offence are made out, and that the investigation is at a nascent stage where quashing would be premature.

The High Court declined to quash the FIR by its order dated 11.01.2022, holding that disputed questions of fact regarding the appellants' intention at the time of the agreement could not be resolved in proceedings under Section 482 Cr.P.C. The question arising for consideration is whether the allegations in the FIR, taken at face value, disclose the ingredients of an offence under Section 420 IPC, or whether the dispute is essentially civil such that continuation of the criminal proceedings would amount to abuse of process.
```

---

## 3. Negative check — non-legal prose

Paste any ordinary paragraph (a recipe, a diary entry). Repeat it a few times so it
clears the ~30-token minimum.

**Expected:** results still appear but every one is badged **Weak match**, with the
amber banner "All matches below are weak." Top score should be around 0.18 and no
shared provisions. This is the check that the system does not present confident
matches for input it has no business matching.

---

## 4. Empty-state check

Paste fewer than ~30 tokens (one short sentence).

**Expected:** the form's own validation blocks submission below 200 characters. To
reach the retrieval empty state directly, call the API:

```bash
curl -s -X POST http://127.0.0.1:8000/api/similar-cases -H "Content-Type: application/json" -d "{\"title\":\"probe\",\"case_text\":\"$(python -c 'print("A"*250)')\"}"
```

Expected: `"cases": []` with `reason: "input too short to match on"`.

---

## 5. Error-state check — corpus unavailable

Stop the backend, rename `backend/artifacts`, restart, and submit case 1.

**Expected:** the analysis still completes. Every agent panel renders normally and
only the Similar Cases panel shows "Similar case search is unavailable." This is
the containment guarantee from the spec — the retrieval layer cannot take down the
analysis. Rename the folder back afterwards.
