# RELEASE_NOTES_v4_2026-02-10

## Migliorie principali

1. **UI professionale**
   - Layout modernizzato (cards, tabelle sticky, blocchi clinici, controlli ordinati)
   - Migliore leggibilità su desktop e responsive su schermi piccoli

2. **Antibiogramma esteso**
   - Nuovi campi per riga antibiotico:
     - Classe antibiotica
     - Breakpoint di riferimento (EUCAST/CLSI)
   - Colonna interpretazione testuale derivata da S/I/R

3. **Catalogo antibiotici**
   - Inserimento e visualizzazione di:
     - Classe antibiotica
     - Breakpoint riferimento
   - Ricerca ampliata anche su classe

4. **Interpretazione diagnostica avanzata**
   - Ranking dei sensibili (S) con priorità stewardship + MIC
   - Prima scelta suggerita (`first_choice`)
   - Pattern di resistenza (`resistance_patterns`) evidenziati

5. **Referto PDF professionale**
   - Nuova impaginazione:
     - intestazione/logo
     - box anagrafico campione
     - tabella antibiogramma multi-colonna
     - sezione interpretazione diagnostica
     - metodica, note e avvertenze in footer
   - Gestione pagina e spaziatura per evitare sovrapposizioni

6. **Backend aggiornato**
   - Nuovi campi catalogo nel modello e nelle API:
     - `antibiotic_class`
     - `breakpoint_ref`
   - Migrazione automatica best-effort su DB esistente (ALTER TABLE)
   - Preset e seed allineati ai nuovi campi

7. **Modalità GitHub Pages**
   - DB locale browser aggiornato (`microlab_localdb_v2`)
   - Funzionamento completo senza backend, con struttura coerente alla versione server

---

## Compatibilità

- **Frontend GitHub Pages**: pronta all'uso
- **Backend locale FastAPI/SQLite**: compatibile, con aggiornamento schema automatico
