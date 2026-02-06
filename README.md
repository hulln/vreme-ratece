# vreme-ratece

Analiza zimskih podatkov za Rateče (1949–2025) + enostavna spletna predstavitev.

## Struktura
- `web/` statična stran (`index.html`, `styles.css`, `script.js`, `assets/`)
- `data/` vhodni/čisti podatki (`raw/`, `clean_ratece.csv`)
- `analysis/` izhodi analiz in napovedi
- `scripts/` priprava podatkov in statistične analize

## Hiter zagon
- Odpri `web/index.html` v brskalniku
- ali za lokalni strežnik:
```bash
python3 -m http.server
```
in nato odpri `http://localhost:8000/web/`
