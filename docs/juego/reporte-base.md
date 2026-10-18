# Reporte de la base de pilotos del juego

Generado el 2026-10-18 por `npm run sync:juego` (scripts/build-juego-pilotos.mjs). No editar a mano: se pisa en cada corrida.

## Totales

- Personas consultadas en Wikidata (argentinas, con ocupación de piloto o motociclista): **466**
- Con artículo único en es.wikipedia: **387**
- Incluidas en `pilotos.json`: **285**
- Excluidas: **181**

Excluidas por motivo:

| Motivo | Cantidad |
|---|---|
| sin artículo en es.wikipedia | 79 |
| sin categorías de la lista | 47 |
| Wikidata sin lugar de nacimiento | 14 |
| provincia de Wikipedia sin resolver | 8 |
| año de nacimiento distinto | 7 |
| provincia distinta | 7 |
| corre2026 indeterminable | 6 |
| corre2026 ambiguo | 3 |
| Wikipedia sin año de nacimiento legible | 3 |
| Wikipedia con años de nacimiento distintos | 2 |
| Wikidata sin fecha de nacimiento | 2 |
| fecha de nacimiento de Wikidata con precisión menor a un año | 1 |
| Wikidata con más de un lugar de nacimiento | 1 |
| provincia de Wikidata sin resolver | 1 |

## Listas de campeones usadas

- TC: https://es.wikipedia.org/wiki/Turismo_Carretera
- TC2000: https://es.wikipedia.org/wiki/Turismo_Competición_2000
- TN: https://es.wikipedia.org/wiki/Turismo_Nacional
- F1: https://api.jolpi.ca/ergast/f1/
- Top Race: https://es.wikipedia.org/wiki/Top_Race
- Rally: https://www.rallyargentino.com/documentos/Campeones-Rally-Argentino-1980-2025.pdf
- Dakar: https://es.wikipedia.org/wiki/Rally_Dakar
- TC Pista: https://es.wikipedia.org/wiki/TC_Pista
- Mundial de Turismos: https://en.wikipedia.org/wiki/World_Touring_Car_Championship
- Resistencia: https://en.wikipedia.org/wiki/List_of_FIA_World_Endurance_champions
- Súper TC2000 (2012-2021): https://es.wikipedia.org/wiki/S%C3%BAper_TC2000

Criterios por categoría:

- TC, TC2000, TN y F1 (sólo ganadores argentinos): `src/data/history.json` (TN cuenta todas las clases).
- TC Pista: tabla "Campeones" de es.wikipedia (1995 en adelante).
- Top Race: 1997-2004 la Top Race original; desde 2005 la TRV6 (clase principal). Descartados:
  - 2005 Top Race original (segunda divisional): Claudio Kohler
  - Presentación 2005: Guillermo Ortelli (torneo que no es el campeonato anual)
  - CA 2010: Guido Falaschi (torneo que no es el campeonato anual)
  - TC 2010: Agustín Canapino (torneo que no es el campeonato anual)
- Rally Argentino: campeón general = el que está en **negrita** en la tabla de pilotos de es.wikipedia ("campeones absolutos o de mayor categoría"). Años sin un único nombre en negrita:
  - ninguno
- Dakar: sólo el primer nombre (piloto) de cada celda de ganadores con bandera ARG, en motos, autos, camiones, cuatriciclos, UTV/SSV y Challenger. No se cuentan clásicos ni copilotos. Argentinos copilotos no contados:
  - 2025 Challenger/prototipos: V. Pertegarini (copiloto/acompañante, no se cuenta)

## Mapeo de categorías

Todos los textos de categoría distintos que se leyeron de fichas y tablas, y a qué se mapearon. "ignorada" = categoría conocida que no cuenta; "sin regla" = ninguna regla la reconoce (no cuenta, revisar si falta una).

| Texto | Resultado | Veces |
|---|---|---|
| Turismo Carretera | TC | 1485 |
| Turismo Competición 2000 | TC2000 | 783 |
| Top Race V6 | Top Race | 739 |
| TC Pista | TC Pista | 500 |
| Top Race | Top Race | 491 |
| Turismo Nacional | TN | 409 |
| TC 2000 | TC2000 | 377 |
| Súper TC 2000 | TC2000 | 341 |
| Clase 3 del Turismo Nacional | TN | 183 |
| TC 2000 (2012-) | TC2000 | 119 |
| Turismo Nacional - Clase 3 | TN | 112 |
| Turismo Nacional Clase 3 | TN | 108 |
| Clase 2 del Turismo Nacional | TN | 105 |
| Fórmula 1 | F1 | 103 |
| TC2000 | TC2000 | 84 |
| Súper TC2000 | TC2000 | 63 |
| F1 | F1 | 50 |
| Rally Dakar | Dakar | 47 |
| TC | TC | 29 |
| Campeonato Mundial de Rally | Rally | 19 |
| Campeonato Mundial de Resistencia de la FIA | Resistencia | 19 |
| Rally Dakar - Autos | Dakar | 18 |
| TCR World Tour | Mundial de Turismos | 17 |
| TRV6 | Top Race | 17 |
| Rally Argentino | Rally | 14 |
| TC2000 Series | TC2000 | 14 |
| Campeonato Mundial de Turismos | Mundial de Turismos | 13 |
| Copa Mundial de Turismos | Mundial de Turismos | 13 |
| Turismo Nacional Clase 2 | TN | 13 |
| 24 Horas de Le Mans | Resistencia | 12 |
| Clase B del Turismo Nacional | TN | 12 |
| Campeonato Argentino de Rally | Rally | 11 |
| Clase 3 de Turismo Nacional | TN | 9 |
| Turismo Nacional - Clase 2 | TN | 9 |
| IndyCar Series | IndyCar | 8 |
| Top Race Original | Top Race | 8 |
| WRC | Rally | 8 |
| Rally Dakar de 2012 | Dakar | 6 |
| Turismo Carretera 2000 | TC | 6 |
| Turismo Nacional - Clase C | TN | 6 |
| Rally Dakar de 2013 | Dakar | 4 |
| Rally Dakar de 2019 | Dakar | 4 |
| Turismo Nacional - Clase B | TN | 4 |
| Campeonato Mundial de Resistencia | Resistencia | 3 |
| Rally Dakar de 2011 | Dakar | 3 |
| Rally Dakar de 2014 | Dakar | 3 |
| Rally Dakar de 2016 | Dakar | 3 |
| Rally Dakar de 2017 | Dakar | 3 |
| STC 2000 | TC2000 | 3 |
| Super TC2000 | TC2000 | 3 |
| Turismo Nacional Clase C | TN | 3 |
| World Rally Championship | Rally | 3 |
| WTCC | Mundial de Turismos | 3 |
| 24 Horas de Le Mans 2024 | Resistencia | 2 |
| Campeonato Mundial de Fórmula 1 | F1 | 2 |
| Rally Dakar de 2010 | Dakar | 2 |
| Rally Dakar de 2015 | Dakar | 2 |
| Rally Dakar de 2018 | Dakar | 2 |
| Super TC 2000 | TC2000 | 2 |
| Top Race V6 (titular) | Top Race | 2 |
| Top Race V6 (Volkswagen Passat V) | Top Race | 2 |
| Turismo Nacional clase 2 | TN | 2 |
| 24 Horas de Le Mans 2021 | Resistencia | 1 |
| 24 Horas de Le Mans 2022 | Resistencia | 1 |
| 24 Horas de Le Mans 2023 | Resistencia | 1 |
| Champ Car World Series | IndyCar | 1 |
| Clase 5 del Turismo Nacional | TN | 1 |
| Rally Dakar 2016 | Dakar | 1 |
| Rally Dakar de 2009 | Dakar | 1 |
| Rally Dakar de 2026 | Dakar | 1 |
| STC2000 | TC2000 | 1 |
| TC 2000 (Invitado) | TC2000 | 1 |
| TC Pista (12) | TC Pista | 1 |
| TC Pista (27º) | TC Pista | 1 |
| TC Pista (9º) | TC Pista | 1 |
| TC Pista (subcampeón) | TC Pista | 1 |
| TN Clase 3 | TN | 1 |
| Top Race V6 (13º) | Top Race | 1 |
| Top Race V6 (debut) | Top Race | 1 |
| Turismo Carretera (2 carreras) | TC | 1 |
| Turismo Carretera (Campeón) | TC | 1 |
| Turismo Carretera (debut; 13º) | TC | 1 |
| turismo nacional | TN | 1 |
| Turismo Nacional (CADAD) | TN | 1 |
| Turismo Nacional Clase 12 | TN | 1 |
| Turismo Nacional Clase 4 | TN | 1 |
| Turismo Nacional Clase 5 | TN | 1 |
| Turismo Nacional Clase 8 | TN | 1 |
| Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 358 |
| TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 321 |
| Top Race Series | ignorada (Top Race Series / Junior / NOA / Pista) | 321 |
| Top Race Junior | ignorada (Top Race Series / Junior / NOA / Pista) | 198 |
| TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 145 |
| TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 131 |
| Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 101 |
| Fórmula Renault Plus | ignorada (Fórmulas de formación o menores) | 62 |
| TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 57 |
| TC Mouras Torneo de pilotos invitados | ignorada (TC Mouras / TC Pista Mouras) | 47 |
| TC Mouras<br>Torneo de pilotos invitados | ignorada (TC Mouras / TC Pista Mouras) | 47 |
| Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 46 |
| TCR South America | ignorada (Otras categorías fuera de la lista) | 42 |
| Turismo Pista | ignorada (Otras categorías fuera de la lista) | 38 |
| Copa Mégane | ignorada (Otras categorías fuera de la lista) | 31 |
| Turismo Competición 2000 Copa Endurance Series | ignorada (Otras categorías fuera de la lista) | 29 |
| Turismo Competición 2000<br>Copa Endurance Series | ignorada (Otras categorías fuera de la lista) | 29 |
| Anexo:Copa América 2010 de Top Race | ignorada (Otras categorías fuera de la lista) | 26 |
| Debut en TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 24 |
| Clase 3 del Turismo Pista | ignorada (Otras categorías fuera de la lista) | 22 |
| Fórmula Renault 2.0 Argentina | ignorada (Fórmulas de formación o menores) | 22 |
| Campeonato Argentino de Karting | ignorada (Karting) | 21 |
| Fórmula Renault Metropolitana | ignorada (Fórmulas de formación o menores) | 20 |
| Copa América 2010 | ignorada (Otras categorías fuera de la lista) | 19 |
| Fórmula 4 Argentina | ignorada (Fórmulas de formación o menores) | 19 |
| Debut en Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 17 |
| Anexo:Torneo de pilotos invitados 2014 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 16 |
| Anexo:Torneo de pilotos invitados 2018 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 16 |
| Clase 2 del Turismo Pista | ignorada (Otras categorías fuera de la lista) | 16 |
| Debut en TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 16 |
| Fórmula 2 Argentina | ignorada (Fórmulas de formación o menores) | 15 |
| Fórmula Nacional Argentina | ignorada (Fórmulas de formación o menores) | 15 |
| karting | ignorada (Karting) | 14 |
| Anexo:Temporada 2022 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 13 |
| Fórmula 3 Española | ignorada (Fórmulas de formación o menores) | 13 |
| Fórmula 4 Nueva Generación | ignorada (Fórmulas de formación o menores) | 13 |
| Porsche GT3 Cup Trophy Argentina | ignorada (Otras categorías fuera de la lista) | 13 |
| Top Race NOA | ignorada (Top Race Series / Junior / NOA / Pista) | 13 |
| Anexo:Temporada 2023 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 12 |
| Anexo:Torneo de pilotos invitados 2011 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 12 |
| Anexo:Torneo de pilotos invitados 2013 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 12 |
| Anexo:Torneo de pilotos invitados 2017 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 12 |
| Temporada 2022 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 12 |
| Anexo:Copa Endurance Series 2010 | ignorada (Otras categorías fuera de la lista) | 11 |
| Fórmula 3 Metropolitana | ignorada (Fórmulas de formación o menores) | 11 |
| Temporada 2023 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 11 |
| Torneo de pilotos invitados del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 11 |
| Anexo:Copa Endurance Series 2009 | ignorada (Otras categorías fuera de la lista) | 10 |
| Anexo:Torneo de pilotos invitados 2012 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 10 |
| Anexo:Torneo de pilotos invitados 2016 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 10 |
| Eurocopa de Fórmula Renault | ignorada (Fórmulas de formación o menores) | 10 |
| TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 10 |
| Top Race Series V6 | ignorada (Top Race Series / Junior / NOA / Pista) | 10 |
| Anexo:Temporada 2019 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 9 |
| Campeonato de España de F4 | ignorada (Fórmulas de formación o menores) | 9 |
| Fórmula E | ignorada (Fórmulas de formación o menores) | 9 |
| Fórmula Ford | ignorada (Fórmulas de formación o menores) | 9 |
| Fórmula Renault Italiana | ignorada (Fórmulas de formación o menores) | 9 |
| IMSA SportsCar Championship | ignorada (Otras categorías fuera de la lista) | 9 |
| International GT Open | ignorada (Otras categorías fuera de la lista) | 9 |
| TC Mouras, invitado | ignorada (TC Mouras / TC Pista Mouras) | 9 |
| TC Pista Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 9 |
| TCR Brasil | ignorada (Otras categorías fuera de la lista) | 9 |
| Torneo de invitados del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 9 |
| Anexo:Temporada 2018 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 8 |
| Anexo:Temporada 2020 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 8 |
| Campeonato de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 8 |
| Eurocopa de Fórmula Renault 2.0 | ignorada (Fórmulas de formación o menores) | 8 |
| Fórmula Renault 3.5 Series | ignorada (Fórmulas de formación o menores) | 8 |
| Karting | ignorada (Karting) | 8 |
| Temporada 2021 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 8 |
| Temporada 2024 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 8 |
| Anexo:Temporada 2021 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 7 |
| Anexo:Temporada 2024 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 7 |
| Anexo:Torneo de pilotos invitados 2015 del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 7 |
| Campeonato de Fórmula 2 de la FIA | ignorada (Fórmulas de formación o menores) | 7 |
| Campeonato de Italia de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 7 |
| Copa América de Top Race V6 | ignorada (Otras categorías fuera de la lista) | 7 |
| Copa Bora 1.8T | ignorada (Otras categorías fuera de la lista) | 7 |
| Fórmula 3 Brasil | ignorada (Fórmulas de formación o menores) | 7 |
| Fórmula 4 APAP | ignorada (Fórmulas de formación o menores) | 7 |
| Fórmula Renault 1.6 Argentina | ignorada (Fórmulas de formación o menores) | 7 |
| Masters de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 7 |
| Torneo de pilotos invitados de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 7 |
| Turismo Competición 2000 Copa de Pilotos Privados | ignorada (Otras categorías fuera de la lista) | 7 |
| Turismo Competición 2000<br>Copa de Pilotos Privados | ignorada (Otras categorías fuera de la lista) | 7 |
| Turismo Pista Clase 3 | ignorada (Otras categorías fuera de la lista) | 7 |
| Anexo:Temporada 2017 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 6 |
| Anexo:Temporada 2020 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 6 |
| Anexo:Temporada 2024 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 6 |
| Anexo:Temporada 2025 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 6 |
| Fórmula 3 Británica | ignorada (Fórmulas de formación o menores) | 6 |
| Fórmula 3 Euroseries | ignorada (Fórmulas de formación o menores) | 6 |
| Formula Junior 1.6 by Renault | ignorada (Fórmulas de formación o menores) | 6 |
| Fórmula Renault | ignorada (Fórmulas de formación o menores) | 6 |
| TC Mouras, 1 carrera | ignorada (TC Mouras / TC Pista Mouras) | 6 |
| Top Race V6 Copa América | ignorada (Otras categorías fuera de la lista) | 6 |
| Torneo de Invitados de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 6 |
| Anexo:Temporada 2018 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 5 |
| Campeón Bonaerense de Karting | ignorada (Karting) | 5 |
| Campeonato Bonaerense de Karting | ignorada (Karting) | 5 |
| Campeonato de Italia de Fórmula 4 | ignorada (Fórmulas de formación o menores) | 5 |
| Clase 1 del Turismo Pista | ignorada (Otras categorías fuera de la lista) | 5 |
| Debut en TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 5 |
| Fórmula 3 | ignorada (Fórmulas de formación o menores) | 5 |
| Fórmula 3 Italiana | ignorada (Fórmulas de formación o menores) | 5 |
| Fórmula 3 Sudamericana Light | ignorada (Fórmulas de formación o menores) | 5 |
| Formula Renault Argentina | ignorada (Fórmulas de formación o menores) | 5 |
| Fórmula Renault Interprovincial | ignorada (Fórmulas de formación o menores) | 5 |
| GT World Challenge Europe Endurance Cup | ignorada (Otras categorías fuera de la lista) | 5 |
| Indy Lights | ignorada (Otras categorías fuera de la lista) | 5 |
| International GT Open - Super GT | ignorada (Otras categorías fuera de la lista) | 5 |
| TC Mouras - Torneo de Invitados | ignorada (TC Mouras / TC Pista Mouras) | 5 |
| TC Mouras, Torneo de invitados | ignorada (TC Mouras / TC Pista Mouras) | 5 |
| Top Race Series (V6) | ignorada (Top Race Series / Junior / NOA / Pista) | 5 |
| Anexo:Temporada 1988 de Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 4 |
| Anexo:Temporada 2011 de Fórmula Renault 2.0 Argentina | ignorada (Fórmulas de formación o menores) | 4 |
| Anexo:Temporada 2015 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 4 |
| Anexo:Temporada 2018 de la Porsche GT3 Cup Trophy Argentina | ignorada (Otras categorías fuera de la lista) | 4 |
| Anexo:Temporada 2019 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 4 |
| Anexo:Temporada 2025 de TC Pista Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 4 |
| Bonaerense de Karting | ignorada (Karting) | 4 |
| Campeón Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 4 |
| Campeonato de Estados Unidos de Fórmula 4 | ignorada (Fórmulas de formación o menores) | 4 |
| Campeonato de F3 de las Américas | ignorada (Fórmulas de formación o menores) | 4 |
| Campeonato Entrerriano de Karting | ignorada (Karting) | 4 |
| Copa América | ignorada (Otras categorías fuera de la lista) | 4 |
| Copa Endurance Series de TC 2000 | ignorada (Otras categorías fuera de la lista) | 4 |
| Copa Megane | ignorada (Otras categorías fuera de la lista) | 4 |
| Copa Mégane Argentina | ignorada (Otras categorías fuera de la lista) | 4 |
| Copa Mundial de Bajas de la FIA | ignorada (Otras categorías fuera de la lista) | 4 |
| Fórmula 4 Sudamericana | ignorada (Fórmulas de formación o menores) | 4 |
| Fórmula Renault Argentina 1.6 | ignorada (Fórmulas de formación o menores) | 4 |
| Temporada 1984 de Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 4 |
| Temporada 2025 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 4 |
| Top Race V6 Copa América 2010 | ignorada (Otras categorías fuera de la lista) | 4 |
| Turismo Competición 2000 Copa TC 2000 | ignorada (Otras categorías fuera de la lista) | 4 |
| Turismo Competición 2000<br>Copa TC 2000 | ignorada (Otras categorías fuera de la lista) | 4 |
| Anexo:Temporada 1987 de Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 3 |
| Anexo:Temporada 1989 de Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 3 |
| Anexo:Temporada 2021 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| Anexo:Temporada 2023 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| Anexo:Temporada 2025 de TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 3 |
| Argentino de Karting | ignorada (Karting) | 3 |
| Campeón Argentino de Karting | ignorada (Karting) | 3 |
| Campeón TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| Campeón TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| Campeonato Atlántico de Karting | ignorada (Karting) | 3 |
| Campeonato de Alemania de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 3 |
| Campeonato de Fórmula Regional Europea | ignorada (Fórmulas de formación o menores) | 3 |
| Campeonato Europeo de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 3 |
| Campeonato Federal de Karting | ignorada (Karting) | 3 |
| Campeonato Francés de F4 | ignorada (Fórmulas de formación o menores) | 3 |
| Campeonato Italiano de Turismos TCR | ignorada (Otras categorías fuera de la lista) | 3 |
| Copa América 2010 de Top Race Junior | ignorada (Otras categorías fuera de la lista) | 3 |
| Copa Rotax Max de Karting | ignorada (Karting) | 3 |
| Debut en la Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 3 |
| Debut en TC Pista Mouras, 3 carreras | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| Eurocopa de Fórmula Renault V6 | ignorada (Fórmulas de formación o menores) | 3 |
| F3 Sudamericana Light | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula 2 Británica | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula 2 Europea | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula 3 Chilena | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula 3 Santafesina | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula Renault 2.0 NEC | ignorada (Fórmulas de formación o menores) | 3 |
| Fórmula Renault 3.5 | ignorada (Fórmulas de formación o menores) | 3 |
| GT World Challenge Europe Sprint Cup | ignorada (Otras categorías fuera de la lista) | 3 |
| IMSA SportsCar Championship - GTD Pro | ignorada (Otras categorías fuera de la lista) | 3 |
| Karting Sudeste Cordobés | ignorada (Karting) | 3 |
| TC Mouras - Pilotos invitados | ignorada (TC Mouras / TC Pista Mouras) | 3 |
| TCR Australia Touring Car Series | ignorada (Otras categorías fuera de la lista) | 3 |
| TCR Spain | ignorada (Otras categorías fuera de la lista) | 3 |
| Temporada 1983 de Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 3 |
| Temporada 2019 del Campeonato de España de F4 | ignorada (Fórmulas de formación o menores) | 3 |
| Temporada 2023 de TCR Brasil | ignorada (Otras categorías fuera de la lista) | 3 |
| Temporada 2024 de TCR Brasil | ignorada (Otras categorías fuera de la lista) | 3 |
| Turismo Pista, Clase 2 | ignorada (Otras categorías fuera de la lista) | 3 |
| - Clase TCR | ignorada (Otras categorías fuera de la lista) | 2 |
| - GT3 | ignorada (Otras categorías fuera de la lista) | 2 |
| 24 Horas de Nürburgring - Clase TCR | ignorada (Otras categorías fuera de la lista) | 2 |
| ADAC Fórmula 4 | ignorada (Fórmulas de formación o menores) | 2 |
| Anexo:Copa Endurance Series de Turismo Competición 2000 | ignorada (Otras categorías fuera de la lista) | 2 |
| Anexo:Temporada 2012 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2013 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2014 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2016 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2017 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2019 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Anexo:Temporada 2023 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| BRDC Fórmula 3 | ignorada (Fórmulas de formación o menores) | 2 |
| Campeón de pilotos invitados de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Campeón Fórmula 4 APAP | ignorada (Fórmulas de formación o menores) | 2 |
| Campeón Fórmula 4 Argentina | ignorada (Fórmulas de formación o menores) | 2 |
| Campeón Fórmula Renault Plus | ignorada (Fórmulas de formación o menores) | 2 |
| Campeón Karting Sudeste Cordobés | ignorada (Karting) | 2 |
| Campeón Provincial de karting en tierra | ignorada (Karting) | 2 |
| Campeonato Argentino de Karting 60cc. | ignorada (Karting) | 2 |
| Campeonato Argentino de Karting, Clase Junior | ignorada (Karting) | 2 |
| Campeonato Británico de Fórmula Ford | ignorada (Fórmulas de formación o menores) | 2 |
| Campeonato Cordobés de Karting | ignorada (Karting) | 2 |
| Campeonato de España de F3 | ignorada (Fórmulas de formación o menores) | 2 |
| Campeonato de Fórmula 3 Europea de la FIA | ignorada (Fórmulas de formación o menores) | 2 |
| Campeonato de Fórmula 3 Japonesa | ignorada (Fórmulas de formación o menores) | 2 |
| Campeonato IMSA GT | ignorada (Otras categorías fuera de la lista) | 2 |
| Campeonato Nacional de Karting 125cc. | ignorada (Karting) | 2 |
| Campeonato Provincial de Karting 60cc. | ignorada (Karting) | 2 |
| Campeonato Sudeste Cordobés de Karting | ignorada (Karting) | 2 |
| Carrera de invitados del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Clase 3 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 2 |
| Clase 3 de Turismo Pista, invitado | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa América 2010 de Top Race | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa América de Top Race Junior | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa América de TRV6 | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Coronación "Río Uruguay Seguros" | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa de Europa del Norte de Fórmula Renault | ignorada (Fórmulas de formación o menores) | 2 |
| Copa de Plata "Río Uruguay Seguros" | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa de Plata Río Uruguay Seguros | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Endurance de | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Endurance de TC 2000 | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Endurance Series | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Europea de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 2 |
| Copa Master TR Series | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa Mundial de Bajas Cross-Country de la FIA | ignorada (Otras categorías fuera de la lista) | 2 |
| Copa TC 2000 | ignorada (Otras categorías fuera de la lista) | 2 |
| Debut en Copa Corsa | ignorada (Otras categorías fuera de la lista) | 2 |
| Debut en Fórmula 4 Nueva Generación | ignorada (Fórmulas de formación o menores) | 2 |
| Debut en Fórmula Renault Metropolitana | ignorada (Fórmulas de formación o menores) | 2 |
| Debut en Karting | ignorada (Karting) | 2 |
| Debut en la Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 2 |
| Debut en la Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 2 |
| Debut en la Fórmula Renault Plus | ignorada (Fórmulas de formación o menores) | 2 |
| Debut en TC Mouras. Campeón | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Debut en Top Race Junior, Copa América | ignorada (Otras categorías fuera de la lista) | 2 |
| Eurocopa de Fórmula Renault 2000 | ignorada (Fórmulas de formación o menores) | 2 |
| European F3 Open | ignorada (Fórmulas de formación o menores) | 2 |
| F3 SudAm Light | ignorada (Fórmulas de formación o menores) | 2 |
| FIA GT3 | ignorada (Otras categorías fuera de la lista) | 2 |
| Fórmula 2 Nacional Argentina | ignorada (Fórmulas de formación o menores) | 2 |
| Fórmula 4 Argentina, debut y subcampeonato | ignorada (Fórmulas de formación o menores) | 2 |
| Fórmula 4 Nueva Generación (ex-APAP) | ignorada (Fórmulas de formación o menores) | 2 |
| Fórmula Ford Británica | ignorada (Fórmulas de formación o menores) | 2 |
| Fórmula Renault Cuyana | ignorada (Fórmulas de formación o menores) | 2 |
| GT World Challenge Europe | ignorada (Otras categorías fuera de la lista) | 2 |
| IMSA | ignorada (Otras categorías fuera de la lista) | 2 |
| IMSA SportsCar Championship - LMP3 | ignorada (Otras categorías fuera de la lista) | 2 |
| Invitado en la Fórmula 4 Nueva Generación | ignorada (Fórmulas de formación o menores) | 2 |
| Karting Nacional | ignorada (Karting) | 2 |
| MotoGP | ignorada (Otras categorías fuera de la lista) | 2 |
| NASCAR O'Reilly Auto Parts Series | ignorada (Otras categorías fuera de la lista) | 2 |
| Porsche GT3 Cup Trophy Argentina - Torneo Jóvenes Talentos | ignorada (Otras categorías fuera de la lista) | 2 |
| Roberto Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Subcampeón de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Subcampeón TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| TC 2000, Copa Endurance Series. Invitado | ignorada (Otras categorías fuera de la lista) | 2 |
| TC Mouras, 2 carreras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| TCR Europe | ignorada (Otras categorías fuera de la lista) | 2 |
| TCR Italy Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 2 |
| Temporada 1985 de Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 1986 de Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2006 del Campeonato de España de F3 | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2007 de Fórmula Renault 3.5 Series | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2019 del Campeonato de Fórmula 3 Japonesa | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2020 de Eurocopa de Fórmula Renault | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2020 de TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 2 |
| Temporada 2020-21 de Fórmula Renault 2.0 Argentina | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2024 de TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 2 |
| Temporada 2024 del Campeonato de España de F4 | ignorada (Fórmulas de formación o menores) | 2 |
| Temporada 2026 de TCR South America Touring Car Championship | ignorada (Otras categorías fuera de la lista) | 2 |
| Top Race Junior Copa América 2010 | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Junior, 1 carrera | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Junior, debut y subcampeonato | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Junior, Top Race V6 | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race NOA, 1 carrera | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Pista | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Series - Copa de Damas | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Series (L4) | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Top Race Series. Subcampeón | ignorada (Top Race Series / Junior / NOA / Pista) | 2 |
| Torneo de Invitados del TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 2 |
| Turismo Carretera TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 2 |
| Turismo Pista - Clase 3 | ignorada (Otras categorías fuera de la lista) | 2 |
| - Copa Silver | ignorada (Otras categorías fuera de la lista) | 1 |
| - GT3 Pro | ignorada (Otras categorías fuera de la lista) | 1 |
| - GT3 PRO | ignorada (Otras categorías fuera de la lista) | 1 |
| - TCR | ignorada (Otras categorías fuera de la lista) | 1 |
| 24H GT Series - GT3 | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:TCR Spain Winter Series 2024 | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:Temporada 1984 de Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 1 |
| Anexo:Temporada 1995 de Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Anexo:Temporada 2007 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2008 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2009 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2010 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2011 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2011 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2015 de Fórmula 4 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Anexo:Temporada 2016 de Fórmula 4 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Anexo:Temporada 2016 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2018 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2018 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:Temporada 2019 de la Porsche GT3 Cup Trophy Argentina | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:Temporada 2019 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:Temporada 2020 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2020 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 1 |
| Anexo:Temporada 2021 de Fórmula Renault 2.0 Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Anexo:Temporada 2021 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2022 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2022 de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2023 de TCP Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Anexo:Temporada 2024 de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Anexo:Temporada 2024 de TC Pista Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Anexo:Temporada 2026 de Turismo Pista | ignorada (Otras categorías fuera de la lista) | 1 |
| Baby Kart de la FENAD | ignorada (Karting) | 1 |
| Bicampeón Fórmula 4 APAP | ignorada (Fórmulas de formación o menores) | 1 |
| Bicampeón Provincial de karting en tierra | ignorada (Karting) | 1 |
| Campeón Copa Bicentenario | ignorada (Otras categorías fuera de la lista) | 1 |
| Campeón Copa Bora 1.8T | ignorada (Otras categorías fuera de la lista) | 1 |
| Campeón Copa Mégane | ignorada (Otras categorías fuera de la lista) | 1 |
| Campeón de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Campeón de TC Pista Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Campeón Entrerriano de Karting | ignorada (Karting) | 1 |
| Campeón Fórmula 2 Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Campeón Fórmula 3 Sudamericana Light | ignorada (Fórmulas de formación o menores) | 1 |
| Campeón Fórmula Renault Metropolitana | ignorada (Fórmulas de formación o menores) | 1 |
| Campeón Fórmula Súper Renault Argentina (Tom's) Fórmula 3 Sudamericana (Tom's) TC Pista (F | ignorada (Fórmulas de formación o menores) | 1 |
| Campeón Karting Bélgica. | ignorada (Karting) | 1 |
| Campeón Karting Nacional | ignorada (Karting) | 1 |
| Campeón Karting Zona Centro | ignorada (Karting) | 1 |
| Campeón North American Formula Renault 2000 | ignorada (Fórmulas de formación o menores) | 1 |
| Campeón Pro Kart Amigos en asfalto | ignorada (Karting) | 1 |
| Campeón Sudamericano de Karting | ignorada (Karting) | 1 |
| Campeonato Argentino de Kart. 2 fechas | ignorada (Karting) | 1 |
| Campeonato Argentino de Karting (3º) | ignorada (Karting) | 1 |
| Campeonato Boliviano de Karting | ignorada (Karting) | 1 |
| Campeonato de España de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato de Fórmula Ford Británica | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato de Francia Formula Renault | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato de pilotos invitados de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Campeonato Europeo de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato Mundial 2021-22 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato Mundial 2022-23 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato Mundial 2023-24 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Campeonato Nacional de Karting 60cc. | ignorada (Karting) | 1 |
| Campeonato Panamericano de Karting 100cc. | ignorada (Karting) | 1 |
| Campeonato Porsche GT3 Cup Challenge Brasil | ignorada (Otras categorías fuera de la lista) | 1 |
| Campeonato Provincial de karting en tierra | ignorada (Karting) | 1 |
| Campeonato Zona centro de Karting | ignorada (Karting) | 1 |
| Campionato Italiano Gran Turismo - GT3 | ignorada (Otras categorías fuera de la lista) | 1 |
| Clase 3 del Turismo Pista, 4 carreras | ignorada (Otras categorías fuera de la lista) | 1 |
| Clase 3 del Turismo Pista, Invitado | ignorada (Otras categorías fuera de la lista) | 1 |
| Clase Light F3 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Concurso de Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Copa América 2010 de Top Race V6 | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América 2010 Top Race Junior | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América 2010 Top Race Junior (8.º) | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América 2010 Top Race V6 | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América de | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América de Top Race | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América de Top Race Junior. Campeón | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa América de TR Junior | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Bicentenario | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Corsa | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa de las Naciones | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Master de Top Race Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Mégane, Tercer puesto | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Mundial de Sport Prototipos | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa Mundial de Sport Prototipos - SR1 | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa TC 2000 de pilotos privados | ignorada (Otras categorías fuera de la lista) | 1 |
| Copa TC 2000 para pilotos particulares | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en Copa Bora 1.8T | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en Copa Mégane | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 2 Europea, 6 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 3 Brasil, 3º | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 3 Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 3 Sudamericana, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 4 APAP | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 4 Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula 4 Argentina, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Formula Junior 1.6 by Renault, Campeón | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Formula Renault Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula Renault Argentina, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula Renault Francia | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula Renault Interprovincial | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en Fórmula Renault Metropolitana, 3 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en la Clase 2 del Turismo Pista | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en la Copa Mégane | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en la Fórmula Renault Interprovincial | ignorada (Fórmulas de formación o menores) | 1 |
| Debut en la Porsche GT3 Cup Trophy Argentina | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en Porsche GT3 Cup Trophy Argentina. Campeona. | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut en Race Pick-Up Series | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Debut en TC Mouras, 1 carrera | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Mouras, 2 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Mouras, 3 fechas | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Mouras, 4 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Mouras, 5 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Mouras. Subcampeón | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en TC Pick Up, 2 carreras | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Debut en TC Pista Mouras, 2 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Debut en Top Race Junior Copa América 2010 | ignorada (Otras categorías fuera de la lista) | 1 |
| Debut Fórmula Renault Argentina, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Debut TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Elf Karting Master | ignorada (Karting) | 1 |
| Eurocopa de Fórmula Ford | ignorada (Fórmulas de formación o menores) | 1 |
| F3 Sudamericana Clase B | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 2 | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 2 Argentina, debut y campeonato | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 2, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 España | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 España, 5 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Española Copa de España de F3 | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Española, 5 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Española<br>Copa de España de F3 | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Japonesa | ignorada (Fórmulas de formación o menores) | 1 |
| Formula 3 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Sudamericana - Clase B | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Sudamericana - Clase Light | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Sudamericana - Light | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Sudamericana Clase Light, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 3 Sudamericana, 3 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 4 Chilena | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 4 Light | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 4 Nueva Generación, debut y campeonato | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula 4 Sudamericana, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Ford 1600 Suiza | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Ford 1800 Alemana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Ford Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Junior 1.6 Santafesina | ignorada (Fórmulas de formación o menores) | 1 |
| Formula Renault 2.0 | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2.0 Alemana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2.0 Alemania | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2.0 Alpes | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2.0 Italiana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2000 Alemania | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2000 Eurocopa | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2000 Italiana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2000 Italiana, 2 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault 2000 Masters | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Alemana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Argentina (campeón) | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Argentina, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Formula Renault Argentina, 3 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Argentina, 3 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Argentina, 4 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Argentina, 6 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Elf | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Francia | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Italiana Copa de Invierno | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Italiana, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Italiana, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Italiana<br>Copa de Invierno | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Metropolitana, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Metropolitana, 2 carreras | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Metropolitana. | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Pampeana | ignorada (Fórmulas de formación o menores) | 1 |
| Fórmula Renault Plus, 1 carrera | ignorada (Fórmulas de formación o menores) | 1 |
| Gran Premio de Mónaco de Fórmula 3 | ignorada (Fórmulas de formación o menores) | 1 |
| Gran Premio Regional de Karting | ignorada (Karting) | 1 |
| GT World Challenge Europe - Silver Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| GT World Challenge Europe Endurance Cup - Copa Silver | ignorada (Otras categorías fuera de la lista) | 1 |
| GT World Challenge Europe Sprint Cup - Silver Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA Exxon Supreme GT Series | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA Michelin Pilot Challenge - GT4 | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA SportsCar Championship - DPi | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA SportsCar Championship - GTD | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA SportsCar Championship - GTP | ignorada (Otras categorías fuera de la lista) | 1 |
| IMSA SportsCar Championship - LMP2 | ignorada (Otras categorías fuera de la lista) | 1 |
| International GT Open - GT3 Pro | ignorada (Otras categorías fuera de la lista) | 1 |
| International GT Open - GT3 PRO | ignorada (Otras categorías fuera de la lista) | 1 |
| Invitado TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Karting Cordobés Asfalto | ignorada (Karting) | 1 |
| Karting del Atlántico | ignorada (Karting) | 1 |
| Karting Entrerriano | ignorada (Karting) | 1 |
| Master de pilotos Bonaerense de Karting | ignorada (Karting) | 1 |
| Michelin Pilot Challenge - TCR | ignorada (Otras categorías fuera de la lista) | 1 |
| MotoGP Rookies Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| NASCAR Xfinity Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Nissan Formula E Team | ignorada (Fórmulas de formación o menores) | 1 |
| North American Formula Renault 2000 | ignorada (Fórmulas de formación o menores) | 1 |
| North American Fórmula Renault 2000 | ignorada (Fórmulas de formación o menores) | 1 |
| Porsche GT3 Cup Challenge Brasil Copa Endurance - Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| Porsche GT3 Cup Challenge Brasil<br>Copa Endurance - Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| Pro Kart | ignorada (Karting) | 1 |
| Race Pick-Up Series | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Red Bull MotoGP Rookies Cup | ignorada (Otras categorías fuera de la lista) | 1 |
| Sport Kart 125 | ignorada (Karting) | 1 |
| Subcampeón Argentino de karting en tierra | ignorada (Karting) | 1 |
| Subcampeón Bonaerense de Karting | ignorada (Karting) | 1 |
| Subcampeón Copa América 2010 de Top Race Junior | ignorada (Otras categorías fuera de la lista) | 1 |
| Subcampeón de Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón de Race Pick-Up Series | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Subcampeón en Fórmula Renault Interprovincial | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Fórmula 2 Codasur | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Fórmula 4 Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Formula Renault Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Fórmula Renault Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Fórmula Renault Metropolitana | ignorada (Fórmulas de formación o menores) | 1 |
| Subcampeón Karting Cordobés Asfalto | ignorada (Karting) | 1 |
| Subcampeón Karting Sudeste Cordobés | ignorada (Karting) | 1 |
| Subcampeón Provincial de karting en tierra | ignorada (Karting) | 1 |
| Subcampeona Clase Light F3 Sudamericana | ignorada (Fórmulas de formación o menores) | 1 |
| Sudamericano de Karting | ignorada (Karting) | 1 |
| Súper Turismo 3000 | ignorada (Otras categorías fuera de la lista) | 1 |
| Super Turismo Sudamericano | ignorada (Otras categorías fuera de la lista) | 1 |
| TC Mouras - Pilotos Invitados | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras (invitado) | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, 3 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, 4 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, 5 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, 7 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, debut oficial | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, Invitado | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Mouras, torneo de invitados | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Pista Mouras, 3 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Pista Mouras, 3º puesto | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Pista Mouras, Debut y campeonato | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| TC Pista, TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| TC y TC Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| TCP Pick Up | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| TCR | ignorada (Otras categorías fuera de la lista) | 1 |
| TCR (homologación) | ignorada (Otras categorías fuera de la lista) | 1 |
| TCR Ibérico | ignorada (Otras categorías fuera de la lista) | 1 |
| TCR Italy | ignorada (Otras categorías fuera de la lista) | 1 |
| TCR Spain - Winter Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2005 de Fórmula 3 Euroseries | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2006 de Fórmula 3 Euroseries | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2007 de Fórmula 3 Británica | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2008 de Fórmula Renault 3.5 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2009 de Fórmula Renault 3.5 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2010 de Fórmula Renault 3.5 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2011 de Fórmula 3 Euroseries | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2011 de Indy Lights | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2012 de European F3 Open | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2012 de Indy Lights | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2015 del Campeonato Europeo de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2016 del Campeonato de Italia de Fórmula 4 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2016-17 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2017 del Campeonato Europeo de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2017-18 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2018 de TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2018 del Campeonato de España de F4 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2018 del Campeonato de F3 de las Américas | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2018 del Campeonato Europeo de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2018-19 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2019 del Campeonato de F3 de las Américas | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2019 del Campeonato de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2019 del Campeonato de Fórmula Regional Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2019 del Campeonato de Italia de Fórmula 4 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2019-20 de Fórmula E | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2020 del Campeonato de España de F4 | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2020 del Campeonato de Fórmula Regional Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2021 de TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2021 del Campeonato de Fórmula Regional Europea | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2022 del Campeonato de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2023 de TCR Spain | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2023 del Campeonato de Fórmula 2 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2023 del Campeonato de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2024 de TCR Spain | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2024 del Campeonato de Fórmula 2 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2025 de TCR Brasil | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2026 de TCR Europe Touring Car Series | ignorada (Otras categorías fuera de la lista) | 1 |
| Temporada 2026 del Campeonato de Fórmula 2 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Temporada 2026 del Campeonato de Fórmula 3 de la FIA | ignorada (Fórmulas de formación o menores) | 1 |
| Top Race Junior y Series | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior, 5 carreras | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior, Copa América | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior, Copa América 2010 | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior, Copa América 2010 (Ford Mondeo II) Top Race Series, Torneo Clausura 2010  | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior, invitado | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Junior/Series | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series (3.º) | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series, 1 carrera | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series, 4 carreras | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series, 6 carreras | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series, 8 carreras | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series, Torneo Clausura, 1 carrera | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race Series. Campeón | ignorada (Top Race Series / Junior / NOA / Pista) | 1 |
| Top Race V6<br>Copa América | ignorada (Otras categorías fuera de la lista) | 1 |
| Torneo de invitados de TC Mouras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Torneo de invitados de TC Mouras, 2 carreras | ignorada (TC Mouras / TC Pista Mouras) | 1 |
| Torneo Jóvenes Talentos Porsche GT3 Cup Trophy | ignorada (Otras categorías fuera de la lista) | 1 |
| TR Series (ex-Junior) | ignorada (Top Race Series) | 1 |
| Triangular de Fórmula 4 | ignorada (Fórmulas de formación o menores) | 1 |
| Tricampeón Fórmula 2 Argentina | ignorada (Fórmulas de formación o menores) | 1 |
| Turismo Carretera, TC Pick Up y Turismo Nacional C3 | ignorada (TC Pick Up / TC Pista Pick Up) | 1 |
| Turismo Competición 2000 - Copa TC 2000 | ignorada (Otras categorías fuera de la lista) | 1 |
| Turismo Pista 1100 | ignorada (Otras categorías fuera de la lista) | 1 |
| Turismo Pista Clase 2 | ignorada (Otras categorías fuera de la lista) | 1 |
| Turismo Pista Clase 3, 2 carreras | ignorada (Otras categorías fuera de la lista) | 1 |

Textos sin regla (no cuentan; 2138 distintos, entre paréntesis las veces que aparecen):

automovilismo (430) · argentino (364) · Argentina (309) · Debut en (288) · Provincia de Buenos Aires (200) · Coches (134) · Buenos Aires (118) · automovilismo de velocidad (109) · Fórmula Metropolitana (95) · Fórmula 1 Mecánica Argentina (62) · Asociación Corredores de Turismo Carretera (54) · Quads (50) · Campeón (44) · Provincia de Santa Fe (36) · Turismo Internacional (34) · Temporada 2009 de Turismo Competición 2000 (33) · Chevrolet (30) · Debut en TC Pista (30) · Ciudad de Buenos Aires (28) · Debut en la (27) · Piloto de karts (27) · Subcampeón (27) · 200 km de Buenos Aires (26) · Anexo:Temporada 2011 de Top Race (26) · Chevrolet Chevy (26) · Debut en Turismo Carretera (26) · Temporada 2011 de Turismo Competición 2000 (26) · Anexo:Temporada 2009 de Top Race (25) · Club Argentino de Pilotos (25) · Córdoba (25) · Temporada 2010 de Turismo Competición 2000 (25) · Turismo 4000 Argentino (25) · Stock Car Brasil (24) · Temporada 2017 del Súper TC 2000 (24) · Anexo:Temporada 2009 de Turismo Carretera (23) · Provincia de Córdoba (Argentina) (23) · Supercart (23) · Anexo:Temporada 2011 de Turismo Carretera (22) · Anexo:Temporada 2018 de Turismo Carretera (22) · Anexo:Torneo Clausura 2010 de Top Race (22) · Dodge (22) · Ford (22) · Motos (22) · Temporada 2014 del Súper TC 2000 (22) · Temporada 2016 del Súper TC 2000 (22) · Anexo:Temporada 2016 de Turismo Carretera (21) · Debut en Top Race V6 (21) · Temporada 2015 del Súper TC 2000 (21) · Anexo:Temporada 2010 de Turismo Carretera (20) · Anexo:Temporada 2013 de Top Race (20) · Anexo:Temporada 2013 de Turismo Carretera (20) · Mar del Plata (20) · Temporada 2008 de Turismo Competición 2000 (20) · Temporada 2013 del Súper TC 2000 (20) · Temporada 2019 del Súper TC 2000 (20) · Anexo:Temporada 2003 de Turismo Carretera (19) · Anexo:Temporada 2004 de Turismo Carretera (19) · Anexo:Temporada 2008 de Top Race (19) · Anexo:Temporada 2012 de Top Race (19) · Anexo:Temporada 2012 de Turismo Carretera (19) · Anexo:Temporada 2017 de Turismo Carretera (19) · Dodge Cherokee (19) · Provincia de Entre Ríos (19) · Temporada 2018 del Súper TC 2000 (19) · Temporada 2020 del Súper TC 2000 (19) · Anexo:Temporada 2017 de Top Race (18) · Anexo:Temporada 2019 de Turismo Carretera (18) · Anexo:Temporada 2021 de Turismo Carretera (18) · Anexo:Temporada 2023 de Turismo Carretera (18) · Fórmula Entrerriana (18) · rally (18) · Temporada 2021 del Súper TC 2000 (18) · Anexo:Temporada 2002 de Turismo Carretera (17) · Anexo:Temporada 2015 de Turismo Carretera (17) · Anexo:Temporada 2020 de Turismo Carretera (17) · argentina (17) · Campeón de (17) · invitado (17) · Temporada 2007 de Turismo Competición 2000 (17) · Temporada 2012 del Súper TC 2000 (17) · 24 Horas de Nürburgring (16) · Anexo:Temporada 1996 de Turismo Carretera (16) · Anexo:Temporada 1999 de Turismo Carretera (16) · Anexo:Temporada 2005 de Turismo Carretera (16) · Anexo:Temporada 2008 de Turismo Carretera (16) · Anexo:Temporada 2015 de Top Race (16) · Anexo:Temporada 2024 de Turismo Carretera (16) · Fórmula 3000 Internacional (16) · Temporada 2016 de TC 2000 (16) · - Clase 3 (15) · Anexo:Temporada 1998 de Turismo Carretera (15) · Anexo:Temporada 2014 de Top Race (15) · Anexo:Temporada 2014 de Turismo Carretera (15) · Debut (15) · Debut en Top Race Junior (15) · Desafío Focus (15) · Fórmula Súper Renault (15) · Sport Prototipo Argentino (15) · Temporada 1998 de Turismo Competición 2000 (15) · Temporada 2001 de Turismo Competición 2000 (15) · Temporada 2005 de Turismo Competición 2000 (15) · Temporada 2017 de TC 2000 (15) · Temporada 2018 de TC 2000 (15) · Anexo:Temporada 2006 de Turismo Carretera (14) · Anexo:Temporada 2007 de Top Race (14) · Anexo:Temporada 2014 de Turismo Nacional (14) · Anexo:Temporada 2017 de Turismo Nacional (14) · Ford Falcon (14) · Fórmula Súper Renault Argentina (14) · provincia de Buenos Aires (14) · Provincia de Córdoba (14) · Temporada 2000 de Turismo Competición 2000 (14) · Temporada 2022 de Turismo Nacional (14) · Anexo:Temporada 2006 de Top Race (13) · Anexo:Temporada 2007 de Turismo Carretera (13) · Anexo:Temporada 2016 de Top Race (13) · Anexo:Temporada 2018 de Top Race (13) · Anexo:Temporada 2020 de Top Race (13) · Anexo:Temporada 2022 de TC2000 (13) · Anexo:Temporada 2022 de Turismo Carretera (13) · Arrecifes (13) · Citroën (13) · GT 2000 (13) · Invitado (13) · Invitado a los (13) · Nacionalidad argentina (13) · RallyGP (13) · Subcampeón de (13) · Temporada 1995 de Turismo Competición 2000 (13) · Temporada 1997 de Turismo Competición 2000 (13) · Temporada 2004 de Turismo Competición 2000 (13) · Temporada 2006 de Turismo Competición 2000 (13) · 1000 km de Buenos Aires de TC 2018 (12) · Anexo:Temporada 1994 de Turismo Carretera (12) · Anexo:Temporada 1995 de Turismo Carretera (12) · Anexo:Temporada 1997 de Turismo Carretera (12) · Anexo:Temporada 2000 de Turismo Carretera (12) · Anexo:Temporada 2001 de Turismo Carretera (12) · Anexo:Temporada 2005 de Top Race (12) · Anexo:Temporada 2019 de Top Race (12) · Buenos Aires 1000 (12) · Buenos Aires 1000 de TC (12) · Campeonato del Mundo de Motociclismo (12) · Chile (12) · Debut en TC 2000 (12) · Ford Falcon (Argentina) (12) · motociclismo (12) · Provincia del Chubut (12) · Renault (12) · Temporada 1994 de Turismo Competición 2000 (12) · Temporada 1999 de Turismo Competición 2000 (12) · Temporada 2019 de Turismo Nacional (12) · Torneo Clausura 2010 de Top Race (12) · 1000 km de Buenos Aires (11) · Anexo:Temporada 1993 de Turismo Carretera (11) · Anexo:Temporada 2013 de Turismo Nacional (11) · Anexo:Temporada 2016 de Turismo Nacional (11) · Entre Ríos (11) · La Plata (11) · Monomarca (11) · ST Sudamericano (11) · Temporada 1996 de Turismo Competición 2000 (11) · Temporada 2002 de Turismo Competición 2000 (11) · Temporada 2011 de Turismo Nacional (11) · . Campeón (10) · Anexo:Temporada 2023 de TC Pista (10) · Campeonato de Nürburgring de Resistencia de la VLN (10) · Clase C (10) · del (10) · Dodge GTX (10) · empresario (10) · Estados Unidos (10) · Ford Mondeo II (10) · Lobería (10) · rally raid (10) · Stock Car Pro Series (10) · Tandil (10) · TC 4000 del NEA (10) · TC 4000 Standard Santafesino (10) · - Super GT (9) · Anexo:Carrera de la Historia de Top Race (9) · Anexo:Temporada 2002 de Top Race (9) · Anexo:Temporada 2015 de Turismo Nacional (9) · Anexo:Temporada 2022 de TC Pista (9) · Anexo:Temporada 2024 de TC2000 (9) · Anexo:Temporada 2024 de Turismo Nacional (9) · Anexo:Temporada 2025 de Turismo Carretera (9) · Campeonato FIA GT (9) · Campeonato Sudamericano de Superturismos (9) · debut (9) · Debut en la Clase 3 del Turismo Nacional (9) · European Le Mans Series (9) · Juan María Traverso (9) · Michelin Pilot Challenge (9) · piloto (9) · Superturismo Sudamericano (9) · TC 2000 y Súper TC 2000 (9) · Temporada 2012 de Turismo Nacional (9) · Ultimate (9) · - LMP3 (8) · Anexo:Temporada 1991 de Turismo Carretera (8) · Anexo:Temporada 2008 de Turismo Nacional (8) · Anexo:Temporada 2018 de Turismo Nacional (8) · Anexo:Temporada 2021 de Top Race (8) · Anexo:Temporada 2022 de Top Race (8) · Anexo:Temporada 2022 de Turismo Nacional (8) · Automovilismo (8) · Bahía Blanca (8) · Comodoro Rivadavia (8) · Debut en el (8) · Debut en Top Race Series (8) · Europa (8) · Fórmula BMW (8) · GP3 Series (8) · Gran Premio de Macao (8) · ICC Sudam (Birel Parilla) (8) · Italia (8) · Laboulaye (8) · Lomas de Zamora (8) · motociclista (8) · Necochea (8) · Olavarría (8) · Provincia de Mendoza (8) · Rafaela (8) · Santa Fe (8) · Temporada 2003 de Turismo Competición 2000 (8) · Temporada 2019 de TC 2000 (8) · Temporada 2020 de Turismo Nacional (8) · Temporada 2021 de Turismo Nacional (8) · - Hypercar (7) · - LMP2 (7) · 1000 km de Buenos Aires de TC 2017 (7) · 24 Horas de Daytona (7) · Anexo:Temporada 1992 de Turismo Carretera (7) · Anexo:Temporada 1997 de Top Race (7) · Anexo:Temporada 2003 de Top Race (7) · Anexo:Temporada 2005 de Turismo Competición 2000 (7) · Anexo:Temporada 2010 de Turismo Nacional (7) · Anexo:Temporada 2021 de TC Pista (7) · Anexo:Temporada 2023 de TC2000 (7) · Anexo:Temporada 2024 de TC Pista (7) · Arrecifes (Buenos Aires) (7) · Campeonato de Super Fórmula Japonesa (7) · Campeonato Mundial de Resistencia de la FIA - Hypercar (7) · Challenger (7) · Córdoba (Argentina) (7) · Fiat Linea Competizione (7) · ibidem (7) · Monomarca Citroën Semipreparado (7) · provincia de Córdoba (Argentina) (7) · Semipreparado (7) · TC 4000 Santafesino (7) · TC Roqueperense (7) · Temporada 1991 de Turismo Competición 2000 (7) · Temporada 1993 de Turismo Competición 2000 (7) · Temporada 2012 de TC 2000 (7) · Temporada 2024 de TCR World Tour (7) · Torino Cherokee (7) · Turismo Carretera, 2 carreras (7) · Turismo Carretera, 3 carreras (7) · - Clase C (6) · . Invitado (6) · . Subcampeón (6) · 200 km de Bs. As. (6) · 200 km de TC 2000 (6) · Anexo:Temporada 1985 de Turismo Competición 2000 (6) · Anexo:Temporada 1986 de Turismo Competición 2000 (6) · Anexo:Temporada 1988 de Turismo Carretera (6) · Anexo:Temporada 1989 de Turismo Carretera (6) · Anexo:Temporada 1989 de Turismo Competición 2000 (6) · Anexo:Temporada 1990 de Turismo Carretera (6) · Anexo:Temporada 2000 de Top Race (6) · Anexo:Temporada 2001 de Top Race (6) · Anexo:Temporada 2006 de Turismo Nacional (6) · Anexo:Temporada 2007 de Turismo Competición 2000 (6) · Anexo:Temporada 2021 del Súper TC 2000 (6) · Arrecifes (Argentina) (6) · Asian Le Mans Series (6) · Brasil (6) · Campeonato bonaerense (6) · Clase B del (6) · Concepción del Uruguay (6) · Debut en Fórmula Metropolitana (6) · enduro (6) · Escudería Río de la Plata (6) · futbolista (6) · Juan Manuel Fangio (6) · Las Parejas (6) · Mataderos (6) · piloto de cuatriciclo (6) · Provincia de Misiones (6) · Quilmes (6) · Renault Fluence (6) · Super GT Japonés (6) · TC 2000, 1 carrera (6) · Temporada 1990 de Turismo Competición 2000 (6) · Temporada 1992 de Turismo Competición 2000 (6) · Temporada 2022 de TC2000 (6) · Temporada 2023 de TCR World Tour (6) · Temporada 2023 de Turismo Nacional (6) · TN APAT (6) · Top Race V6 Torneo Clausura (6) · Top Race V6, 1 carrera (6) · Torneo de invitados (6) · Uruguay (6) · Volkswagen (6) · - GT500 (5) · - LMGT3 (5) · (V6) (5) · ADAC Zürich (5) · Anexo:Temporada 1984 de Turismo Competición 2000 (5) · Anexo:Temporada 1986 de Turismo Carretera (5) · Anexo:Temporada 1988 de Turismo Competición 2000 (5) · Anexo:Temporada 1990 de Turismo Nacional (5) · Anexo:Temporada 1998 de Top Race (5) · Anexo:Temporada 1999 de Top Race (5) · Anexo:Temporada 2001 de Turismo Nacional (5) · Anexo:Temporada 2003 de Turismo Competición 2000 (5) · Anexo:Temporada 2004 de Top Race (5) · Anexo:Temporada 2004 de Turismo Competición 2000 (5) · Anexo:Temporada 2006 de Turismo Competición 2000 (5) · Anexo:Temporada 2007 de Turismo Nacional (5) · Anexo:Temporada 2008 de TC Pista (5) · Anexo:Temporada 2009 de Turismo Competición 2000 (5) · Anexo:Temporada 2009 de Turismo Nacional (5) · Anexo:Temporada 2010 de Turismo Competición 2000 (5) · Anexo:Temporada 2011 de Turismo Competición 2000 (5) · Anexo:Temporada 2018 de TC Pista (5) · Anexo:Temporada 2018 del Súper TC 2000 (5) · Anexo:Temporada 2025 de TC2000 (5) · Balcarce (5) · Camiones (5) · Campeón Clase 2 del Turismo Nacional (5) · Campeón Monomarca Citroën (5) · campeonato (5) · Campeonato Europeo de Fórmula Dos (5) · Campeonato Mundial de Rally Raid (5) · Ciudad de Neuquén (5) · Clase 2 (5) · Concordia (5) · Concordia (Argentina) (5) · Copiloto en (5) · Copiloto en TC Pista (5) · Enduro del Verano (5) · Ford Sierra (5) · Fórmula Nippon (5) · Ibídem (5) · Master de Pilotos (5) · Mendoza (5) · Monomarca Gol (5) · Nueve de Julio (5) · piloto de automovilismo (5) · Piloto de carreras (5) · Porsche Supercup (5) · Provincia de Río Negro (5) · Provincia de San Juan (5) · Provincia del Chaco (5) · Salta (5) · San Isidro (5) · subcampeonato (5) · Super GT Japonés - GT500 (5) · Superleague Fórmula (5) · TC Roqueperense, Clase C (5) · Temporada 2013 de TC 2000 (5) · Temporada 2015 de TC 2000 (5) · Torneo de Invitados de (5) · - Clase 2 (4) · - Clase B (4) · - GS (4) · (debut en (4) · (Tom's) (4) · 1991 (4) · 2023 (4) · 25 de Mayo (La Pampa) (4) · abogado (4) · Anexo:Temporada 1982 de Turismo Competición 2000 (4) · Anexo:Temporada 1983 de Turismo Competición 2000 (4) · Anexo:Temporada 1987 de Turismo Carretera (4) · Anexo:Temporada 1987 de Turismo Competición 2000 (4) · Anexo:Temporada 1991 de Turismo Nacional (4) · Anexo:Temporada 1993 de Turismo Competición 2000 (4) · Anexo:Temporada 2002 de Turismo Competición 2000 (4) · Anexo:Temporada 2002 de Turismo Nacional (4) · Anexo:Temporada 2003 de Turismo Nacional (4) · Anexo:Temporada 2016 del Súper TC 2000 (4) · Anexo:Temporada 2022 de TC2000 Series (4) · Anexo:Temporada 2023 de Top Race (4) · Anexo:Temporada 2024 de Top Race (4) · Anexo:Temporada 2025 de TN APAT (4) · Autódromo Mar y Valle (4) · Automóvil Club Argentino (4) · automóviles de turismo (4) · automovilista (4) · Banfield (4) · Belén de Escobar (4) · BMW Serie 3 (4) · Campeón Clase "D" Zonal Chaqueño (4) · Campeón de TC Pista (4) · Campeonato Argentino de Rally Cross Country (4) · Campeonato Argentino de Rally Cross Country - Autos (4) · Campeonato de España de GT (4) · Campeonato de España de GT - Super GT (4) · Campeonato FIA GT - GT1 (4) · Campeonato Mundial de Resistencia de la FIA - LMGT3 (4) · Campeonato Sudamericano de Rally (4) · Campeonato Sudamericano de Turismos (4) · Capitán Bermúdez (4) · Catriel (Río Negro) (4) · Chacabuco (4) · Chajarí (4) · Chevrolet Vectra II (4) · Ciudad de Córdoba (Argentina) (4) · Clase "D" (4) · Clase "D" Zonal Chaqueño (4) · Clase Maxi Rally (4) · Consagración (4) · copiloto (4) · Debut en el TC 2000 (4) · Del Viso (4) · Enduro (4) · España (4) · estadounidense (4) · Eurocup-3 (4) · Ezeiza (4) · Fiat 600 (4) · Fiat Linea (4) · Fórmula 3000 Británica (4) · Fórmula Atlantic (4) · Fórmula Honda (4) · Franco Girolami (4) · Gabriel Furlán (4) · Germán Giles (4) · GP2 Series (4) · Gran Turismo Americano (4) · Indy Pro 2000 (4) · Invitado TC Roqueperense (4) · Juncos Hollinger Racing (4) · Junín (4) · Junín (Buenos Aires) (4) · Marcos Juárez (4) · MG) (4) · Michelin Le Mans Cup (4) · Michelin Pilot Challenge - GS (4) · MP Motorsport (4) · Munro (4) · Nürburgring (4) · Oberá (4) · Olivos (4) · Peugeot (4) · Pigüé (4) · Pre-Junior 125cc. (4) · Premio Konex (4) · Pro Racing (4) · provincia de Santa Fe (4) · Punta Arenas (4) · Rada Tilly (4) · Rally Argentino, Clase Maxi Rally (4) · Rally de Argentina (4) · Rally Entrerriano (4) · Ramos Mejía (4) · Rawson (4) · Renault Argentina (4) · Renault Clio (4) · Renault Clio Cup (4) · Río Cuarto (4) · San Isidro (Buenos Aires) (4) · San Juan de la Frontera (4) · Sport Team (4) · Sportteam (4) · Stock Car Argentino (4) · Subaru Impreza (4) · Subcampeón TC 4000 del NEA (4) · TC 2000 Light (4) · TC 2000, 3 carreras (4) · TC 2000, 5 carreras (4) · Temporada 1989 de Turismo Competición 2000 (4) · Temporada 1997 del Campeonato Sudamericano de Superturismos (4) · Temporada 2008 del Campeonato FIA GT (4) · Temporada 2016 del Campeonato Mundial de Turismos (4) · Temporada 2023 de TC2000 (4) · título= RESULTS - FIM - Cross-Country (4) · Torneo Clausura de Top Race Series (4) · Torneo Clausura de TRV6 (4) · Toyota Gazoo Racing (4) · Toyota Hilux (4) · Toyota Racing Series (4) · Trelew (4) · Turismo Carretera, 5 carreras (4) · Turismo Mejorado (4) · Turismo Special de la Costa (4) · Ushuaia (4) · V de V Challenge (4) · Villa Dolores (4) · Villa Regina (4) · Zonal Chaqueño, Clase "D" (4) · - Clase V4 (3) · - GT1 (3) · - GTD Pro (3) · - LMP1 (3) · - Pilotos invitados (3) · - Torneo de Invitados (3) · 2 Horas de Buenos Aires (3) · 2009 (3) · 2021 (3) · 2024 (3) · 2025 (3) · 24 horas de Nurburgring (3) · 24 Horas de Nürburgring - Clase SP10 (3) · 24 Horas de Nürburgring - Clase V4 (3) · 24H TCE Series (3) · ADAC Zürich VLN Series Cup 3 (3) · Anexo:Listado de pilotos ganadores de Turismo Carretera (3) · Anexo:Temporada 1969 de Fórmula 1 Mecánica Argentina (3) · Anexo:Temporada 1975 de Turismo Carretera (3) · Anexo:Temporada 1976 de Turismo Carretera (3) · Anexo:Temporada 1977 de Turismo Carretera (3) · Anexo:Temporada 1981 de Turismo Nacional (3) · Anexo:Temporada 1982 de Turismo Nacional (3) · Anexo:Temporada 1983 de Turismo Carretera (3) · Anexo:Temporada 1984 de Turismo Carretera (3) · Anexo:Temporada 1989 de Turismo Nacional (3) · Anexo:Temporada 1990 de Turismo Competición 2000 (3) · Anexo:Temporada 1991 de Turismo Competición 2000 (3) · Anexo:Temporada 1994 de Turismo Competición 2000 (3) · Anexo:Temporada 2000 de Turismo Competición 2000 (3) · Anexo:Temporada 2000 de Turismo Nacional (3) · Anexo:Temporada 2001 de Turismo Competición 2000 (3) · Anexo:Temporada 2004 de Turismo Nacional (3) · Anexo:Temporada 2005 de Turismo Nacional (3) · Anexo:Temporada 2013 de TC Pista (3) · Anexo:Temporada 2014 de TC Pista (3) · Anexo:Temporada 2015 de TC Pista (3) · Anexo:Temporada 2017 del Súper TC 2000 (3) · Anexo:Temporada 2018 de TC 2000 (3) · Anexo:Temporada 2020 de TC Pista (3) · Anexo:Temporada 2021 de Turismo Nacional (3) · argento (3) · Atlantic Championship Series (3) · Autódromo Oscar y Juan Gálvez (3) · automóvil de turismo (3) · Balcarce (Buenos Aires) (3) · Barcelona (3) · Campeonato FIA GT1 (3) · Campeonato Mundial de Resistencia de la FIA - LMP1 (3) · Campeonato Mundial de Superbikes (3) · Carrera de la Historia de Top Race (3) · Categoría 50cc. (3) · Categoría Escuela (3) · Categoría Junior 125cc. (3) · Chaco (3) · Chevrolet Astra (3) · Ciudad de Mendoza (3) · Clase 2 del TN APAT (3) · Clase 2 del Turismo Nacional, 1 carrera (3) · Clase 3 del Turismo Nacional, 1 carrera (3) · Clase 3 del Turismo Nacional, 7 carreras (3) · Club Argentino de Pilotos Nissan 300 (3) · CODASUR (3) · Córdoba (capital) (3) · Cup 3 (3) · Debut en el ST Sudamericano (3) · Debut en Fórmula Entrerriana (3) · Debut en la Clase 2 del Turismo Nacional (3) · Debut en TC Pista, 2 carreras (3) · Debut en Top Race (3) · Debut en Top Race V6, 5 carreras (3) · Debut en Turismo Carretera, 5 carreras (3) · Desafío Fiesta (3) · Eurocopa SEAT León (3) · Eurofórmula Open (3) · European Le Mans Series - LMP2 (3) · F1 Mecánica Argentina (3) · FIA GT (3) · Ford Fiesta (3) · Fórmula BMW Europea (3) · Fórmula Future Fiat (3) · Formula TR 2000 Pro Series (3) · Francia (3) · Fuerza Libre Mecánica Nacional (3) · Gran Turismo Internacional (3) · Grupo N4 (3) · ICC Sudam (Intrepid) (3) · Invitado a las (3) · Invitado a los 1000 km de Buenos Aires (3) · Invitado a los 1000 km de Buenos Aires de TC (3) · Invitado a los 200 km de Buenos Aires (3) · Junior (3) · Las Flores (3) · Las Flores (Buenos Aires) (3) · Letra en cursiva: Temporada en curso (3) · Minardi (3) · Monomarca 1100 del Atlántico (3) · Monomarca Gol del Chubut (3) · Morón (3) · Morón (Buenos Aires) (3) · Moto3 (3) · Motociclismo (3) · Oreste Berta (3) · P.A.K.O. (3) · Paraná (3) · Paraná (Argentina) (3) · Pergamino (3) · Pilar (3) · Pilar (Buenos Aires) (3) · piloto de carreras (3) · Pro Mazda Championship (3) · Provincia de Neuquén (3) · provincia homónima (3) · RAM Racing Factory (3) · Renault Plus (3) · Río Cuarto (ciudad) (3) · Salto (3) · Salto (Buenos Aires) (3) · San Juan (3) · San Pedro (3) · Series (3) · SSV (3) · SSVs (3) · Subcampeón Clase 2 del Turismo Nacional (3) · Subcampeón de TC Pista (3) · Subcampeón de Turismo Carretera (3) · Sudam Junior 125 cc. (3) · Sudam Junior 125cc. (3) · Sudam Senior (3) · Sudam Senior 125cc. (3) · Superturismo Uruguayo (3) · TC 2000, 200 km de Buenos Aires (3) · TC Pista, 2 carreras (3) · TC Pista, 4 carreras (3) · Temporada 1986 de Turismo Competición 2000 (3) · Temporada 1987 de Turismo Competición 2000 (3) · Temporada 1988 de Turismo Competición 2000 (3) · Temporada 1996 de Fórmula 3000 Internacional (3) · Temporada 1998 del Campeonato Sudamericano de Turismos (3) · Temporada 2009 de Superleague Fórmula (3) · Temporada 2014 de TC 2000 (3) · Temporada 2015 del Campeonato Mundial de Turismos (3) · Temporada 2018 de Turismo Nacional (3) · Temporada 2020 de la Copa Mundial de Turismos (3) · Temporada 2022 de la Copa Mundial de Turismos (3) · Temporada 2023 del Campeonato Mundial de Resistencia de la FIA (3) · Temporada 2024 de Turismo Nacional (3) · Temporada 2025 de Eurocup-3 (3) · Temporada 2025 de TCR World Tour (3) · Temporada 2025 del Campeonato Mundial de Resistencia de la FIA (3) · Torneo Clausura 2010 (3) · Torneo Clausura 2010 de Top Race Series (3) · Torneo Provincial Pre-Juniors (3) · Turismo Internacional. Campeón (3) · turismos (3) · Volkswagen Passat V (3) · Volkswagen Polo (3) · W2RC (3) · Zonal Cuyano Clase 2 (3) · - DPi (2) · - Grand Sport (2) · - GT (2) · - GT300 (2) · - LMGTE Am (2) · - Silver Cup (2) · - SP (2) · - SP9 (2) · - Winter Series (2) · «Joven» (2) · «Joven»TC 2000 (2) · (125cc) (2) · (250cc (2) · (ex-APAP) (2) · (L4) (2) · (titular) (2) · 1 carrera ( (2) · 100 millas de TC 2000 (2) · 1000 km de Buenos Aires de TC (2) · 1000 km de Buenos Aires de Turismo Carretera (2) · 12 Horas de Sebring (2) · 1985 (2) · 1986 (2) · 1987 (2) · 1990 (2) · 1994 (2) · 200 km de Bs. As. del STC 2000 (2) · 200 km de Bs. As., Súper TC 2000 (2) · 200 km de Bs. As., TC 2000 (2) · 200 km de Buenos Aires del Súper TC 2000 (2) · 2010 (2) · 2011 (2) · 2012 (2) · 2013 (2) · 2014 (2) · 2015 (2) · 2016 (2) · 2017 (2) · 2019 (2) · 2022 (2) · 24 Horas de Daytona de 2023 (2) · 24 Horas de Le Mans - LMP2 (2) · 24H Series (2) · 4 fechas (2) · 50 cm³ (2) · Acebal (2) · ACTC (2) · ADAC Zürich 24 Horas de Nürburgring Cup 3 (2) · ADAC Zürich VLN Series Clase V6 (2) · ADAC Zürich VLN Series Cup 3, Campeón (2) · Agustín Canapino (2) · Aimogasta (2) · Alberti (2) · Alberto Rodríguez Larreta (2) · Alfa Romeo (2) · All Japan Grand Touring Car Championship (2) · Alta Gracia 100 (2) · Alta Gracia 100 de TC 2000 (2) · Anexo:Ronda de Alta Gracia de TC 2000 2016 (2) · Anexo:Ronda de Alta Gracia II de TC 2000 2017 (2) · Anexo:Temporada 1968 de Turismo Carretera (2) · Anexo:Temporada 1969 de Turismo Carretera (2) · Anexo:Temporada 1970 de Turismo Carretera (2) · Anexo:Temporada 1971 de Turismo Carretera (2) · Anexo:Temporada 1972 de Turismo Carretera (2) · Anexo:Temporada 1974 de Turismo Carretera (2) · Anexo:Temporada 1978 de Turismo Carretera (2) · Anexo:Temporada 1980 de Turismo Competición 2000 (2) · Anexo:Temporada 1981 de Turismo Competición 2000 (2) · Anexo:Temporada 1983 del Club Argentino de Pilotos (2) · Anexo:Temporada 1984 del Club Argentino de Pilotos (2) · Anexo:Temporada 1985 de Turismo Carretera (2) · Anexo:Temporada 1985 del Club Argentino de Pilotos (2) · Anexo:Temporada 1986 del Club Argentino de Pilotos (2) · Anexo:Temporada 1987 de Turismo Nacional (2) · Anexo:Temporada 1992 de Turismo Competición 2000 (2) · Anexo:Temporada 1992 de Turismo Nacional (2) · Anexo:Temporada 1996 de Turismo Competición 2000 (2) · Anexo:Temporada 1998 de TC Pista (2) · Anexo:Temporada 2008 de Turismo Competición 2000 (2) · Anexo:Temporada 2009 de TC Pista (2) · Anexo:Temporada 2010 de TC Pista (2) · Anexo:Temporada 2011 de TC Pista (2) · Anexo:Temporada 2012 de TC Pista (2) · Anexo:Temporada 2012 de Turismo Nacional (2) · Anexo:Temporada 2014 del Súper TC 2000 (2) · Anexo:Temporada 2015 del Súper TC 2000 (2) · Anexo:Temporada 2016 de TC Pista (2) · Anexo:Temporada 2019 de TC Pista (2) · Anexo:Temporada 2019 de Turismo Nacional (2) · Anexo:Temporada 2019 del Súper TC 2000 (2) · Anexo:Temporada 2020 de Turismo Nacional (2) · Anexo:Temporada 2021 de TC 2000 (2) · Anexo:Temporada 2023 de Turismo Nacional (2) · Anexo:Temporada 2025 de TC Pista (2) · Anexo:Temporada 2026 de TN APAT (2) · Annecy (2) · arquitecto (2) · Arsenal Fútbol Club (2) · Asian Le Mans Series - LMP3 (2) · Athos Pampa (2) · Augusto Carinelli (2) · Auto GP (2) · Auto GP World Series (2) · Autódromo Ciudad de Nueve de Julio (2) · Autódromo de Buenos Aires (2) · Autódromo Rosamonte (2) · aviador (2) · Azul (2) · Balcarce (ciudad) (2) · Bell Ville (2) · Blancpain Endurance Series (2) · BMW E36 (2) · BMW M1 Procar Championship (2) · Bolonia (2) · Bombal (2) · Bragado (2) · Caballito (2) · Campeón Bonaerense de la APK (2) · Campeón de pilotos invitados (2) · Campeón de pilotos privados (2) · Campeón de Turismo Carretera (2) · Campeón Fórmula 1 Mecánica Argentina (2) · Campeón Fórmula Entrerriana (2) · Campeón Panamericano CIK FIA 2002 (2) · Campeón Panamericano CIK FIA 2002, 2004,2005 (2) · Campeón Panamericano CIK-FIA (2) · Campeón TC Chaqueño (2) · Campeón Top Race Junior (2) · Campeonato Argentino de Rally Cross (2) · Campeonato Argentino de Velocidad (2) · Campeonato Cordobés - Final (2) · Campeonato Cordobés - Torneo Apertura (2) · Campeonato Cordobés - Torneo Clausura (2) · Campeonato de Nürburgring de Resistencia de la VLN - Clase SP10 (2) · Campeonato de Nürburgring<br>de Resistencia de la VLN (2) · Campeonato de Nürburgring<br>de Resistencia de la VLN - Clase SP10 (2) · Campeonato del Mundo de Motociclismo (125cc) (2) · Campeonato del Mundo de Motociclismo (250cc y Moto2) (2) · Campeonato Italiano de Gran Turismos (2) · Campeonato Japonés de Turismos (2) · Campeonato Metropolitano Prokart (2) · Campeonato Mundial de Rally Cross-Country de la FIM (2) · Campeonato Mundial de Resistencia - SP (2) · Campeonato Mundial Fórmula A (2) · Campeonato Panamericano CIK-FIA (2) · Campeonato TC 2000 de pilotos privados (2) · Campionato Italiano Velocitá Turismo - N2 (2) · Canadá (2) · canadiense (2) · Cañuelas (2) · Capital Federal (2) · Caracas (2) · Carrera de la Historia (2) · Carrera de la Historia del TRV6 (2) · Carrera de la Historia TRV6 (2) · Casilda (2) · Castelar (2) · Categoría Pre Junior (2) · Categoría ProKart (2) · Categoría Promocional Sthil (2) · Categoría Sthil 60 cc. Metropolitano (2) · Categoría Stihl (2) · Chacabuco (ciudad) (2) · Chevrolet Corsa (2) · Chevrolet Cruze (2) · Chevrolet Cruze I (2) · Chevrolet Cruze II (2) · Chevrolet Vectra (2) · chile (2) · Chivilcoy (2) · Chovet (2) · Chrysler (2) · Chubut (2) · Citroën semipreparado (2) · ciudad de Buenos Aires (2) · Ciudad de Corrientes (2) · Ciudad de Nueve de Julio (2) · Ciudad de Paraná (2) · Ciudad de Resistencia (2) · Ciudad de San Juan (2) · Ciudad de Santa Fe (2) · Clase 2T (2) · Clase 3 del TN APAT (2) · Clase Cup 3 de la VLN (2) · Clase Junior (2) · Clase ST (2) · Club Atlético Boca Juniors (2) · Clucellas (2) · Compromiso Federal (2) · Copiapó (2) · Cordillera de los Andes (2) · Coronel Pringles (2) · Cosquín (2) · Dakar Series (2) · Dallara (2) · Dallas (2) · Debut en Clase 3 del Turismo Nacional (2) · Debut en GT 2000 (2) · Debut en GT 2000, 2 carreras (2) · Debut en la Clase B del Turismo Nacional (2) · Debut en la Fórmula Entrerriana (2) · Debut en Súper TC 2000 (2) · Debut en Súper TC 2000, 1 carrera (2) · Debut en TC 2000, 4 fechas (2) · Debut en TC 2000, 9 carreras (2) · Debut en TC Pista, 1 carrera (2) · Debut en TC Pista. Campeón (2) · Debut en Top Race Original (2) · Debut en Top Race V6, 1 carrera (2) · Debut TC 2000 (2) · Desafío Renault (2) · Detroit (2) · dirigente deportivo (2) · Dodge Polara (2) · Domingo Marimón (2) · Don Torcuato (2) · Eduardo Copello (2) · Emiliano Spataro (2) · Enduro del Verano, Clase 2T (2) · Equipo Júnior de Red Bull (2) · Ernesto Bessone II (2) · Esteban Tuero (2) · EuroBrun Racing (2) · Europea (2) · European Le Mans Series - LMP3 (2) · Facundo Ardusso (2) · Ferrari (2) · Fiat (2) · Fiat 128 IAVA (2) · Fiat Uno (2) · Ford Escort Zetec (2) · Ford Focus I (2) · Ford Focus II (2) · Ford Focus III (2) · Ford Ranger (2) · Ford Taunus (2) · Fórmula 1000 Argentina (2) · Fórmula 2000 (2) · Fórmula Metropolitana, 2 carreras (2) · Fórmula Nissan 2000 (2) · Fórmula Opel Lotus Euroseries (2) · Fórmula Truck (2) · Frente para la Victoria (2) · Fuente: (2) · Fuerza Limitada Argentina (2) · Fundación Konex (2) · Gabriel Novillo (2) · Gabriel Raies (2) · General Cabrera (2) · General Pico (2) · General Ramírez (2) · GF Racing (2) · Giancarlo Minardi (2) · golfista (2) · GP Juan Milán (2) · Gran Premio de (2) · Gran Premio de Argentina de 1960 (2) · Gran Premio de la América del Sur del Turismo Carretera (2) · Gran Premio de Turismo Carretera (2) · Grupo A6 (2) · GT Racing (2) · Guadalupe Norte (2) · Guaymallén (2) · Guido Falaschi (2) · Guillermo Ortelli (2) · Héctor Luis Gradassi (2) · Hero MotoSports (2) · historial del Turismo Carretera (2) · Honda (2) · Huanguelén (2) · Humberto Krujoski (2) · IAME International Finals (2) · ICC Sudam (Birel) (2) · ICC Sudam (Mini Parilla MG) (2) · Ingeniero Maschwitz (2) · Ingeniero Pablo Nogués (2) · Inglaterra (2) · Instituto Universitario de la Policía Federal Argentina (2) · Invitado a la (2) · Invitado a las 2 Horas de Buenos Aires del TC (2) · Invitado a los 1000 km de Buenos Aires (debut en TC) (2) · Invitado TC Roqueperense, Clase C (2) · Invitado TC Roqueperense, Clase ST (2) · Isla Verde (2) · Isla Verde (Argentina) (2) · Jenzer Motorsport (2) · Jonatan Castellano (2) · José Froilán González (2) · JP Racing (2) · Juan Manuel Silva (2) · Juan Pedro Heguy (2) · Juegos Olímpicos de Londres 1948 (2) · Juegos Panamericanos de 1951 (2) · Juegos Panamericanos de 1955 (2) · Julio Pardo (2) · Julio Pardo (piloto) (2) · La Banda (2) · La Luisa (2) · La Pampa (2) · Lanús (2) · Lanús Oeste (2) · Las Breñas (2) · Las Rosas (2) · Laureano Campanera (2) · Lobos (2) · Luis Belloso (2) · Luis Rubén Di Palma (2) · Luján (2) · Luján de Cuyo (2) · Machagai (2) · Mar de Ajó (2) · Marcos Ciani (2) · Mariano Acebal (2) · Martín Serrano (2) · Maserati 250F (2) · Matías Rossi (2) · Mechongué (2) · Mendoza (Argentina) (2) · Mercedes-Benz (2) · Mercedes-Benz C-203 (2) · Mercedes-Benz C-204 (2) · Mercedes-Benz Clase C (2) · Merzouga Dakar Series de Marruecos (2) · Michelin Le Mans Cup - LMP3 (2) · Michelin Pilot Challenge - Grand Sport (2) · Míchigan (2) · Milán (2) · Mina Clavero (2) · Módena (2) · Monomarca 1100 Zonal Atlántica (2) · Monomarca Fiat 600 (2) · Monomarca Kia (2) · Montevideo (2) · Monza (2) · Moto2 (2) · motociclismo de velocidad (2) · Movimiento Popular Fueguino (2) · Nicolás Filiberti (2) · Omar Martínez (2) · Opel (2) · Open Internacional de GT (2) · Oscar Castellano (2) · P.A.K.O., GP Juan Milán (2) · Panamericano CIK-FIA (2) · Partido de San Miguel (2) · Pergamino (Buenos Aires) (2) · periodista deportivo (2) · Peugeot 306 (2) · Pilotos argentinos en Fórmula 1 (2) · Pinamar (2) · político (2) · Porsche 944 (2) · Porsche Endurance Series (2) · Posadas (2) · Potrero de los Funes (2) · Pre Juniors (2) · Pro Mazda (2) · Procar 4000 (2) · Provincia de Chubut (2) · Provincia de Jujuy (2) · Provincia de La Pampa (2) · provincia de Mendoza (2) · provincia de Río Negro (2) · Provincia de Salta (2) · Provincia de San Luis (2) · Provincia de Santiago del Estero (2) · provincia de Tierra del Fuego, Antártida e Islas del Atlántico Sur (2) · provincia del Chaco (2) · Provincia homónima (2) · Pujato (2) · Punta del Este (2) · Quilmes (Buenos Aires) (2) · rallies (2) · Rally (2) · Rally Acrópolis (2) · Rally Argentino, Grupo A6 (2) · Ramallo (2) · Ramini Competición (2) · Real Sporting de Gijón (2) · Región de Atacama (2) · Región de Auvernia-Ródano-Alpes (2) · Renault 18 (2) · Renault 19 (2) · Renault Fuego (2) · Renault Gordini (2) · República Argentina (2) · Resistencia (2) · Revelación (2) · Ricky Brabec (2) · Río Ceballos (2) · Río Tercero (2) · Roque Pérez (2) · Rosario del Tala (2) · Rotax (2) · Rullo Sport (2) · RV Racing Sports (2) · San Antonio de Areco (2) · San Antonio Oeste (2) · San Carlos de Bariloche (2) · San José de Balcarce (2) · San Juan (Argentina) (2) · San Martín (2) · San Martín (Mendoza) (2) · San Nicolás de los Arroyos (2) · San Rafael (2) · San Rafael (Mendoza) (2) · Santa Fe de la Veracruz (2) · Santa Teresita (2) · Schick Racing (2) · SDE Competición (2) · selección de fútbol de España (2) · Senior Max (Intrepid IAME (2) · Senior Max (Intrepid IAME/MG) (2) · Sergio Guarnaccia (2) · Sport Prototipo (2) · Subaru Forester (2) · Subcampeón Clase 3 del Turismo Nacional (2) · Subcampeón de la (2) · Subcampeón de la Clase 3 del Turismo Nacional (2) · Subcampeón de Top Race (2) · Subcampeón Fórmula Súper Renault (2) · Subcampeón TC 2000 (2) · Sudamérica (2) · sup> (2) · Súper Cross de Verano (2) · Super GT (2) · Súper TC 2000, 1 carrera (2) · TC 2000, Campeón de pilotos privados (2) · TC Chaqueño (2) · TC Regional del '40 (2) · TC2000 y Súper TC2000 (2) · Temporada 1976 de Fórmula 1 (2) · Temporada 1981 de Fórmula 1 (2) · Temporada 1982 de Turismo Competición 2000 (2) · Temporada 1983 de Turismo Competición 2000 (2) · Temporada 1985 de Turismo Competición 2000 (2) · Temporada 1999 de Fórmula 3000 Internacional (2) · Temporada 2012 de GP3 Series (2) · Temporada 2013 de GP3 Series (2) · Temporada 2014 del Campeonato Mundial de Turismos (2) · Temporada 2015 de Turismo Nacional (2) · Temporada 2017 de Turismo Nacional (2) · Temporada 2017 del Campeonato Mundial de Turismos (2) · Temporada 2019 de la Copa Mundial de Turismos (2) · Temporada 2019-20 del Campeonato Mundial de Resistencia de la FIA (2) · Temporada 2021 de la Copa Mundial de Turismos (2) · Temporada 2021 del Campeonato Mundial de Resistencia de la FIA (2) · Temporada 2022 del Campeonato de Super Fórmula Japonesa (2) · Temporada 2023 de IndyCar Series (2) · Temporada 2024 de IndyCar Series (2) · Temporada 2024 del Campeonato Mundial de Resistencia de la FIA (2) · Temporada 2025 de Turismo Nacional (2) · Temporada 2026 del Campeonato Mundial de Resistencia de la FIA (2) · Texas (2) · Tigre (2) · TN APAT - Clase 3 (2) · Top Race V6 y Top Race Series (2) · Top Race V6, 2 carreras (2) · Top Race V6, 3 carreras (2) · Top Race V6, 4 carreras (2) · Top Race y TRV6 (2) · Top Race/TRV6 (2) · Tornado (2) · Tornado (motor) (2) · Torneo Clausura 2010 del Top Race Junior (2) · Torneo de invitados del TCM (2) · Toronto (2) · Toyota (2) · Toyota Corolla (2) · TR Junior (2) · Tres Algarrobos (2) · Tres Arroyos (2) · Tulio Crespi (2) · Turismo Carretera Torneo de carreras especiales (2) · Turismo Carretera<br>Torneo de carreras especiales (2) · Turismo Competición 2000, 3 carreras (2) · Turismo Competición 2000, 4 carreras (2) · Unquillo (2) · uruguay (2) · uruguayo (2) · Van Amersfoort Racing (2) · Venado Tuerto (2) · Viedma (2) · Villa Allende (2) · Villa Ángela (2) · Villa Carlos Paz (2) · Villa Dolores (Córdoba) (2) · Villa Minetti (2) · Volkswagen Passat (2) · Volvo (2) · WRC, Grupo N4 (2) · WRCC (2) · WRCC RallyGP (2) · YPF (2) · Zapala (2) · Zárate (2) · Zenón Pereyra (2) · - Challenge (1) · - Clase D (1) · - DP (1) · - Fórmula A (1) · - Fórmula B (1) · - GT2 (1) · - GTD (1) · - GTP (1) · - GTS (1) · - Invitados (1) · - Light (1) · - LMGTE (1) · - Pro-Am (1) · - SR1 (1) · - TA2 Series (1) · - Torneo Jóvenes Talentos (1) · - Turismos (1) · :en:2022 Michelin Pilot Challenge (1) · :pt:Temporada da Stock Car Brasil de 2022 (1) · . 1 carrera (1) · . 6 carreras (1) · . Campeona. (1) · (13º) (1) · (2 carreras) (1) · (27º) (1) · (3.º) (1) · (7.º) (1) · (8.º) (1) · (9º) (1) · (campeón) (1) · (Campeón) (1) · (debut (1) · (debut) (1) · (invitado) (1) · (Invitado) (1) · (subcampeón) (1) · 1 carrera. (1) · 1 fecha (1) · 100 millas de Alta Gracia (1) · 100 millas de Alta Gracia de TC2000 (1) · 1000 km de Bs. As. (1) · 1000 km de la Ciudad de Buenos Aires (1) · 13º) (1) · 1961 (1) · 1963 (1) · 1977 (1) · 1983 (1) · 1984 (1) · 1988 (1) · 1989 (1) · 1993 (1) · 1998 (1) · 2 carreras ( (1) · 2 carreras. (1) · 2 Codasur (1) · 2 horas de Buenos Aires (1) · 2 hs. de Bs.As. (1) · 200 km (1) · 200 km de (1) · 200 km de Buenos Aires de (1) · 200 km de Buenos Aires de TC 2000 (1) · 200 km de Buenos Aires, invitado (1) · 200 km de La Plata (1) · 200 km de La Plata, TC 2000 (1) · 200 km de Súper TC 2000 (1) · 200 km de Toay (1) · 200 km de Toay, Súper TC 2000 (1) · 200 km del Súper TC 2000 (1) · 2004 (1) · 2006 (1) · 2007 (1) · 2019-20 (1) · 2020 (1) · 2026 (1) · 24 horas de Daytona (1) · 24 Horas de Le Mans - GTS (1) · 24 Horas de Le Mans - LMGTE Am (1) · 24 Horas de Nürburgring - Clase SP10-GT4 (1) · 24 Horas de Nürburgring - Clase V5 (1) · 24 Horas de Nürburgring - SP9 (1) · 24H GT Series (1) · 3 competencias (1) · 3 fechas (1) · 3º puesto (1) · 6 competencias (1) · 7b0cc72a-2b6b-413f-bd30-7a8417919eca (1) · 9 carreras. (1) · A.L.M.A. Clase 2 (1) · Abarth Punto Competizione (1) · Abierto de la República Argentina 85 cc. (1) · ADAC GT Masters (1) · ADAC Zürich 24 Horas de Nürburgring clase V4 (1) · ADAC Zürich 24 Horas de Nürburgring clase V6 (1) · ADAC Zürich 24 Horas de Nürburgring Cup 3, Campeón (1) · ADAC Zürich VLN Series clase V4 (1) · ADAC Zürich VLN Series Clase V6, Campeón (1) · All Japan Grand Touring Car Championship - GT300 (1) · Almafuerte (1) · Almafuerte (Córdoba) (1) · América (1) · América (Buenos Aires) (1) · American Le Mans Series (1) · American Le Mans Series - GT2 (1) · Anexo:Gran Premio de Alemania de 1954 (1) · Anexo:Gran Premio de Argentina de 1955 (1) · Anexo:Grandes Premios de Fórmula 1 (1) · Anexo:Pilotos ganadores de Turismo Carretera (1) · Anexo:Récords de Fórmula 1 (1) · Anexo:Ronda de Alta Gracia II de TC 2000 2018 (1) · Anexo:Ronda de Buenos Aires de TC 2000 2018 (1) · Anexo:Ronda de Buenos Aires del Súper TC 2000 2014 (1) · Anexo:Ronda de Buenos Aires II de TC 2000 2017 (1) · Anexo:Temporada 1964 de Turismo Carretera (1) · Anexo:Temporada 1966 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1967 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1967 de Turismo Carretera (1) · Anexo:Temporada 1968 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1968 de Turismo Nacional (1) · Anexo:Temporada 1969 de Turismo Nacional (1) · Anexo:Temporada 1970 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1970 de Turismo Nacional (1) · Anexo:Temporada 1971 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1971 de Sport Prototipo Argentino (1) · Anexo:Temporada 1972 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1972 de Sport Prototipo Argentino (1) · Anexo:Temporada 1973 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1973 de Turismo Carretera (1) · Anexo:Temporada 1973 de Turismo Nacional (1) · Anexo:Temporada 1974 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1974 de Turismo Nacional (1) · Anexo:Temporada 1975 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1975 de Turismo Nacional (1) · Anexo:Temporada 1976 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1976 de Turismo Nacional (1) · Anexo:Temporada 1977 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1977 de Turismo Nacional (1) · Anexo:Temporada 1978 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1978 de Turismo Nacional (CADAD) (1) · Anexo:Temporada 1979 de Fórmula 1 Mecánica Argentina (1) · Anexo:Temporada 1979 de Turismo Nacional (1) · Anexo:Temporada 1979-80 de Turismo Carretera (1) · Anexo:Temporada 1980 de Turismo Nacional (1) · Anexo:Temporada 1980-81 de Turismo Carretera (1) · Anexo:Temporada 1982 de Turismo Carretera (1) · Anexo:Temporada 1983 de Turismo Nacional (1) · Anexo:Temporada 1985 de Turismo Nacional (1) · Anexo:Temporada 1986 de Turismo Nacional (1) · Anexo:Temporada 1988 del Club Argentino de Pilotos (1) · Anexo:Temporada 1993 de Turismo Nacional (1) · Anexo:Temporada 1994 de Turismo Nacional (1) · Anexo:Temporada 1995 de Turismo Competición 2000 (1) · Anexo:Temporada 1999 de Turismo Competición 2000 (1) · Anexo:Temporada 2007 de TC Pista (1) · Anexo:Temporada 2012 del Súper TC 2000 (1) · Anexo:Temporada 2013 de TC 2000 (1) · Anexo:Temporada 2014 de la Abarth Punto Competizione (1) · Anexo:Temporada 2014 de TC 2000 (1) · Anexo:Temporada 2015 de TC 2000 (1) · Anexo:Temporada 2016 de TC 2000 (1) · Anexo:Temporada 2017 de TC Pista (1) · Anexo:Temporada 2019 de TC 2000 (1) · Anexo:Temporada 2020 de TC 2000 (1) · Anexo:Temporada 2020 del Súper TC 2000 (1) · Anexo:Temporada 2021 de TC2000 (1) · Anexo:Temporada 2023 de TC2000 Series (1) · Anexo:Temporada 2025 de Top Race (1) · Anexo:Temporada 2025 de Turismo Carretera 2000 (1) · Anexo:Temporada 2026 de TC Pista (1) · Anexo:Temporada 2026 de TC2000 (1) · Anexo:Temporada 2026 de Turismo Carretera (1) · Anexo:Torneo de carreras especiales de Turismo Carretera 2018 (1) · Anexo:Torneo de carreras especiales de Turismo Carretera 2019 (1) · Anexo:Torneo Lizeviche-Galíndez 1981 de Turismo Carretera (1) · Ascensión (1) · Ascensión (Buenos Aires) (1) · Asian Le Mans Series - GT (1) · Asian Le Mans Series - LMP2 (1) · Atlantic Pro Racing Series (1) · autódromo de Buenos Aires (1) · Automóvil de turismo (1) · automovilismo argentino (1) · Automovilismo de Argentina (1) · Autorizado a competir en Piston Port (1) · Azul (Argentina) (1) · Azul (Buenos Aires) (1) · Barber Dodge Pro Series (1) · Barber Pro Series (1) · Barcelona, Barcelona, España (1) · Barracas (1) · Barracas (Buenos Aires) (1) · Bella Vista (1) · Bella Vista (Buenos Aires) (1) · Berta (1) · Bicampeón Mar (1) · Bicampeón Mar y Sierras "A" (1) · Bicampeón Zonal del Atlántico Monomarca 1100 (1) · Birel IAME (1) · Blancpain Endurance Series, 1 carrera (1) · Blancpain GT Series Endurance Cup (1) · Blancpain GT Series Endurance Cup - Pro-Am (1) · Bonaerense Sudam Júnior (1) · C.A. Rally Cross Country (1) · Cámara de Diputados de la Provincia de Buenos Aires (1) · Campana (1) · Campana (Buenos Aires) (1) · campeón (1) · Campeón Categoría ProKart (1) · Campeón categoría Stihl 50 cc. (1) · Campeón Citroën semipreparado (1) · Campeón Clase B del (1) · Campeón Clase B del Turismo Nacional (1) · Campeón de Clase 2 del Turismo Nacional (1) · Campeón de Clase 3 del Turismo Nacional (1) · Campeón de F1 Mecánica Argentina (1) · Campeón de la (1) · Campeón de la Clase 3 del Turismo Nacional (1) · Campeón de Sport Prototipo Argentino (1) · Campeón de TC 2000 (1) · Campeón de Top Race Junior (1) · Campeón de Top Race Series (1) · Campeón de Torneo Clausura 2010 de Top Race Junior (1) · Campeón de Turismo 4000 Argentino (1) · Campeón de Turismo Special de la Costa (1) · Campeón del (1) · Campeón del TC 2000 (1) · Campeón Fórmula Metropolitana (1) · Campeón Metropolitano de la FENAD (1) · Campeón TC 4000 del NEA (1) · Campeón TC Regional del '40 (1) · Campeón TC Roqueperense (1) · Campeón TC Roqueperense, Clase C (1) · Campeón Top Race Series (1) · Campeón Top Race Series (Ford Mondeo II) (1) · Campeón Torneo Apertura (1) · Campeón Turismo Carretera (1) · Campeón Turismo Mejorado (1) · Campeón Zonal del Atlántico Monomarca 1100 (1) · Campeón Zonal del Atlántico Promocional 850 (1) · Campeonato "Buenos Aires 2000" Sénior (1) · Campeonato Argentino (1) · Campeonato Argentino 85 cc. (1) · Campeonato Argentino ICA 100 Júnior (1) · Campeonato Argentino Junior (1) · Campeonato Argentino Sudam Júnior (1) · Campeonato Bonaerense (1) · Campeonato Bonaerense de la APK (1) · Campeonato Bonaerense Grupo 2 - Torneo Clausura (1) · Campeonato Buenos Aires 2000 (1) · campeonato categoría Sudam Seniors (1) · Campeonato Comunidad Valenciana 100cc. (1) · Campeonato Cordobés (1) · Campeonato de Nürburgring de Resistencia de la VLN - Clase CUP3 (1) · Campeonato de Nürburgring de Resistencia de la VLN - Clase V6 (1) · Campeonato de Nürburgring<br>de Resistencia de la VLN - Clase CUP3 (1) · Campeonato de Nürburgring<br>de Resistencia de la VLN - Clase V6 (1) · Campeonato de Sport Prototipos de la FIA (1) · Campeonato de Super Formula Japonesa (1) · Campeonato Europeo de Turismos (1) · Campeonato Europeo Fórmula A (1) · Campeonato GB3 (1) · Campeonato Metropolitano Sudam Júnior (1) · Campeonato Mundial de Resistencia - GT, 1 carrera (1) · Campeonato Mundial de Resistencia de la FIA - LMGTE Am (1) · Campeonato Mundial de Sport Prototipos (1) · Campeonato Mundial FIA GT1 (1) · Campeonato Nocturno Bonaerense (1) · Campeonato Norteamericano de Fórmula A (1) · Campeonato Panamericano Fórmula A (1) · Campeonato TC 2000 de Pilotos Privados (1) · Campionato Italiano Gran Turismo (1) · Capitán Sarmiento (1) · Capitán Sarmiento (ciudad) (1) · CARCC (1) · CARCC, 1 fecha (1) · Carrera de la historia (1) · Carrera de la historia de Top Race (1) · Carrera de la Historia de Top Race - Invitados (1) · Carrera de la historia de Top Race V6 (1) · Carrera de la historia de Top Race, invitado (1) · Carrera de la Historia de TRV6 (1) · Carrera de la historia del Top Race (1) · Carrera de la historia del TR Junior (1) · Carrera de las Estrellas de TC 2000 (1) · CART World Championship Series (1) · catalán (1) · Cataluña (1) · Categoría Argentino 125 cc. (1) · Categoría Cadet Piston Port (1) · categoría Lites (1) · Categoría Pre-Juniors A.P.K. (1) · Categoría ProKart. Tercer puesto (1) · Categoría Senior 125 cc. (1) · Categoría Stihl 50 cc. (1) · Categoría Stihl 50 cc. Trelew (1) · Categoría Stihl Torneo de Verano (1) · Categoría Stihl Torneo Provincial (1) · Ceres (1) · Ceres (Santa Fe) (1) · Chascomús (1) · Cherokee (1) · cinco (1) · Citroën World Touring Car Team (1) · Ciudad de Chascomús (1) · Ciudad de Córdoba (1) · Ciudad de Río Cuarto (1) · Ciudad de Salta (1) · Ciudad de San Juan (Argentina) (1) · Ciudad Eva Perón (1) · Ciudadanía italiana (1) · clase 2 (1) · Clase 2 del Turismo Nacional, debut y campeonato (1) · Clase 3 (1) · Clase 3 de (1) · Clase 3 de Turismo Nacional, 1 carrera (1) · Clase 3 del Turismo Nacional, 2 carreras (1) · Clase 3 del Turismo Nacional, 4 carreras (1) · Clase 3 del Turismo Nacional, debut y campeonato (1) · Clase 3 del Turismo Nacional. Invitado (1) · Clase A (1) · Clase A6 (1) · Clase B del Turismo Zonal Pista (1) · Clase GT (1) · Clase Light (1) · Clase N4 (1) · Clase RC2 (1) · clase V4 (1) · clase V6 (1) · Clase V6 de la VLN (1) · Club Argentino de Pilotos y Turismo Competición 2000 (1) · Cocho López (1) · Concepción (1) · Concepción (Tucumán) (1) · Concurso de (1) · Concurso Nacional de Pilotos (1) · Concurso Nacional de Pilotos, semifinales (1) · Conesa (1) · Conesa (Buenos Aires) (1) · Copiloto de (1) · Córdoba (ciudad de Argentina) (1) · corredor (1) · Corzuela (1) · Corzuela (Chaco) (1) · De Tomaso (1) · De Tomaso Automobili S.p.A (1) · Debut Clase "D" del Zonal del NEA (1) · Debut Clase 3 del Turismo Nacional (1) · Debut en Clase 2 del Turismo Nacional (1) · Debut en Clase 3 del Turismo Nacional, 6 carreras (1) · Debut en Club Argentino de Pilotos (1) · Debut en Desafío Fiesta (1) · Debut en Desafío Focus (1) · Debut en el Campeonato Metropolitano de la FENAD (1) · Debut en el Súper TC 2000 (1) · Debut en Fórmula 1, 1 carrera (1) · Debut en Fórmula 1, 4 carreras (1) · Debut en Fórmula 1000 Argentina (1) · Debut en Fórmula 1000 Argentina, 5 carreras (1) · Debut en Fórmula Honda (1) · Debut en Fórmula Honda, 2 carreras (1) · Debut en Fórmula Metropolitana, 2 carreras (1) · Debut en Fórmula Metropolitana, 6 carreras (1) · Debut en la Clase B del (1) · Debut en la Fiat Linea Competizione (1) · Debut en la Fórmula Metropolitana (1) · Debut en la Fórmula Súper Renault (1) · Debut en Libres 1000 (1) · Debut en Monomarca Gol (1) · Debut en Monomarca Kia (1) · Debut en Sport Prototipo Bahiense (1) · Debut en ST Sudamericano (1) · Debut en Stock Car Argentino (1) · Debut en Súper TC 2000, 4 carreras (1) · Debut en Súper TC 2000, 9 carreras. (1) · Debut en Supercart (1) · Debut en TC 1100 ALMA (1) · Debut en TC 2000 Light (1) · Debut en TC 2000, 1 carrera (1) · Debut en TC 2000, 2 carreras (1) · Debut en TC 2000, 3 carreras (1) · Debut en TC 2000, 4 carreras (1) · Debut en TC 2000, 5 carreras (1) · Debut en TC 2000. 1 carrera (1) · Debut en TC 4000 Santafesino (1) · Debut en TC 4000 Santafesino, 3 carreras (1) · Debut en TC Pista. Subcampeón (1) · Debut en TC Regional del '40 (1) · Debut en TC Rioplatense (1) · Debut en TN Clase 3, 7 carreras (1) · Debut en Top Race Junior, 4 carreras (1) · Debut en Top Race Junior. Subcampeón (1) · Debut en Top Race NOA, 3 carreras (1) · Debut en Top Race Series V6 (1) · Debut en Top Race Series, 1 carrera. (1) · Debut en Top Race Series, 2 carreras (1) · Debut en Top Race Series, 7 carreras (1) · Debut en Top Race V6, 2 carreras (1) · Debut en Top Race V6, 2 carreras. (1) · Debut en Top Race V6, 6 carreras (1) · Debut en Top Race V6, 7 carreras (1) · Debut en TRV6 Torneo Clausura 2010 (1) · Debut en Turismo 4000 Argentino (1) · Debut en Turismo 4000 Argentino. Subcampeón (1) · Debut en Turismo Carretera, 2 carreras (1) · Debut en Turismo Carretera, 3 carreras (1) · Debut en Turismo Carretera, 6 carreras (1) · Debut en Turismo Carretera, 6 competencias (1) · Debut en Turismo Competición 2000 (1) · Debut en Turismo Competición 2000, 1 carrera (1) · Debut en Turismo Internacional, dos carreras (1) · Debut en Turismo Nacional, Clase 2 (1) · Debut en Turismo Special de la Costa (1) · Debut en Turismo Special de la Costa, 2 carreras (1) · Debut en WTCC, 2 carreras (1) · Debut Fórmula Súper Renault (1) · Debut Fórmula Súper Renault, 1 carrera (1) · Debut Monomarca 128 de APAC. Campeón (1) · debut oficial (1) · Debut oficial en (1) · Debut oficial en Turismo Carretera (1) · Debut TC (1) · Debut TC 4000 del NEA (1) · Debut TC Pista (1) · Debut TC Roqueperense (1) · Debut TC Roqueperense, Clase C (1) · Debut Top Race Junior (1) · Debut y campeonato categoría Sudam Seniors (1) · Debut y subcampeonato en Metropolitano de la APK (1) · Debut, Categoría ProKart (1) · Della Penna Motorsports (1) · Deporte adaptado (1) · Deportes de motor Della Penna (1) · deportista adaptado (1) · Deportista destacado (1) · Desafío Chrysler (1) · Desafío Fiesta. Campeón (1) · Desafío Focus, Campeón Torneo Apertura (1) · Desafío Focus, Subcampeón Nacional (1) · Desafío Renault, campeón (1) · diputado de la Provincia de Buenos Aires (1) · dos carreras (1) · DP-1 Team (1) · Drifting (1) · DTM Trophy (1) · El piloto se retiró de la actividad el 31 de mayo de 2022 (1) · El piloto se retiró de la actividad el 31 de mayo de 2022 Turismo Carr (1) · En cursiva: Temporada en curso (1) · En cursiva: Temporada en curso. (1) · Ensenada (1) · Ensenada (Argentina) (1) · Escobar (1) · Escuela Stihl Torneo de Verano (1) · Escuela Stihl Torneo Provincial (1) · español (1) · Española (1) · Estado (1) · Euro Fórmula 3000 (1) · Eurocup-3 - Winter Series (1) · European Le Mans Series - LMGT3 (1) · European Le Mans Series - LMGTE (1) · exfutbolista (1) · exmotociclista (1) · FARA Endurance Championship - MP-1B (1) · FARA USA - Endurance Championship - MP-1B (1) · Fiat Competizione (1) · Floresta (1) · Floresta (Buenos Aires) (1) · Force India F1 Team (1) · Force India Formula One Team (1) · Ford en Turismo Competición 2000 (1) · Ford Fairlane (1) · Ford Fairlane (Argentina) (1) · Ford Motor (1) · Ford Motor Company (1) · Fórmula 1 Mecánica Argentina, debut y subcampeonato (1) · Fórmula 1, 1 carrera (1) · Fórmula 1000 Argentina. (1) · Fórmula 2000 Italiana (1) · Formula 3000 (1) · Fórmula 3000 (1) · Fórmula 5000 Estadounidense (1) · Fórmula BMW Pacific (1) · Fórmula BMW Talent Cup (1) · Fórmula BMW Talent Cup, 2 carreras (1) · Fórmula BMW World Final (1) · Fórmula Chevrolet Uruguay (1) · Fórmula Dos Europea (1) · Fórmula Entrecor (1) · Fórmula Entrerriana, 6 carreras (1) · Fórmula Europa Boxer (1) · Fórmula Future Fiat, 2 carreras (1) · Fórmula Honda Argentina (1) · Fórmula Master BMW (1) · Fórmula Metropolitana, 1 carrera (1) · Fórmula Metropolitana, 5 carreras (1) · Fórmula Metropolitana, 6 carreras (1) · Fórmula Pilota China (1) · Fórmula Súper Renault Argentina (Tom's) (1) · Fórmula Súper Renault Argentina (Tom's) Copiloto de Turismo Carretera  (1) · Fórmula Súper Renault Argentina (Tom's) Top Race (Honda Prelude) (1) · Fórmula Súper Renault Argentina, 1 carrera (1) · Fórmula Toyota (1) · Fórmula Winter Series (1) · Fórmulas Renault y Súper Renault de Argentina (1) · Franck (1) · Franck (provincia de Santa Fe) (1) · franco (1) · Fuerza Libre (1) · Futbolista (1) · General (Intrepid) (1) · General (TRB) (1) · General Juan Madariaga (1) · General Madariaga (1) · General Roca (1) · General Roca (Córdoba) (1) · Gordini (1) · Gordini en Fórmula 1 (1) · GP Tito Urretavizcaya (1) · Graduados A (Birel Parilla) (1) · Gran Premio Argentino (1) · Gran Premio Argentino de Carretera (1) · Gran Premio de Alemania de 1954 (1) · Gran Premio de Argentina (1) · Gran Premio de Macao de 2017 (1) · Gran Premio de Macao de 2018 (1) · Gran Premio de Macao de 2024 (1) · Gran Premio de Macao de 2025 (1) · Gran turismo (automóvil) (1) · Granadero Baigorria (1) · Granadero Baigorria (Santa Fe) (1) · Grandes Premios de Fórmula 1 (1) · Grigor Dimitrov (1) · Grigori Dimitrov (1) · GT 2000, 1 carrera (1) · GT 2000, 3 carreras (1) · GT4 European Series (1) · Guatimozín (1) · Guatimozín (Argentina) (1) · hispano (1) · historial de la categoría (1) · historial de pilotos ganadores del TC (1) · Honda Prelude (1) · Honda Racing de Súper TC 2000 (1) · Honda TC 2000 (1) · Humboldt (1) · Humboldt (Argentina) (1) · Hurlingham (1) · Hurlingham (Buenos Aires) (1) · Hypercar (1) · Ibidem (1) · ICC Sudam (TRB IAME (1) · ICC Sudam (TRB IAME/MG) (1) · Idioma italiano (1) · IKA Torino (1) · Inmigración italiana en Argentina (1) · Invitado 2 hs. de Bs.As. y Rafaela 200 de TC (1) · Invitado 200 km de Buenos Aires (1) · Invitado 200 km de Buenos Aires (debut en TC 2000) (1) · Invitado 200 km de Buenos Aires de TC 2000 (1) · Invitado a competencias especiales del (1) · Invitado a competencias especiales del TC (1) · Invitado a la Carrera de la Historia del Top Race V6 (1) · Invitado a la Carrera de la Historia del TRV6 (1) · Invitado a las 2 horas de Buenos Aires del TC (1) · Invitado a los 1000 km de Bs. As. del TC (1) · Invitado a los 200 km (debut en STC 2000) (1) · Invitado Carrera de la Historia de TRV6 (1) · Invitado Carrera de la historia del Top Race (1) · Invitado Carrera de la historia del TR Junior (1) · Invitado Promocional Fiat 128 (1) · Invitado, 200 km de Buenos Aires (1) · Invitado, 200 km de Buenos Aires del Súper TC 2000 (1) · invitados (1) · italiano (1) · ítalo (1) · ítalo-argentino (1) · Ituzaingó (1) · Ituzaingó (Buenos Aires) (1) · Jesús María (1) · Jesús María (Argentina) (1) · Júnior (1) · Junior 125 cc. (1) · Junior 125cc. (1) · Juniors (1) · KTM Factory Racing (1) · Le Mans Hypercar (1) · Leones (1) · Leones (Córdoba) (1) · Libres 1000 ALMA (1) · Light (1) · Lobos (Buenos Aires) (1) · Lobos (ciudad) (1) · Lola (1) · Lola Cars (1) · Los Pinos (1) · Los Pinos (Buenos Aires) (1) · Lucas González (1) · Lucas González (Entre Ríos) (1) · Machismo (1) · machista (1) · Mar y Sierras "A" (1) · Master Junior Fórmula BMW España (1) · Mecánica Nacional Libre (PKC) (1) · Mecánica Nacional Light (PKC) (1) · Mejor Piloto de Misiones de Automovilismo Nacional (1) · Mejor Piloto de Misiones de Automovilismo Nacional (Nominado) (1) · Mercedes (1) · Mercedes (Buenos Aires) (1) · Mercedes Benz Premium Race (1) · Metropolitano ICA 100 (1) · Metropolitano ICA 100 Júnior (1) · Minardi F1 Team (1) · MINI Challenge Argentina (1) · Moctezuma (1) · Moctezuma (Buenos Aires) (1) · Monomarca 1100 del Atlántico, 1 carrera (1) · Monomarca 1100 del Atlántico, 3 carreras (1) · Monomarca 128 del NEA (1) · Monomarca Gol (Argentina) (1) · Monomarca Gol del Chubut. Campeón (1) · Monomarca Gol Neuquén (1) · Moreno (1) · Moreno (Buenos Aires) (1) · Morrison (1) · Morrison (Córdoba) (1) · Motociclista (1) · Motorsport Games de la FIA (1) · Motorsport Games de la FIA - Turismos (1) · MX del Sur de la República (1) · MX Invierno-Primavera (1) · MX Otoño-Invierno (1) · Nacionalidad estadounidense (1) · Navegante de (1) · Navegante de Juan María Traverso en TC (1) · NEA (1) · Neuquén (1) · Nissan (1) · Nordeste argentino (1) · North American Fran Am 2000 Pro Championship (1) · Nueve de Julio (Buenos Aires) (1) · Nürburgring Langstrecken-Serie (1) · Nürburgring Langstrecken-Serie - SP9 (1) · Orán (1) · Oro Consagración Mejor Piloto de Misiones de Automovilismo Nacional (G (1) · Osvaldo Abel López (1) · P.A.K.O., GP Tito Urretavizcaya (1) · Palermo (1) · Palermo (Buenos Aires) (1) · Partido amistoso (1) · Partido de Escobar (1) · partido de San Isidro (1) · Pergamino (ciudad) (1) · piloto de quads (1) · Plymouth (1) · Plymouth (automóviles) (1) · Porsche (1) · Porsche 963 (1) · Porsche Endurance Series - 4.0 (1) · Porsche Endurance Series - Challenge (1) · Porsche Supercup, 4 carreras (1) · Pro Mazda Winterfest (1) · Procar "B" (1) · Procar 2000 (1) · Procar 4000, 3 carreras (1) · Procar 4000, Clase A (1) · Profesional 125cc. (Intrepid) (1) · Promocional 850 Zonal Atlántica (1) · Prost (1) · Prost Grand Prix (1) · provincia de Córdoba (1) · provincia de La Rioja (1) · Provincia de La Rioja (Argentina) (1) · Provincia del Neuquén (1) · Rafaela 200 de (1) · Rally Argentino, Clase A6 (1) · Rally Argentino, Clase N4 (1) · Rally Argentino, Clase RC2 (1) · RAM Racing (1) · Ramallo (Buenos Aires) (1) · Ramallo (ciudad) (1) · Reconquista (1) · Reconquista (Santa Fe) (1) · Recreo (1) · Recreo (Santa Fe) (1) · Red Bull KTM Factory Racing (1) · Red Bull KTM Tech3 (1) · Renault Italiana (1) · Renault y Súper Renault Argentina (1) · Resistencia (Chaco) (1) · Resistencia (ciudad) (1) · Reynard (1) · Reynard Motorsport (1) · Río Negro (1) · Rivera (1) · Rivera (Buenos Aires) (1) · Rolex Sports Car Series (1) · Rolex Sports Car Series - DP (1) · Rosario (1) · Rosario (Argentina) (1) · Rufino (1) · Rufino (Santa Fe) (1) · San Diego (1) · San Diego (California) (1) · San Francisco (1) · San Francisco (California) (1) · San Luis (1) · San Luis (Argentina) (1) · San Pedro (Jujuy) (1) · San Ramón de la Nueva Orán (1) · San Vicente (1) · San Vicente (Buenos Aires) (1) · Santa Fe (Argentina) (1) · Santa Lucía (1) · Santa Lucía (Buenos Aires) (1) · Santa Rosa (1) · Santa Rosa (La Pampa) (1) · Seat León Eurocup (1) · Selectivo Petrobras (1) · semifinales (1) · Senado de la Nación Argentina (1) · senador nacional (1) · Senior (M101 Parilla MG) (1) · Senior Max (Kosmic IAME (1) · Senior Max (Kosmic IAME/MG y Birel IAME/MG) (1) · Sergio Alaux (1) · Sergio Ezequiel Alaux (1) · Sierra (1) · Sierras "A" (1) · speedway (1) · Speedway (motociclismo) (1) · Speedway PREMIER LEAGE (1) · Sport Prototipo Bahiense (1) · Stihl 50cc. (1) · Stock Car Brasil, invitado (1) · Subampeón categoría Sudam Seniors (1) · Subcampeón Categoría ProKart (1) · Subcampeón Club Argentino de Pilotos (1) · Subcampeón comodorense Stihl 50 cc. (1) · Subcampeón de Clase B del Turismo Nacional (1) · Subcampeón de Fórmula Chevrolet (1) · Subcampeón de Top Race Junior (1) · Subcampeón en (1) · Subcampeón en Top Race Junior (1) · Subcampeón Fórmula Metropolitana (1) · Subcampeón Nacional (1) · Subcampeón Supercart (1) · Subcampeón TC Pista (1) · Subcampeón TC Roqueperense (1) · Subcampeón TC Roqueperense, Clase C (1) · Subcampeón TC Rufinense (1) · Subcampeón Top Race Junior (1) · Subcampeón Top Race Series (1) · Subcampeón Top Race V6 (1) · Subcampeón Turismo Carretera (1) · Subcampeón Turismo Mejorado (1) · Subcampeón, Torneo Clausura 2010 de Top Race Series (1) · Subcampeona (1) · Subcampeonato (1) · subcampeonato en Metropolitano de la APK (1) · Sudam Júnior (1) · Súdam Júnior (1) · Sudam Pre Júnior (1) · Sudam Sénior (1) · Súdam Sénior (1) · Sudamericana (1) · Súper Cross de Cipolletti (1) · Súper Cross de Verano, categoría Lites (1) · Super Fórmula Japonesa (1) · Super GT Japonés - GT300 (1) · Súper PAKO (CRG RF) (1) · Súper Senior (Tony Kart CNK 125) (1) · Súper TC 2000 Top Race V6 (1) · Súper TC 2000 Turismo Nacional (1) · Súper TC 2000, 200 km de Buenos Aires, invitado (1) · Súper TC2000, 200 km de Buenos Aires. Invitado (1) · Supercar Región Pampeana (1) · Supercar Región Pampeana. Campeón (1) · Supercopa Porsche (1) · Superturismo Sudamericano, 1 carrera (1) · Swedish GT Series - GTA (1) · SxS (1) · SxS / SSV (1) · T1.1 (1) · TC 2000 General (1) · TC 2000 Privados (1) · TC 2000 Top Race V6 (1) · TC 2000, 2 carreras (1) · TC 2000, 200 km de Buenos Aires. Invitado (1) · TC 2000, 4 carreras (1) · TC 2000, 8 carreras (1) · TC 2000. 6 carreras (1) · TC 2000. Invitado, 2 carreras (1) · TC 4000 Santafesino, 1 carrera (1) · TC bonaerense (1) · TC Bonaerense (1) · TC Comodorense (1) · TC del Sudoeste (1) · TC Neuquino (1) · TC Pista (Ford Falcon) TC 2000 2 carreras (Chevrolet Astra) (1) · TC Pista, Debut y Subcampeonato (1) · Tc rioplatense (1) · TC Rioplatense (1) · TC Roqueperense, Clase GT (1) · TC Rufinense (1) · TC Zonal (1) · TC Zonal de FEDENOR (1) · TC2000, 1 carrera (1) · TC2000, 2 carreras (1) · Tech 3 (1) · Temporada 1961 del Campeonato del Mundo de Motociclismo (1) · Temporada 1963 del Campeonato del Mundo de Motociclismo (1) · Temporada 1965 de Turismo Carretera (1) · Temporada 1970 del Campeonato Europeo de Fórmula Dos (1) · Temporada 1971 del Campeonato Europeo de Fórmula Dos (1) · Temporada 1972 de Fórmula 1 (1) · Temporada 1972 del Campeonato Europeo de Fórmula Dos (1) · Temporada 1973 de Fórmula 1 (1) · Temporada 1974 de Fórmula 1 (1) · Temporada 1975 de Fórmula 1 (1) · Temporada 1977 de Fórmula 1 (1) · Temporada 1977 del Campeonato del Mundo de Motociclismo (1) · Temporada 1978 de Fórmula 1 (1) · Temporada 1979 de Fórmula 1 (1) · Temporada 1979 del Campeonato Europeo de Fórmula Dos (1) · Temporada 1980 de Fórmula 1 (1) · Temporada 1980 de Turismo Competición 2000 (1) · Temporada 1980 del Campeonato Mundial de Rally (1) · Temporada 1981 de Turismo Competición 2000 (1) · Temporada 1982 de Fórmula 1 (1) · Temporada 1984 de Turismo Competición 2000 (1) · Temporada 1985 del Campeonato Mundial de Rally (1) · Temporada 1987 del Campeonato del Mundo de Motociclismo (1) · Temporada 1987 del Campeonato Mundial de Rally (1) · Temporada 1988 del Campeonato Mundial de Rally (1) · Temporada 1989 del Campeonato Mundial de Rally (1) · Temporada 1997 de Fórmula 1 (1) · Temporada 1997 de Fórmula 3000 Internacional (1) · Temporada 1997 del Campeonato Sudamericano de Turismos (1) · Temporada 1998 de Fórmula 1 (1) · Temporada 1998 de Fórmula 3000 Internacional (1) · Temporada 1998 del Campeonato Sudamericano de Superturismos (1) · Temporada 2000 de Fórmula 1 (1) · Temporada 2000 de la CART World Championship Series (1) · Temporada 2001 de Fórmula 1 (1) · Temporada 2001 de Fórmula 3000 Internacional (1) · Temporada 2004 de Fórmula 3000 Internacional (1) · Temporada 2004 de la Champ Car World Series (1) · Temporada 2004 de Turismo Nacional (1) · Temporada 2004 del Campeonato del Mundo de Motociclismo (1) · Temporada 2005 de GP2 Series (1) · Temporada 2005 de Turismo Nacional (1) · Temporada 2006 de GP2 Series (1) · Temporada 2006 de Turismo Nacional (1) · Temporada 2007 de Turismo Nacional (1) · Temporada 2008 de Turismo Nacional (1) · Temporada 2009 de Turismo Nacional (1) · Temporada 2009 del Campeonato Mundial de Rally (1) · Temporada 2010 de Turismo Nacional (1) · Temporada 2010 del Campeonato Mundial de Turismos (1) · Temporada 2011 de Top Race (1) · Temporada 2012 de Auto GP World Series (1) · Temporada 2013 de Turismo Carretera (1) · Temporada 2013 de Turismo Nacional (1) · Temporada 2013 del Campeonato Mundial de Turismos (1) · Temporada 2014 de Fórmula 1 (1) · Temporada 2014 de GP2 Series (1) · Temporada 2014 de Turismo Nacional (1) · Temporada 2016 de Turismo Nacional (1) · Temporada 2017 de GP3 Series (1) · Temporada 2017 del Campeonato Mundial de Resistencia de la FIA (1) · Temporada 2018 de GP3 Series (1) · Temporada 2018 de la Copa Mundial de Turismos (1) · Temporada 2018-19 del Campeonato Mundial de Resistencia de la FIA (1) · Temporada 2019 de Eurofórmula Open (1) · Temporada 2019 del Super GT Japonés (1) · Temporada 2020 de Stock Car Brasil (1) · Temporada 2020 de TC 2000 (1) · Temporada 2020 del Campeonato de Super Fórmula Japonesa (1) · Temporada 2021 de Stock Car Pro Series (1) · Temporada 2021 del Campeonato de Super Fórmula Japonesa (1) · Temporada 2022 de USF Juniors (1) · Temporada 2022 del Campeonato Mundial de Rally Raid (1) · Temporada 2022 del Campeonato Mundial de Resistencia de la FIA (1) · Temporada 2023 de Fórmula 1 (1) · Temporada 2023 del Campeonato Mundial de Rally Raid (1) · Temporada 2024 de Fórmula 1 (1) · Temporada 2024 de Fórmula Winter Series (1) · Temporada 2025 de Fórmula 1 (1) · Temporada 2025 del Campeonato de Super Fórmula Japonesa (1) · Temporada 2025 del Campeonato Mundial de Rally Raid (1) · Temporada 2026 de Fórmula 1 (1) · Temporada 2026 de TCR World Tour (1) · Temporada 2026 del Campeonato de Super Fórmula Japonesa (1) · Tercer puesto (1) · Tigre (Buenos Aires) (1) · Tigre (ciudad) (1) · tiro (1) · Tiro deportivo (1) · título=Profile of Lucio ALVAREZ - Overdrive Racing (1) · TN APAT Clase 2 (1) · TN APAT Clase 3 (1) · Top Race V6 Torneo Clausura 2010 (1) · Top Race V6 Turismo Competición 2000 (1) · Top Race V6, 3 competencias (1) · Top Race V6, 5 carreras (1) · Top Race V6<br>Torneo Clausura (1) · Top Race, 4 carreras (1) · Torino (1) · Torneo Apertura Desafío Focus (1) · Torneo Clausura (1) · Torneo Clausura 2010 de Top Race Junior (1) · Torneo Clausura 2010 de Top Race Series (7.º) (1) · Torneo Clausura 2010 de Top Race V6 (1) · Torneo Clausura 2010 del TRV6 (1) · Torneo Clausura de (1) · Torneo Clausura de Top Race Junior (1) · Torneo Clausura de Top Race V6 (1) · Torneo Clausura de TR Junior (1) · Torneo Clausura de TR Junior/Series (1) · torneo de invitados (1) · Torneo de Invitados de TCM (1) · Torneo de pilotos invitados (1) · Torneo Lizeviche-Galíndez de Turismo Carretera (1) · Torneo Nacional Desafío Focus (1) · Torneo Provincial Juniors (1) · Toyota Gazoo Racing Argentina (1) · Toyota Gazoo Racing Europe GmbH (1) · Toyota Gazoo Racing Sudafrica (1) · Toyota Motorsport GmbH (1) · Trans-Am (1) · Trans-Am - TA2 Series (1) · Trofeo FISA Fórmula 2000 (1) · Truckers (1) · TRV6, 2 carreras (1) · TRV6, Carrera de la historia (1) · TRV6, Carrera de la Historia (1) · TRV6, Carrera de la historia Invitado (1) · Turismo 4000 Argentino, 2 carreras (1) · Turismo 4000 Argentino. Campeón (1) · Turismo Anexo J (1) · Turismo Carretera - Fórmula A (1) · Turismo Carretera - Fórmula B (1) · Turismo Carretera (Dodge Cherokee-Torino Cherokee) Top Race V6 (Volksw (1) · Turismo Carretera (Dodge Cherokee) TC 2000 1 carrera (Volkswagen Bora) (1) · Turismo Carretera Clase 3 del Turismo Nacional (1) · Turismo Carretera Clase 3 del Turismo Nacional Súper TC 2000 (1) · Turismo Carretera invitados (1) · Turismo Carretera TN APAT Clase 3 (1) · Turismo Carretera Top Race V6 (1) · Turismo Carretera, 1 carrera (1) · Turismo Carretera, 4 carreras (1) · Turismo Competición 2000 y Supercart (1) · Turismo Competición 2000, 1 carrera (1) · Turismo Competición 2000, 5 carreras (1) · Turismo Competición 2000, 6 carreras (1) · Turismo Competición C 2000 (1) · Turismo Internacional Clase Súper (1) · Turismo Internacional, invitado (1) · Turismo Mejorado Clase D (1) · Turismo Nacional - Clase D (1) · Turismo Nacional C3 (1) · Turismo Nacional Clase D (1) · Turismo Nacional TC Pista (1) · Turismo Nacional, 2 carreras (1) · Turismo Nacional, 4 carreras (1) · único título de campeón en 1984 (1) · url=https: (1) · USF Juniors (1) · vela (deporte) (1) · velerista (1) · Verónica (1) · Verónica (Punta Indio) (1) · Villa Mercedes (1) · Villa Mercedes (San Luis) (1) · Villalonga (1) · Villalonga (Buenos Aires) (1) · Volkswagen Bora (1) · W2RC RallyGP (1) · WeatherTech SportsCar Championship (1) · WeatherTech SportsCar Championship - DPi (1) · World Rally Championship, Grupo N4 (1) · World Series Fórmula V8 3.5 (1) · World Tour (1) · www.worldrallyraidchampionship.com (1) · X30 Senior (Praga Parilla) (1) · X30 Senior (Zanardi Parilla) (1) · Zonal del Atlántico Monomarca 1100 (1)

## Títulos a revisar

Los títulos contados desde las listas no coinciden con lo que dice la ficha del piloto (sólo categorías de la lista cerrada). No se excluyen; quedan los de las listas.

### La ficha dice más que las listas

Resolución caso por caso en `scripts/juego-resoluciones-titulos.json` (clave `slug|categoría`). "pendiente" = todavía sin explicar.

| Piloto | Diferencia | Campo de la ficha | Títulos contados | Resolución | Fuente |
|---|---|---|---|---|---|
| Fabián Flaqué | TC2000: listas 0, ficha 1 | TC 2000 → 1 (Pilotos Privados 2000) | — | La ficha dice '1 (Pilotos Privados 2000)': es un título de la clase de pilotos privados, no del campeonato general; el campeón 2000 del TC2000 es otro piloto en history.json. | https://es.wikipedia.org/wiki/Fabi%C3%A1n_Flaqu%C3%A9 |
| Facundo Della Motta | TC2000: listas 0, ficha 1 | TC 2000 → 1 (2014) | — | El título 2014 es de la segunda divisional 'TC2000 (2012-)'; el campeón del Súper TC2000 2014 fue Néstor Girolami. | https://en.wikipedia.org/wiki/TC2000_Championship |
| Manuel Luque | TC2000: listas 0, ficha 1 | TC 2000 → 1 (2017) | — | El título 2017 es del 'TC2000 (2012-)', la segunda divisional con los autos viejos, que no es el Súper TC2000 ni el TC2000 original. El campeón del Súper TC2000 2017 fue Facundo Ardusso. | https://en.wikipedia.org/wiki/TC2000_Championship |
| Matías Milla | TC2000: listas 0, ficha 1 | TC 2000 → 1 (2013) / Súper TC 2000 → — | — | El título 2013 es de la segunda divisional 'TC2000 (2012-)'; el campeón del Súper TC2000 2013 fue Matías Rossi. | https://en.wikipedia.org/wiki/TC2000_Championship |

### Otras diferencias (ficha sin dato, o las listas dicen más)

| Piloto | Diferencias | Títulos contados |
|---|---|---|
| Adrián Hang | TN: listas 1, ficha sin dato | TN 1999 |
| Adrián Percaz | TN: listas 2, ficha sin dato | TN 2010, TN 2015 |
| Agustín Canapino | TC Pista: listas 1, ficha sin dato; Top Race: listas 7, ficha sin dato | TC Pista 2008, TC 2010, Top Race 2010, Top Race 2011, Top Race 2012, Top Race 2013, Top Race 2014, TC2000 2016, Top Race 2016, TC 2017, Top Race 2017, TC 2018, TC 2019, TC2000 2021, TC 2025 |
| Alberto Rodriguez Larreta | TN: listas 1, ficha sin dato | TN 1969 |
| Alejandro Patronelli | Dakar: listas 2, ficha sin dato | Dakar 2011, Dakar 2012 |
| Ángel Lo Valvo | TC: listas 1, ficha sin dato | TC 1939 |
| Ángel Monguzzi | TN: listas 1, ficha sin dato | TN 1968 |
| Antonio Aventín | TC: listas 1, ficha sin dato | TC 1981 |
| Camilo Echevarría | TC Pista: listas 1, ficha sin dato | TC Pista 2014 |
| Carlos Alberto Reutemann | TN: listas 2, ficha sin dato | TN 1966, TN 1967 |
| Carlos Okulovich | TN: listas 1, ficha sin dato | TN 2010 |
| Carlos Pairetti | TC: listas 1, ficha sin dato | TC 1968 |
| Carlos Ruesch | TN: listas 1, ficha sin dato | TN 1966 |
| Dante Emiliozzi | TC: listas 4, ficha sin dato | TC 1962, TC 1963, TC 1964, TC 1965 |
| Diego Javier Azar | Top Race: listas 3, ficha sin dato | Top Race 2021, Top Race 2022, Top Race 2023 |
| Eduardo José Copello | TC: listas 2, ficha sin dato | TC 1967, TC 1970 |
| Eduardo Ramos | TC: listas 1, ficha sin dato | TC 1994 |
| Emanuel Moriatis | TC: listas 1, ficha sin dato; TN: listas 2, ficha sin dato | TC 2009, TN 2012, TN 2016 |
| Emiliano Spataro | Top Race: listas 2, ficha sin dato | Top Race 2007, Top Race 2008 |
| Ernesto Bessone | TC: listas 1, ficha sin dato; Top Race: listas 1, ficha sin dato; TN: listas 1, ficha sin dato | TC2000 1996, TC 2003, TN 2003, Top Race 2004 |
| Ernesto Celestino Bessone | TN: listas 1, ficha sin dato | TN 1985 |
| Ernesto Soto | Rally: listas 3, ficha sin dato | Rally 1980, Rally 1984, Rally 1987 |
| Esteban Tuero | TN: listas 1, ficha sin dato | TN 2008 |
| Fabián Yannantuoni | TN: listas 1, ficha sin dato | TN 2011 |
| Facundo Aldrighetti | Top Race: listas 1, ficha sin dato | Top Race 2025 |
| Facundo Ardusso | TC2000: listas 2, ficha sin dato | TC2000 2017, TC2000 2018 |
| Facundo Chapur | TN: listas 3, ficha sin dato | TN 2012, TN 2013, TN 2015 |
| Federico Villagra | Rally: listas 21, ficha 0 | Rally 2002, Rally 2003, Rally 2004, Rally 2004, Rally 2006, Rally 2006, Rally 2007, Rally 2007, Rally 2008, Rally 2008, Rally 2009, Rally 2009, Rally 2010, Rally 2010, Rally 2011, Rally 2011, Rally 2012, Rally 2012, Rally 2013, Rally 2013, Rally 2018 |
| Francisco Alcuaz | TN: listas 2, ficha sin dato; Rally: listas 2, ficha sin dato | TN 1978, Rally 1980, Rally 1981, TN 1981 |
| Guillermo Maldonado | TC2000: listas 1, ficha sin dato | TC2000 1994 |
| Héctor Luis Gradassi | TC: listas 4, ficha sin dato | TC 1972, TC 1974, TC 1975, TC 1976 |
| Hugo Olmi | TN: listas 1, ficha sin dato | TN 1984 |
| Jonatan Castellano | TC Pista: listas 1, ficha sin dato; TN: listas 1, ficha sin dato | TC Pista 2005, TN 2022 |
| Jorge Emilio Serafini | TN: listas 1, ficha sin dato | TN 1980 |
| Jorge Omar del Río | TC2000: listas 3, ficha sin dato | TC2000 1980, TC2000 1981, TC2000 1982 |
| Jorge Recalde | TN: listas 1, ficha sin dato; Rally: listas 6, ficha sin dato | TN 1974, Rally 1982, Rally 1983, Rally 1985, Rally 1999, Rally 2000, Rally 2000 |
| José Hernán Palazzo | TC Pista: listas 1, ficha sin dato | TC Pista 2024 |
| José Manuel Urcera | TC: listas 1, ficha 0 | TN 2019, TN 2020, TC 2022 |
| José Migliore | TN: listas 3, ficha sin dato | TN 1962, TN 1970, TN 1971 |
| Juan Bautista De Benedictis | TC Pista: listas 1, ficha sin dato | TC Pista 2006 |
| Juan Gálvez | TC: listas 9, ficha sin dato | TC 1949, TC 1950, TC 1951, TC 1952, TC 1955, TC 1956, TC 1957, TC 1958, TC 1960 |
| Juan Manuel Bordeu | TC: listas 1, ficha sin dato | TC 1966 |
| Juan Manuel Fangio | TC: listas 2, ficha sin dato | TC 1940, TC 1941, F1 1951, F1 1954, F1 1955, F1 1956, F1 1957 |
| Juan Manuel Silva (automovilista) | TC: listas 1, ficha sin dato; TC2000: listas 1, ficha sin dato | TC2000 1999, TC 2005 |
| Julián Santero | TC: listas 1, ficha sin dato; TN: listas 2, ficha sin dato | TN 2021, TC 2024, TN 2025 |
| Julio Catalán Magni | TN: listas 1, ficha sin dato | TN 1997 |
| Julio Pardo | TN: listas 1, ficha sin dato | TN 1979 |
| Leonel Pernía | TC2000: listas 4, ficha sin dato; TN: listas 2, ficha sin dato | TN 2018, TC2000 2019, TC2000 2022, TC2000 2023, TN 2023, TC2000 2024 |
| Lionel Ugalde | TC Pista: listas 1, ficha sin dato | TC Pista 2003 |
| Lucas Armellini | TN: listas 1, ficha sin dato | TN 2001 |
| Luis José Di Palma | Top Race: listas 1, ficha sin dato | Top Race 2024 |
| Marcelo Bugliotti | TN: listas 1, ficha sin dato | TN 2009 |
| Marcos Ligato | Rally: listas 6, ficha 0 | Rally 2005, Rally 2014, Rally 2015, Rally 2016, Rally 2017, Rally 2022 |
| Marcos Patronelli | Dakar: listas 3, ficha sin dato | Dakar 2010, Dakar 2013, Dakar 2016 |
| Mariano Werner | TN: listas 1, ficha sin dato | TN 2017, TC 2020, TC 2021, TC 2023 |
| Mario Gayraud | TC2000: listas 1, ficha sin dato | TC2000 1984 |
| Matías Rossi | TC2000: listas 6, ficha 0 | TC2000 2006, TC2000 2007, TC2000 2011, TC2000 2013, TC 2014, TN 2014, Top Race 2019, TC2000 2020, Top Race 2020, TC2000 2025 |
| Nadia Cutro | Rally: listas 1, ficha 0 | Rally 2017 |
| Nasif Estéfano | TC: listas 1, ficha sin dato; TN: listas 1, ficha sin dato | TN 1965, TC 1973 |
| Néstor Girolami | TC2000: listas 2, ficha sin dato | TC2000 2014, TC2000 2015 |
| Nicolás Pezzucchi | TC Pista: listas 1, ficha sin dato | TC Pista 2013 |
| Nicolás Vuyovich | TN: listas 2, ficha sin dato | TN 2000, TN 2002 |
| Norberto Fontana | TC: listas 1, ficha sin dato; TC2000: listas 2, ficha sin dato | TC2000 2002, TC 2006, TC2000 2010 |
| Omar Martínez | TC2000: listas 1, ficha sin dato; Top Race: listas 3, ficha sin dato | Top Race 1997, TC2000 1998, Top Race 2000, TC 2004, Top Race 2006, TC 2015 |
| Oscar Alfredo Gálvez | TC: listas 5, ficha sin dato | TC 1947, TC 1948, TC 1953, TC 1954, TC 1961 |
| Oscar Angeletti | TC: listas 1, ficha sin dato | TC 1986 |
| Oscar Aventín | TC: listas 2, ficha sin dato | TC 1991, TC 1992 |
| Oscar Castellano | TC: listas 3, ficha sin dato | TC 1987, TC 1988, TC 1989 |
| Osvaldo Abel López | TC2000: listas 1, ficha sin dato | TC2000 1979 |
| Próspero Bonelli | TC Pista: listas 1, ficha sin dato | TC Pista 2007 |
| Ricardo Zunino | TN: listas 2, ficha sin dato | TN 1975, TN 1976 |
| Roberto Mouras | TC: listas 3, ficha sin dato | TC 1983, TC 1984, TC 1985 |
| Roberto Rivas | TC Pista: listas 1, ficha sin dato | TC Pista 1998 |
| Rubén Daray | TC2000: listas 1, ficha sin dato; TN: listas 1, ficha sin dato | TN 1977, TC2000 1985 |
| Rubén Luis Di Palma | TC: listas 2, ficha sin dato; TC2000: listas 1, ficha sin dato | TC 1970, TC 1971, TC2000 1983 |
| Sergio Colosi | Rally: listas 1, ficha sin dato | Rally 1983 |
| Silvio Oltra | TC2000: listas 1, ficha sin dato | TC2000 1987 |
| Tobías Martínez | TC Pista: listas 1, ficha sin dato | TC Pista 2023 |
| Tomás Urretavizcaya | TC Pista: listas 1, ficha sin dato | TC Pista 2009 |
| Walter Hernández | TC: listas 1, ficha sin dato | TC 1993 |

## Campeones sin asignar

Campeones de las listas que no se pudieron asignar con seguridad a un piloto de la base (no están entre los candidatos o el nombre es ambiguo). Cada fila es un título que no se cuenta a nadie.

| Categoría | Año | Nombre en la lista | Enlace | Motivo |
|---|---|---|---|---|
| Rally | 1981 | Marcelo Raies |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1981 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Raúl Bustos |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Antonio Buigas |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Diego Fenoglio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Carlos Mastromarino |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Dardo Nieto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1982 | Carlos Céiz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1983 | Carlos Céliz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1984 | José Cecchetto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1985 | Hugo Rosso |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1985 | Miguel Torres |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1986 | Rudy Trossero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1986 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1987 | José Luis Grasso |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1987 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1988 | Guillermo Romero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1988 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1989 | Guillermo Romero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1989 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1990 | Jorge Seleme |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1990 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1991 | Pablo Dávila |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1991 | Osvaldo Hintermeister |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1992 | Fernando Scarlatta |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1992 | Gonzalo Barceló (h) |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1993 | Gabriel Velasco |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1993 | Gonzalo Barceló (h) |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1993 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1994 | Flavio Galindo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1994 | Hugo Rosso |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1995 | Gerardo Klus |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1995 | Luis Oxoteguy |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1996 | Heriberto Ortíz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1996 | Guillermo Romero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1996 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1996 | Juan Perea |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1996 | Roberto Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Gerardo Ortíz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Guillermo Romero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Roberto Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Víctor Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Oscar Chiaramello |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1997 | Walter Suriani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Andrés Giménez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Jorge Tarazi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Roberto Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Sergio Germani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Víctor Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Raúl Sufán |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1998 | Walter Suriani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Heriberto Ortíz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Fabiá El Aín |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Roberto Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Luis Coronel |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Lino Sisterna |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 1999 | Walter Suriani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2000 | Diego Koppoushian |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2000 | Federico Schmid |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2000 | Ricardo Luna |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2000 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2001 | Sergio Germani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2001 | Claudio Menzi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2001 | Alejandro Basavilbaso |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2001 | Federico Schimd |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2001 | Alberto Pérez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2002 | Sergio Germani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2002 | Juan Manuel Solís |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2002 | Juan Pablo Pelaez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Sergio Baroo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Juan Manuel Solís |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Javier Badra |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Luciano Bernardi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Juan Pablo Raies |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2003 | Roberto Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2004 | Jorge Marcheo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2004 | Germán Boaglio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2004 | Javier Fernández |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2004 | Luciano Bernardi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2004 | Juan Pablo Raies |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Guillermo Albertengo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Roberto Castro |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Ricardo Albertengo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Alejandro Cancio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Luis Pérez Companc |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2005 | Luis Pérez Companc |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2006 | Sebastián Abramian |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2006 | Pablo Cacopardo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2006 | Omar Yoma |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2007 | Darío Hernández |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2007 | Maximiliano Debasa |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2007 | Nicolás Carlomagno |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2007 | Víctor Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2008 | Agustín Elvira |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2008 | Darío Hernández |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2008 | Sebastián Abramian |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2008 | Nicolás Carlomagno |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2009 | Luis Gius |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2009 | Manuel Machinea |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2009 | Elder Tasca |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2009 | Miguel Baldon |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2010 | César Montecino |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2010 | Roberto Jauregui |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2010 | Álvaro Marchetto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2010 | Juan Gil De Marchi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2011 | Darío Sambueza |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2011 | Carlos Cataldo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2011 | José Cantón |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2012 | Luciano Bonomi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2012 | Juan Carlos Alonso |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2013 | Samir Assaf |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2013 | Diego Grion |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2013 | Omar Kovacevich |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2014 | Raúl Racca |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2014 | Favio Grinovero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2014 | Álvaro Marchetto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2015 | Pablo Peláez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2015 | Favio Grinovero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2015 | Omar Kovacevich |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2016 | Juan Manuel González |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2016 | Pablo Peláez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2016 | Antonio Carrera |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2017 | Mauro Debasa |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2017 | Luis Arceluz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2018 | Adrián Sánchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2018 | Mariano Preto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2018 | Luis Arceluz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2018 | Javier Castro |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2019 | Adrián Sanchez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2019 | Lucas Machado |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2019 | Antonio Prevedelo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2019 | Martin Suriani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2019 | Miguel Baldoni |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2020 | Martin Maisonnave |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2020 | Paulo Soria |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2020 | Nicolás Díaz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2020 | Martin Scuncio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2021 | Gabriel Cerutti |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2021 | Victorio Ballay |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2021 | Antonio Prevedello |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2021 | Geronimo Padilla |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2021 | Alejandro Cancio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2022 | Manuel Torras |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2022 | Victorio Ballay |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2022 | Miguel Reginato |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2022 | Gastón Pasten |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2023 | Fernando Daparte |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2023 | Martín Maisonnave |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2023 | Ernesto Lord |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2023 | Hernán Kim |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2023 | Martín Scuncio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2024 | Guillermo Ambrosio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2024 | Pablo Peláez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2024 | Nicolás González |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2024 | Nicolás de la Vega |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2024 | Nicolás Díaz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2025 | Santiago Sabbatini |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2025 | Nicolás González |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2025 | Julián Larrosa |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2025 | Rubén Montoro |  | no está entre los pilotos argentinos de Wikidata con artículo |
| Rally | 2025 | Miguel Baldoni |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC | 1937 | Eduardo Pedrazzini |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC | 1938 | Ricardo Risatti I |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC | 1942 | Desierto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC | 1980 | Francisco Espinosa | Francisco César Espinosa | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 1995 | Rubén Muñiz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 1996 | Guillermo Tambucci |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 1997 | José Luis Firmani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 1999 | Fabrizio Benedetti |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2000 | Alejandro Ramón |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2001 | Javier Bernardini | Javier Bernardini | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2002 | José Savino | José Savino | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2011 | Leonel Sotro | Leonel Sotro | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2012 | Luciano Ventricelli | Luciano Ventricelli | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2018 | Juan Cruz Benvenuti | Juan Cruz Benvenuti | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2019 | Diego Ciantini | Diego Ciantini | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2020 | Ayrton Londero | Ayrton Londero | no está entre los pilotos argentinos de Wikidata con artículo |
| TC Pista | 2026 |  |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1961 | Heriberto Bohnen |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1961 | Vicente Formisano |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1962 | Remigio Caldara |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1962 | Gonzalo Gainza Paz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1963 | Domingo López Oribe |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1963 | Ernesto Santamarina |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1964 | José Calduch |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1965 | Rogelio Scaramella |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1966 | Rogelio Scaramella |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1967 | Rogelio Scaramella |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1967 | Danilo Bonamicci |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1968 | Norberto Castañón |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1969 | Emilio Parisi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1969 | Norberto Castañón |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1971 | Eduardo Giordano |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1971 | Danilo Bonamici |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1972 | Aldo Caldarella |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1972 | Francisco Mayorga |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1973 | José Carlomagno |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1973 | Francisco Mayorga |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1974 | Luis Macri |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1975 | Juan Pablo Zampa |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1976 | Jorge Spinetto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1977 | Jorge Spinetto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1978 | Carlos Garro |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1979 | Carlos Garro |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1980 | Juan Carlos Rizzuto |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1981 | Marcelo Raies |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1981 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Julio Pardo-Gustavo Der Ohanessian |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Jorge Bescham |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Daniel Mustafá-Ángel Monguzzi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Francisco Mayorga |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Jorge Cecchetto-Elvio Borgioli |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Alberto Baldinelli |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | Néstor Percaz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1982 | José Fortunato |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1983 | Carlos Rosati |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1983 | Carlos Zabala |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1983 | Arnoldo Capra |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1984 | José Cano |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1985 | Eduardo García Gómez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1986 | Omar Darío Bonomo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1986 | Jorge Maggi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1986 | Oscar Fineschi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1987 | Omar Darío Bonomo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1987 | Jorge Maggi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1987 | Jorge Guiral |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1988 | Ernesto Rodríguez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1988 | Fernando Adba |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1988 | Oscar Fineschi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1989 | Ricardo Albertengo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1989 | Jorge Eidilstein |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1990 | Gerardo del Campo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1991 | Gerardo del Campo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1992 | Omar Bonomo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1992 | Pablo Rafú |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1993 | Gerardo del Campo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1993 | Norberto della Santina |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1994 | Gerardo del Campo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1994 | Carlos Rossetti |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1995 | Carlos Míguez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1995 | Diego Ponte |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1996 | Hugo Lepphaille |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1996 | Omar Suriani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1997 | Norberto della Santina |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1998 | Claudio Bisceglia |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1998 | Omar Bonomo |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 1999 | Oscar Canela |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2000 | Walter Tanoni |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2001 | Javier Romera |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2002 | Néstor Percaz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2003 | Néstor Percaz |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2004 | Pablo Redolfi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2006 | Iván Saturni |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2006 | Hugo Lepphaille |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2007 | Joaquin Volpi |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2008 | Leandro Vallasciani |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2009 | Ivan Ciccarelli |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2011 | Bruno Bosio |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2013 | Matias Machuca |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2014 | Hanna Abdallah |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2017 | Alejandro Bucci |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2019 | Ever Franetovich |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2021 | Emanuel Abdala |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2022 | Matías Cravero |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2023 | Thiago Martínez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2024 | Thiago Martínez |  | no está entre los pilotos argentinos de Wikidata con artículo |
| TN | 2025 | Bautista Damiani |  | no está entre los pilotos argentinos de Wikidata con artículo |

## Campeones asignados a pilotos que quedaron excluidos

Estos pilotos tienen títulos en las listas pero no entraron a la base por el motivo indicado. Si se corrige el dato, entran solos.

| Piloto | Títulos | Motivo |
|---|---|---|
| Eduardo Rodríguez Canedo | TN 1964, TN 1967 | Wikidata sin lugar de nacimiento |
| Franco Girolami | Top Race 2018 | corre2026 indeterminable: tiene Top Race/Mundial de Turismos (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2024) |
| Gastón Perkins | TC 1969, TN 1963, TN 1964, TN 1965 | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Juan Bautista Alberdi, provincia de Buenos Aires) |
| Jorge Martínez Boero | TC 1982 | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: La Plata) |
| José María López | TC2000 2008, TC2000 2009, Top Race 2009, TC2000 2012, Mundial de Turismos 2014, Mundial de Turismos 2015, Mundial de Turismos 2016, Resistencia 2020, Resistencia 2021 | corre2026 indeterminable: tiene Top Race/Mundial de Turismos/Resistencia (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2026) |
| Juan Pedro Heguy | TN 2004, TN 2005 | provincia de Wikipedia sin resolver: lugar contradictorio en el artículo ([[Villalonga]]→Exterior, [[Provincia de Buenos Aires]]→Buenos Aires) |
| Maximiliano Juan | TC Pista 2004 | Wikidata sin lugar de nacimiento |
| Nicolás Cotignola | TC Pista 2016 | corre2026 ambiguo (ver reporte) |
| Patricio Di Palma | TN 2005 | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Arrecifes, Provincia de Buenos Aires) |
| René Zanatta | TN 1990, TN 1991 | provincia distinta: Wikidata Santa Fe, Wikipedia Entre Ríos (ficha: Rosario del Tala, Provincia de Entre Ríos) |
| Rodolfo De Álzaga | TC 1959 | Wikidata sin lugar de nacimiento |
| Rosmualdo Visintini | TN 1965, TN 1966, TN 1967, TN 1968, TN 1970 | Wikipedia sin año de nacimiento legible |

## corre2026 investigado a mano

Aplicados desde `scripts/juego-correcciones.json` (cada uno con su fuente):

| Piloto | corre2026 | Motivo de la consulta | Fuente | Nota |
|---|---|---|---|---|
| Julio Catalán Magni | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Lucio Álvarez | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Ianina Zanazzi | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Marcelo Bugliotti | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Marcos Di Palma | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Mariano Altuna | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Nicolás Iglesias | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Oscar Sánchez | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Damián Fineschi | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Facundo Della Motta | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Humberto Krujoski | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Ignacio Char | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Luciano Farroni | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Jeremías González Ferioli | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Kevin Benavídes | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Pablo Copetti | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Baltazar Leguizamón | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Maximiliano Valle | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Franco Caimi | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Nicolás Cavigliasso | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Facu Regalia | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Alejandro Patronelli | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Sebastián Halpern | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Marcos Patronelli | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Walter Hernández | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Ernesto Bessone | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Rubén Salerno | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Martín Ponte | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Gonzalo Montenegro | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Manuel Andújar | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Luciano Benavides | true | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | Figura en la lista de participantes del Rally Dakar 2026 (enero de 2026). |
| Ricardo Risatti III | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Marcelo Ciarrocchi | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Christian Dose | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| José Hernán Palazzo | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Matías Rodríguez | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Miguel Ángel Guerra | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Juan Manuel Silva (automovilista) | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 ; https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la lista de participantes del Dakar 2026 ni en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Lucas Benamo | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Daniel Cingolani | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Emanuel Moriatis | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Guillermo Ortelli | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Nicolás Palau | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Juan Daglio | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Juan Cruz Yacopini | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Juan Bautista De Benedictis | false | sin datos 2026 | https://es.wikipedia.org/wiki/Anexo:Temporada_2026_de_Top_Race | No figura en la nómina de Top Race 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |
| Orlando Terranova | false | sin datos 2026 | https://es.wikipedia.org/wiki/Rally_Dakar_de_2026 | No figura en la lista de participantes del Dakar 2026 (consultadas el 17/10/2026) y no tiene otra categoría fuera de nuestros datos. |

Siguen afuera por corre2026 indeterminable (categorías sin datos 2026 en el repo y sin confirmación):

| Piloto | Categorías sin datos | Último año conocido |
|---|---|---|
| Franco Girolami | Top Race, Mundial de Turismos | 2024 |
| José María López | Top Race, Mundial de Turismos, Resistencia | 2026 |
| José Manuel Sapag | Top Race, Mundial de Turismos | 2023 |
| Nicolás Varrone | Resistencia | 2026 |
| Matías Russo | Resistencia | ? |
| Ricardo Juncos | IndyCar | ? |

## Campeones extra (scripts/juego-campeones-extra.json)

Campeones que faltan en src/data/history.json (que no se toca) o que no son de las listas de scripts/build-juego-pilotos.mjs. Cada fila tiene al menos dos fuentes que coinciden. El script los suma a los títulos.

| Categoría | Año | Piloto | Nota | Fuentes |
|---|---|---|---|---|
| TC | 1980 | Francisco Espinosa | campeonato 1979-80 (history.json sólo toma años de 4 dígitos) | https://es.wikipedia.org/wiki/Turismo_Carretera ; https://en.wikipedia.org/wiki/Turismo_Carretera |
| TC | 1981 | Antonio Aventín | campeonato 1980-81 (distinto del Torneo Lizeviche-Galíndez 1981 de Mouras) | https://es.wikipedia.org/wiki/Turismo_Carretera ; https://en.wikipedia.org/wiki/Turismo_Carretera |
| TC2000 | 2012 | José María López | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2013 | Matías Rossi | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2014 | Néstor Girolami | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2015 | Néstor Girolami | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2016 | Agustín Canapino | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2017 | Facundo Ardusso | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2018 | Facundo Ardusso | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2019 | Leonel Pernía | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2020 | Matías Rossi | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| TC2000 | 2021 | Agustín Canapino | Súper TC2000 (era 2012-2021, que history.json no trae) | https://es.wikipedia.org/wiki/S%C3%BAper_TC2000 ; https://en.wikipedia.org/wiki/TC2000_Championship |
| Mundial de Turismos | 2014 | José María López | campeón de pilotos del WTCC | https://en.wikipedia.org/wiki/World_Touring_Car_Championship ; https://es.wikipedia.org/wiki/Jos%C3%A9_Mar%C3%ADa_L%C3%B3pez |
| Mundial de Turismos | 2015 | José María López | campeón de pilotos del WTCC | https://en.wikipedia.org/wiki/World_Touring_Car_Championship ; https://es.wikipedia.org/wiki/Jos%C3%A9_Mar%C3%ADa_L%C3%B3pez |
| Mundial de Turismos | 2016 | José María López | campeón de pilotos del WTCC | https://en.wikipedia.org/wiki/World_Touring_Car_Championship ; https://es.wikipedia.org/wiki/Jos%C3%A9_Mar%C3%ADa_L%C3%B3pez |
| Resistencia | 2020 | José María López | campeón de pilotos del WEC 2019-20 (Toyota #7 con Conway y Kobayashi) | https://en.wikipedia.org/wiki/List_of_FIA_World_Endurance_champions ; https://es.wikipedia.org/wiki/Campeonato_Mundial_de_Resistencia_de_la_FIA |
| Resistencia | 2021 | José María López | campeón mundial de pilotos de Hypercar 2021 (Toyota #7 con Conway y Kobayashi) | https://en.wikipedia.org/wiki/List_of_FIA_World_Endurance_champions ; https://es.wikipedia.org/wiki/Campeonato_Mundial_de_Resistencia_de_la_FIA |
| Top Race | 2010 | Guido Falaschi | TRV6 2010 se dividió en dos campeonatos: Copa América 2010 (Falaschi) y Torneo Clausura 2010 (Canapino); ambos figuran como títulos en la lista de campeones | https://es.wikipedia.org/wiki/Top_Race ; https://www.diariodecuyo.com.ar/noticias/falaschi-fue-campeon-de-la-copa-america-en-san-juan-887435.html |
| Top Race | 2010 | Agustín Canapino | Torneo Clausura 2010 de la TRV6 | https://es.wikipedia.org/wiki/Top_Race ; https://es.wikipedia.org/wiki/Agust%C3%ADn_Canapino |

Años sin campeón (confirmado):

- TC 1942: Desierto (https://es.wikipedia.org/wiki/Turismo_Carretera ; https://en.wikipedia.org/wiki/Turismo_Carretera)
- TC 1943-1946: No hubo campeonato (guerra): confirmado en es y en.wikipedia (https://es.wikipedia.org/wiki/Turismo_Carretera ; https://en.wikipedia.org/wiki/Turismo_Carretera)
- TC2000 2012-2021: history.json no tiene la era Súper TC2000; los campeones están arriba. El 'TC2000 (2012-)' de segunda división es otro campeonato y no se cuenta.

Categorías internacionales sin campeones argentinos:

- IndyCar: Ningún argentino ganó el campeonato de IndyCar/CART/Champ Car (se cuenta como categoría, no como título).
- WTCR: WTCR 2018-2019 (Tarquini, Michelisz) y TCR World Tour: sin campeones argentinos.
- F1: Cinco títulos de Fangio, ya en history.json.

## corre2026 ambiguos

| Piloto | Coincidencias en 2026 | Motivo |
|---|---|---|
| José Ciantini | Jose Ciantini [tc-pick-up] | el artículo lo da por retirado y las series de 2026 no encajan |
| Nicolás Cotignola | Nicolás Cotignola [tc] | el artículo lo da por retirado y las series de 2026 no encajan |
| Gustavo Tadei | Gustavo Tadei [tc-pista, tc-pick-up, tc-pista-pick-up] | el artículo lo da por retirado y las series de 2026 no encajan |

## Excluidos

| Piloto | Artículo | Motivo |
|---|---|---|
| Carlos Alberto Menditéguy | Carlos Menditéguy | año de nacimiento distinto: Wikidata 1914, Wikipedia 1915 |
| Carmelo Galbato | Carmelo Galbato | año de nacimiento distinto: Wikidata 1921, Wikipedia 1922 |
| Oscar Cabalén | Oscar Cabalén | año de nacimiento distinto: Wikidata 1928, Wikipedia 1924 |
| Benedicto Caldarella | Benedicto Caldarella | año de nacimiento distinto: Wikidata 1939, Wikipedia 1940 |
| Nicolás Filiberti | Nicolás Filiberti | año de nacimiento distinto: Wikidata 1980, Wikipedia 1978 |
| Luis Esteban Hernández | Luis Esteban Hernández | año de nacimiento distinto: Wikidata 1981, Wikipedia 1984 |
| Federico Alonso | Federico Alonso | año de nacimiento distinto: Wikidata 1983, Wikipedia 1985 |
| Gustavo Tadei | Gustavo Tadei | corre2026 ambiguo (ver reporte) |
| José Ciantini | José Ciantini | corre2026 ambiguo (ver reporte) |
| Nicolás Cotignola | Nicolás Cotignola | corre2026 ambiguo (ver reporte) |
| Ricardo Juncos | Ricardo Juncos | corre2026 indeterminable: tiene IndyCar (sin datos 2026 en el repo) y actividad reciente o desconocida (último año ?) |
| Matías Russo | Matías Russo | corre2026 indeterminable: tiene Resistencia (sin datos 2026 en el repo) y actividad reciente o desconocida (último año ?) |
| Nicolás Varrone | Nicolás Varrone | corre2026 indeterminable: tiene Resistencia (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2026) |
| José Manuel Sapag | José Manuel Sapag | corre2026 indeterminable: tiene Top Race/Mundial de Turismos (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2023) |
| Franco Girolami | Franco Girolami | corre2026 indeterminable: tiene Top Race/Mundial de Turismos (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2024) |
| José María López | José María López | corre2026 indeterminable: tiene Top Race/Mundial de Turismos/Resistencia (sin datos 2026 en el repo) y actividad reciente o desconocida (último año 2026) |
| Pablo Vuyovich | Pablo Vuyovich | fecha de nacimiento de Wikidata con precisión menor a un año |
| Gabriel Pozzo | Gabriel Pozzo | provincia de Wikidata sin resolver (?) |
| Juan Pedro Heguy | Juan Pedro Heguy | provincia de Wikipedia sin resolver: lugar contradictorio en el artículo ([[Villalonga]]→Exterior, [[Provincia de Buenos Aires]]→Buenos Aires) |
| Juan José Ebarlín | Juan José Ebarlín | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Benito Juárez]]) |
| Elio Craparo | Elio Craparo | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Chacabuco]]) |
| Kevin Icardi | Kevin Icardi | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Cruz Alta]]) |
| Leonel Larrauri | Leonel Larrauri | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Granadero Baigorria]]) |
| Emilio Kartulovic | Emilio Kartulovich | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Nerežišća]]) |
| Martín Omar Vázquez | Martín Vázquez | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[Presidente Derqui]]) |
| Julián Alfaro | Julián Alfaro | provincia de Wikipedia sin resolver: no se pudo resolver la localidad del artículo ([[San Isidro]]) |
| Brian Smith | Brian Smith | provincia distinta: Wikidata Buenos Aires, Wikipedia Ciudad de Buenos Aires (ficha: Buenos Aires, Argentina) |
| Patricio Di Palma | Patricio Di Palma | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Arrecifes, Provincia de Buenos Aires) |
| Juan Manuel Fangio II | Juan Manuel Fangio II | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Balcarce, Buenos Aires, Argentina) |
| Gabriel Furlán | Gabriel Furlán | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Ciudad Evita) |
| Gastón Perkins | Gastón Perkins | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: Juan Bautista Alberdi, provincia de Buenos Aires) |
| Jorge Martínez Boero | Jorge Martínez Boero | provincia distinta: Wikidata Ciudad de Buenos Aires, Wikipedia Buenos Aires (ficha: La Plata) |
| René Zanatta | René Zanatta | provincia distinta: Wikidata Santa Fe, Wikipedia Entre Ríos (ficha: Rosario del Tala, Provincia de Entre Ríos) |
| Alejandro Cancio | — | sin artículo en es.wikipedia |
| Alex Conci | — | sin artículo en es.wikipedia |
| Andres Ríos | — | sin artículo en es.wikipedia |
| Ariel Jaton | — | sin artículo en es.wikipedia |
| Bautista Damiani | — | sin artículo en es.wikipedia |
| Benedicto Campos | — | sin artículo en es.wikipedia |
| Bob Spalding | — | sin artículo en es.wikipedia |
| Braian Quevedo | — | sin artículo en es.wikipedia |
| Carlo Tomasi | — | sin artículo en es.wikipedia |
| Carlos Alejandro Verza | — | sin artículo en es.wikipedia |
| Carlos Arzani | — | sin artículo en es.wikipedia |
| Carlos Reusch | — | sin artículo en es.wikipedia |
| Carlos Zatuszek | — | sin artículo en es.wikipedia |
| César Rivero | — | sin artículo en es.wikipedia |
| Claudio Burtin | — | sin artículo en es.wikipedia |
| Diego Chiozzi | — | sin artículo en es.wikipedia |
| Domingo Bucci | — | sin artículo en es.wikipedia |
| Eduardo Casa | — | sin artículo en es.wikipedia |
| Eduardo Maidana | — | sin artículo en es.wikipedia |
| Emiliano Stang | — | sin artículo en es.wikipedia |
| Emilio Raúl Sampol | — | sin artículo en es.wikipedia |
| Ernesto Blanco | — | sin artículo en es.wikipedia |
| Ezequiel Iturrioz | — | sin artículo en es.wikipedia |
| Ezequiel Pérez Companc | — | sin artículo en es.wikipedia |
| Fabricio Perren | — | sin artículo en es.wikipedia |
| Federico Gartner | — | sin artículo en es.wikipedia |
| Fernando Stella | — | sin artículo en es.wikipedia |
| Francisco Monarca | — | sin artículo en es.wikipedia |
| Francisco Moreno Flores | — | sin artículo en es.wikipedia |
| Francisco Soldavini | — | sin artículo en es.wikipedia |
| Franco Riva | — | sin artículo en es.wikipedia |
| Franco Villabrille Neila | — | sin artículo en es.wikipedia |
| George Raphaël Béthenod de Montbressieux | — | sin artículo en es.wikipedia |
| Gino Trappa | — | sin artículo en es.wikipedia |
| Guido Moggia | — | sin artículo en es.wikipedia |
| Gustavo Fontana | — | sin artículo en es.wikipedia |
| Hanna Abdallah | — | sin artículo en es.wikipedia |
| Héctor Fiorda | — | sin artículo en es.wikipedia |
| Iván Saturni | — | sin artículo en es.wikipedia |
| Jeremías Olmedo | — | sin artículo en es.wikipedia |
| José Faraoni | — | sin artículo en es.wikipedia |
| José Rasuk | — | sin artículo en es.wikipedia |
| José-Maria Ibánez | — | sin artículo en es.wikipedia |
| Juan Carlos Bertozzi | — | sin artículo en es.wikipedia |
| Juan Carlos Nesprías | — | sin artículo en es.wikipedia |
| Juan Gaudino | — | sin artículo en es.wikipedia |
| Juan José Garriz | — | sin artículo en es.wikipedia |
| Juan José Yannantuoni | — | sin artículo en es.wikipedia |
| Juan Pablo Raies | — | sin artículo en es.wikipedia |
| Leandro Juncos | — | sin artículo en es.wikipedia |
| Lorenzo Somaschini | — | sin artículo en es.wikipedia |
| Luciano Cotignola | — | sin artículo en es.wikipedia |
| Luciano Ribodino | — | sin artículo en es.wikipedia |
| Luis Brosutti | — | sin artículo en es.wikipedia |
| Marcelo La Manna | — | sin artículo en es.wikipedia |
| Marco Dianda | — | sin artículo en es.wikipedia |
| Marco Morelli | — | sin artículo en es.wikipedia |
| Marco Solorza | — | sin artículo en es.wikipedia |
| Mariano Sorrentino | — | sin artículo en es.wikipedia |
| Mateo Polakovich | — | sin artículo en es.wikipedia |
| Matías Capurro | — | sin artículo en es.wikipedia |
| Miguel Baldoni | — | sin artículo en es.wikipedia |
| Nazareno López | — | sin artículo en es.wikipedia |
| Nicolás Moscardini | — | sin artículo en es.wikipedia |
| Nicolás Traut | — | sin artículo en es.wikipedia |
| Pablo Pérez Companc | — | sin artículo en es.wikipedia |
| Paolo Biglieri | — | sin artículo en es.wikipedia |
| Raúl Martinez | — | sin artículo en es.wikipedia |
| Raúl Riganti | — | sin artículo en es.wikipedia |
| Raúl Sufan | — | sin artículo en es.wikipedia |
| Ricardo Grandío | — | sin artículo en es.wikipedia |
| Roberto Sánchez | — | sin artículo en es.wikipedia |
| Rodrigo Lugón | — | sin artículo en es.wikipedia |
| Roy Block | — | sin artículo en es.wikipedia |
| Santiago Álvarez | — | sin artículo en es.wikipedia |
| Sebastián Salse | — | sin artículo en es.wikipedia |
| Simón Cifre | — | sin artículo en es.wikipedia |
| Teo Schropp | — | sin artículo en es.wikipedia |
| Tomás Maffei | — | sin artículo en es.wikipedia |
| Alejandro Frangioli | Alejandro Frangioli | sin categorías de la lista |
| Alejandro Radetic | Alejandro Radetic | sin categorías de la lista |
| Alejandro Urtubey | Alejandro Urtubey | sin categorías de la lista |
| Álvaro Perlo | Álvaro Perlo | sin categorías de la lista |
| Andrea Vianini | Andrea Vianini | sin categorías de la lista |
| Carlos "Carlucho" Villar | Carlos Villar | sin categorías de la lista |
| Carlos Enrique Díaz Sáenz Valiente | Carlos Enrique Díaz Sáenz Valiente | sin categorías de la lista |
| Carlos Marincovich | Carlos Marincovich | sin categorías de la lista |
| Carlos Saúl Facundo Menem | Carlos Menem Jr. | sin categorías de la lista |
| Claudio Kohler | Claudio Kohler | sin categorías de la lista |
| David Nalbandian | David Nalbandian | sin categorías de la lista |
| Delfina Frers | Delfina Frers | sin categorías de la lista |
| Denis Martin | Denis Martin | sin categorías de la lista |
| Enrique Benamo | Enrique Benamo | sin categorías de la lista |
| Enrique Mansilla | Enrique Mansilla | sin categorías de la lista |
| Estadio Martín de Álzaga | Martín de Alzaga Unzué | sin categorías de la lista |
| Francisco Troncoso | Francisco Troncoso | sin categorías de la lista |
| Franco Ércoli | Franco Ércoli | sin categorías de la lista |
| Gabriel Novillo | Gabriel Novillo | sin categorías de la lista |
| Giorgio Carrara | Giorgio Carrara | sin categorías de la lista |
| Hugo Vignetti | Hugo Vignetti | sin categorías de la lista |
| John Della Penna | John Della Penna | sin categorías de la lista |
| Jorge Andrés Martínez Boero | Jorge Andrés Martínez Boero | sin categorías de la lista |
| Jorge Kissling | Jorge Kissling | sin categorías de la lista |
| Josefina Vigo | Josefina Vigo | sin categorías de la lista |
| Juan Carlos Ridolfi | Juan Carlos Ridolfi | sin categorías de la lista |
| Juan Cruz Di Palma | Juan Cruz Di Palma | sin categorías de la lista |
| Juan Oscar Facchini | Juan Oscar Facchini | sin categorías de la lista |
| Leandro Mercado | Leandro Mercado | sin categorías de la lista |
| Marcos Ciani | Marcos Ciani | sin categorías de la lista |
| Marcos Siebert | Marcos Siebert | sin categorías de la lista |
| María Abbate | María Abbate | sin categorías de la lista |
| Mariano Acebal | Mariano Acebal | sin categorías de la lista |
| Martín Ferreyra | Martín Ferreyra | sin categorías de la lista |
| Martín Laborda | Martín Laborda | sin categorías de la lista |
| Mattia Colnaghi | Mattia Colnaghi | sin categorías de la lista |
| Néstor Gurini | Néstor Gurini | sin categorías de la lista |
| Orlando Sotro | Orlando Sotro | sin categorías de la lista |
| Oscar Mauricio Franco | Oscar Mauricio Franco | sin categorías de la lista |
| Renato Hernán Pozzetto | Renato Hernán Pozzetto | sin categorías de la lista |
| Ricardo Risatti II | Ricardo Risatti II | sin categorías de la lista |
| Ruggero Preto | Ruggero Preto | sin categorías de la lista |
| Santiago Luján Saigós | Santiago Luján Saigós | sin categorías de la lista |
| Tulio Crespi | Tulio Crespi | sin categorías de la lista |
| Valentín Perrone | Valentín Perrone | sin categorías de la lista |
| Vicente Luppino | Vicente Luppino | sin categorías de la lista |
| Willy Pérez | Willy Pérez | sin categorías de la lista |
| Juan Cruz Álvarez | Juan Cruz Álvarez | Wikidata con más de un lugar de nacimiento |
| Figgo Bessone | Figgo Bessone | Wikidata sin fecha de nacimiento |
| Rudi Bundziak | Rudi Bundziak | Wikidata sin fecha de nacimiento |
| Alejandro Bini | Alejandro Bini | Wikidata sin lugar de nacimiento |
| Claudio Di Noto Rama | Claudio Di Noto Rama | Wikidata sin lugar de nacimiento |
| Eduardo Rodríguez Canedo | Eduardo Rodríguez Canedo | Wikidata sin lugar de nacimiento |
| Esteban Fernandino | Esteban Fernandino II | Wikidata sin lugar de nacimiento |
| Fernando Piersanti | Fernando Piersanti | Wikidata sin lugar de nacimiento |
| Francisco Viel Bugliotti | Francisco Viel Bugliotti | Wikidata sin lugar de nacimiento |
| Ivo Perabó | Ivo Perabó | Wikidata sin lugar de nacimiento |
| Juan Manuel Tomasello | Juan Manuel Tomasello | Wikidata sin lugar de nacimiento |
| Juan Pablo Barucca | Juan Pablo Barucca | Wikidata sin lugar de nacimiento |
| Julio Cruciani | Julio Cruciani | Wikidata sin lugar de nacimiento |
| Matías Jalaf | Matías Jalaf | Wikidata sin lugar de nacimiento |
| Maximiliano Juan | Maximiliano Juan | Wikidata sin lugar de nacimiento |
| Rodolfo De Álzaga | Rodolfo de Álzaga | Wikidata sin lugar de nacimiento |
| Santiago Ventana | Santiago Ventana | Wikidata sin lugar de nacimiento |
| Christian Iván Ramos | Christian Iván Ramos | Wikipedia con años de nacimiento distintos (ficha 1992, oración 1994) |
| Exequiel Bastidas | Exequiel Bastidas | Wikipedia con años de nacimiento distintos (ficha 2000, oración 1995) |
| Efrén Chemolli Sr. | Efrén Chemolli Sr. | Wikipedia sin año de nacimiento legible |
| Rosmualdo Visintini | Rosmualdo Visintini | Wikipedia sin año de nacimiento legible |
| Thomas Hearne | Thomas Hearne | Wikipedia sin año de nacimiento legible |

