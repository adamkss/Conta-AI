export interface EvalCase {
  id: string;
  question: string;
  referenceAnswer: string;
}

export const GOLDEN_DATASET: EvalCase[] = [
  {
    id: "cass_2026",
    question: "Cum se va calcula cass la pfa uri in 2026? care e plafonul maxim?",
    referenceAnswer:
      "Conform pachetului fiscal adoptat recent (Legea 296/2023 sau noile măsuri 2025/2026), plafonul maxim pentru CASS la PFA în 2026 este de 72 de salarii minime brute, nu 60 și nu 90. Se aplică cota de 10%.",
  },
  {
    id: "capital_social_srl_2026",
    question:
      "care este valoarea minima a capitalului social din 2026?",
    referenceAnswer:
      "500 lei este valoarea minima a capitalului social pentru SRL incepand cu 2026, conform noilor reglementari.",
  },
  {
    id: "amenda_390",
    question: "AMENDA NEDEPUNERE IN TIMP 390",
    referenceAnswer:
      "Amenda pentru nedepunerea la termen a declarației 390 VIES: 1.000 — 5.000 lei.  Amenda pentru depunerea unei declarații 390 incomplete sau incorecte: 500 — 1.500 lei.  Nu se sancționează dacă se corectează declarația până la termenul legal de depunere a următoarei declarații (sau dacă eroarea se datorează unui fapt neimputabil contribuabilului). În procesul-verbal se menționează posibilitatea plății în 15 zile a jumătății din minimul amenzii.  termenul de 48 de ore a fost înlocuit cu 15 zile. Art. 28 alin. (1) din O.G. nr. 2/2001, modificat prin Legea nr. 203/2018 (intrată în vigoare la 24.08.2018), prevede posibilitatea achitării a jumătate din minimul amenzii în termen de cel mult 15 zile de la înmânarea sau comunicarea procesului‑verbal. ANAF a actualizat modelul procesului‑verbal prin OPANAF nr. 617/2025 (M. Of. nr. 460/19.05.2025), care reflectă această prevedere.",
  },
  {
    id: "cod_caen_conta",
    question: "ce coduri caen ar fi pretabile pentru o firma de contabilitate",
    referenceAnswer:
      "Principale (Revizia 3): 6920 — Activităţi de contabilitate şi audit financiar; consultanţă în domeniul fiscal. Coduri conexe, opţionale (dacă oferi servicii adiţionale):- 5829 — Activităţi de editare a altor produse software (dacă vinzi pachete software). - 6310 — Prelucrarea datelor, administrarea paginilor web şi activităţi conexe (outsourcing date / facturare electronică). - 7022 — Activităţi de consultanţă pentru afaceri şi management (dacă oferi consultanţă managerială în domeniul financiar). Recomandare succintă: înregistrează principal 6920 (Rev.3). Adaugă numai codurile secundare necesare efectiv serviciilor oferite, pentru a evita incompatibilităţi la înregistrare şi fiscalitate. Codul 6201 nu este ok, apartine tot de REV 2",
  },
  {
    id: "cod_caen_psiho",
    question:
      "ce cod caen este potrivit pentru cabinet de psihologie",
    referenceAnswer:
      "codul CAEN pentru cabinet de psihologie în CAEN Rev.3 este 8693 — „Activităţi ale psihologilor şi psihoterapeuţilor, cu excepţia medicilor”. Codul 8690 aparţine Rev.2 şi nu mai este valabil în CAEN Rev.3 (intrată în vigoare 01.01.2025); entităţile trebuie să-şi actualizeze obiectul de activitate în conformitate cu Ordinul INS nr. 377/2024.",
  },
];
