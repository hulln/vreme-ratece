# vreme-ratece

Analiza zimskih podatkov za Rateče (1949–2025) + enostavna spletna predstavitev.

## Spletni prikaz
- https://zime.oblachek.eu

## Struktura
- `web/` statična stran (`index.html`, `styles.css`, `script.js`, `assets/`)
- `data/` vhodni/čisti podatki (`raw/`, `clean_ratece.csv`)
- `analysis/` izhodi analiz in napovedi
- `scripts/` priprava podatkov in statistične analize

## Vir podatkov
- ARSO, arhiv samodejnih postaj (postaja Rateče): https://meteo.arso.gov.si/met/sl/app/webmet/#webmet==8Sdwx2bhR2cv0WZ0V2bvEGcw9ydlJWblR3LwVnaz9SYtVmYh9iclFGbt9SaulGdugXbsx3cs9mdl5WahxXYyNGapZXZ8tHZv1WYp5mOnMHbvZXZulWYnwCchJXYtVGdlJnOn0UQQdSf

## Hiter zagon
- Odpri `web/index.html` v brskalniku
- ali za lokalni strežnik:
```bash
python3 -m http.server
```
in nato odpri `http://localhost:8000/web/`
