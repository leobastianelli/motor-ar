// Pistas del juego, escritas a mano a partir de docs/juego/hechos-pistas.md (cada hecho con su cita comprobada).
// Genera src/data/juego/pistas.json. Uso: node scripts/juego-pistas-fuente.mjs
// Reglas: sin nombre ni apellido del piloto ni de parientes con el mismo apellido; la 1 (tras el 3.er fallo) es de trayectoria,
// la 2 (tras el 6.º) es la más reconocible. Nada de cifras que las fuentes discuten.
import fs from "node:fs";
import path from "node:path";

const W = (t) => `https://es.wikipedia.org/wiki/${t}`;
const DESDE = "2026-10-19";

const PISTAS = {
  "juan-manuel-fangio": [
    ["Antes de Europa fue campeón de Turismo Carretera en 1940 y 1941 con Chevrolet.", W("Juan_Manuel_Fangio")],
    ["Le decían «el Chueco» y es el único que ganó títulos de Fórmula 1 con cuatro escuderías distintas.", W("Juan_Manuel_Fangio")],
  ],
  "froilan-gonzalez": [
    ["Ganó las 24 Horas de Le Mans de 1954, el mismo año en que fue subcampeón de Fórmula 1.", W("Jos%C3%A9_Froil%C3%A1n_Gonz%C3%A1lez")],
    ["En Silverstone 1951 le dio a Ferrari su primera victoria en un Gran Premio de Fórmula 1.", W("Jos%C3%A9_Froil%C3%A1n_Gonz%C3%A1lez")],
  ],
  "carlos-reutemann": [
    ["En 1981 perdió el campeonato de Fórmula 1 por un solo punto, corriendo para Williams.", W("Carlos_Reutemann")],
    ["Le dicen «Lole» y después de correr fue dos veces gobernador de Santa Fe.", W("Carlos_Reutemann")],
  ],
  "onofre-marimon": [
    ["Subió dos veces al podio en sus 11 carreras de Fórmula 1 y ganó el Gran Premio de Roma de 1954 con Maserati.", W("Onofre_Marim%C3%B3n")],
    ["Hijo de otro corredor, nació en Zárate y murió en 1954 en los entrenamientos del Gran Premio de Alemania.", W("Onofre_Marim%C3%B3n")],
  ],
  "roberto-mieres": [
    ["Corrió 17 Grandes Premios de Fórmula 1 entre 1953 y 1955 y en 1959 ganó los 1000 km de Daytona con un Porsche.", W("Roberto_Mieres")],
    ["Marplatense, además de piloto fue velerista: compitió en vela en los Juegos Olímpicos de Roma 1960.", W("Roberto_Mieres")],
  ],
  "oscar-larrauri": [
    ["En 1986 fue segundo en la general de las 24 Horas de Le Mans con Brun Motorsport.", W("Oscar_Larrauri")],
    ["Campeón europeo de Fórmula 3 en 1982, llegó a la Fórmula 1 con EuroBrun en 1988.", W("Oscar_Larrauri")],
  ],
  "ricardo-zunino": [
    ["Fue campeón de la clase C del Turismo Nacional en 1975 y 1976 con Fiat.", W("Ricardo_Zunino")],
    ["Sanjuanino, en 1979 reemplazó a Niki Lauda en Brabham en el Gran Premio de Canadá.", W("Ricardo_Zunino")],
  ],
  "norberto-fontana": [
    ["Campeón de la Fórmula 3 alemana en 1995, después corrió la Fórmula Nippon y la CART.", W("Norberto_Fontana")],
    ["Debutó en Fórmula 1 con Sauber en 1997 y fue campeón de TC 2000 en 2002 y 2010.", W("Norberto_Fontana")],
  ],
  "esteban-tuero": [
    ["Ganó su primer título, en Fórmula Honda, con 16 años.", W("Esteban_Tuero")],
    ["Corrió la temporada 1998 de Fórmula 1 con Minardi y fue el tercer piloto más joven en debutar en la categoría.", W("Esteban_Tuero")],
  ],
  "gaston-mazzacane-foton": [
    ["En 2018 fue el primer campeón de la TC Pick Up, con una Volkswagen Amarok.", W("Gast%C3%B3n_Mazzacane")],
    ["Platense, corrió la Fórmula 1 con Minardi en 2000 y con Prost en 2001. Su padre llegó a presidir la ACTC.", W("Gast%C3%B3n_Mazzacane")],
  ],
  "franco-colapinto": [
    ["Con 18 años fue el segundo piloto más joven de la historia en correr las 24 Horas de Le Mans.", W("Franco_Colapinto")],
    ["En Bakú 2024 fue el primer argentino en sumar puntos en Fórmula 1 desde 1982.", W("Franco_Colapinto")],
  ],
  "juan-galvez": [
    ["Ganó 56 de las 153 carreras que corrió y murió en 1963 en Olavarría, en el único accidente de su carrera.", W("Juan_G%C3%A1lvez_(piloto)")],
    ["Es el máximo campeón de la historia del Turismo Carretera. Su hermano mayor también fue campeón.", W("Juan_G%C3%A1lvez_(piloto)")],
  ],
  "oscar-galvez": [
    ["En 1953 largó el primer Gran Premio de Argentina de Fórmula 1 con una Maserati y terminó quinto.", W("Oscar_Alfredo_G%C3%A1lvez")],
    ["Siempre con Ford en el TC, ganó siete veces el Gran Premio Argentino. Su hermano menor es el máximo campeón de la categoría.", W("Oscar_Alfredo_G%C3%A1lvez")],
  ],
  "dante-emiliozzi": [
    ["En 1963 ganó 10 de las 16 carreras y pasó los 200 km/h de promedio en la Vuelta de Necochea.", W("Dante_Emiliozzi")],
    ["De Olavarría, corría con su hermano de acompañante en «La Galera», un Ford con el motor modificado.", W("Dante_Emiliozzi")],
  ],
  "roberto-mouras": [
    ["En 1976 ganó seis carreras seguidas con un Chevy dorado conocido como «el 7 de Oro».", W("Roberto_Mouras")],
    ["Tricampeón de TC con Dodge entre 1983 y 1985, murió en 1992 en la Vuelta de Lobos.", W("Roberto_Mouras")],
  ],
  "juan-maria-traverso": [
    ["En 1973 ocupó en el equipo oficial Ford el lugar que había dejado vacante Nasif Estéfano.", W("Juan_Mar%C3%ADa_Traverso")],
    ["Le decían «el Flaco», era de Ramallo y sumó 16 campeonatos en 34 años de carrera.", W("Juan_Mar%C3%ADa_Traverso")],
  ],
  "oscar-castellano": [
    ["Fue de los últimos «pilotos-preparadores»: armaba su propio auto. Era de Lobería.", W("Oscar_Castellano")],
    ["Sus autos naranjas dieron origen al mote de «La Naranja Mecánica». Tricampeón de TC entre 1987 y 1989.", W("Oscar_Castellano")],
  ],
  "hector-luis-gradassi": [
    ["Debutó en TC en 1967 con el equipo oficial IKA y ganó su primera carrera con un Torino 380 W.", W("H%C3%A9ctor_Luis_Gradassi")],
    ["Cordobés apodado «Pirín», fue cuatro veces campeón de TC con Ford en los años setenta.", W("H%C3%A9ctor_Luis_Gradassi")],
  ],
  "eduardo-jose-copello": [
    ["Fue campeón de la primera temporada del Sport Prototipo Argentino, con un Numa IIB-Tornado.", W("Eduardo_Copello")],
    ["Lo apodaban «el Cardenal» y «el Maestro». En 1967 fue el primer campeón de TC que no corría con Chevrolet ni con Ford.", W("Eduardo_Copello")],
  ],
  "ernesto-bessone": [
    ["En 1985 ganó en Las Flores su primera carrera de TC 2000, que también fue la primera de la cupé Renault Fuego.", W("Ernesto_Bessone_II")],
    ["Le dicen «Tito» y es el único con al menos un título en TC, TC 2000, Top Race y Turismo Nacional.", W("Ernesto_Bessone_II")],
  ],
  "luis-ruben-di-palma": [
    ["Corrió las 24 Horas de Le Mans de 1973 con una Ferrari Daytona. La recta principal de Rafaela lleva su nombre.", W("Luis_Rub%C3%A9n_Di_Palma")],
    ["«El Loco» de Arrecifes: único piloto que ganó en TC con Ford, Chevrolet, Torino y Dodge.", W("Luis_Rub%C3%A9n_Di_Palma")],
  ],
  "nasif-estefano": [
    ["Fue bicampeón de la Fórmula 1 Mecánica Argentina con motores Chevrolet.", W("Nasif_Est%C3%A9fano")],
    ["Tucumano, es el único campeón de TC consagrado después de muerto, en 1973.", W("Nasif_Est%C3%A9fano")],
  ],
  "carlos-pairetti": [
    ["En 1965 ganó en Villa Carlos Paz con un Volvo: la única victoria de TC de una marca fuera de las cuatro grandes.", W("Carlos_Pairetti")],
    ["Campeón de TC 1968 con el «Trueno Naranja». También actuó en películas.", W("Carlos_Pairetti")],
  ],
  "juan-manuel-bordeu": [
    ["Le dio a Dodge su primera victoria en el automovilismo argentino, en Olavarría en 1971.", W("Juan_Manuel_Bordeu")],
    ["Protegido de Fangio, fue campeón de TC 1966 con «La Coloradita».", W("Juan_Manuel_Bordeu")],
  ],
  "guillermo-ortelli": [
    ["Ganó en su debut en TC, en las 2 Horas de Buenos Aires de 1994, con un Ford Falcon.", W("Guillermo_Ortelli")],
    ["Es de Salto y fue siete veces campeón de Turismo Carretera.", W("Guillermo_Ortelli")],
  ],
  "omar-martinez": [
    ["Usa el número 2 en homenaje a los subcampeonatos que sacó en todas las categorías.", W("Omar_Mart%C3%ADnez")],
    ["Le dicen «Gurí» y «el Supremo Entrerriano». Corre con los colores amarillo y negro.", W("Omar_Mart%C3%ADnez")],
  ],
  "matias-rossi": [
    ["A los 23 años fue el bicampeón más joven de la historia del TC 2000.", W("Mat%C3%ADas_Rossi")],
    ["Nació en Del Viso y fue campeón de TC en 2014.", W("Mat%C3%ADas_Rossi")],
  ],
  "agustin-canapino": [
    ["Corrió en IndyCar con Juncos Hollinger Racing entre 2023 y 2024.", W("Agust%C3%ADn_Canapino")],
    ["De Arrecifes, en 2010 fue el campeón más joven de la historia del TC, con 20 años.", W("Agust%C3%ADn_Canapino")],
  ],
  "christian-ledesma": [
    ["Ganó el primer concurso nacional de pilotos Prodriver, en 1994.", W("Christian_Ledesma")],
    ["Marplatense, fue campeón de TC 2000 en 2004 y de Turismo Carretera en 2007.", W("Christian_Ledesma")],
  ],
  "juan-manuel-silva-automovilista": [
    ["Usó el número 111 en el Top Race desde 2008 y en el Turismo Carretera desde 2012.", W("Juan_Manuel_Silva")],
    ["Chaqueño, ganó el día de su debut en TC y fue campeón de la categoría en 2005.", W("Juan_Manuel_Silva")],
  ],
  "mariano-werner": [
    ["En 2006 fue campeón de la Fórmula Renault con 49 puntos de ventaja sobre su escolta.", W("Mariano_Werner")],
    ["De Paraná y fiel a Ford, su duelo con Canapino fue el de Ford contra Chevrolet. Campeón de TC en 2020, 2021 y 2023.", W("Mariano_Werner")],
  ],
  "leonel-pernia": [
    ["Antes de correr fue futbolista: llegó a jugar en Primera División en 1997.", W("Leonel_Pern%C3%ADa")],
    ["Tandilense, piloto oficial de Honda en el TC 2000 desde 2007 y campeón del Turismo Nacional en 2018.", W("Leonel_Pern%C3%ADa")],
  ],
  "jose-manuel-urcera": [
    ["Antes de los autos fue piloto de enduro y motocross: ganó el Enduro del Verano en 2009 y 2010.", W("Jos%C3%A9_Manuel_Urcera")],
    ["Le dicen «Manu», es rionegrino y fue campeón de Turismo Carretera en 2022 con Torino.", W("Jos%C3%A9_Manuel_Urcera")],
  ],
  "julian-santero": [
    ["Debutó en la Fórmula 3 chilena en 2008, con 14 años.", W("Juli%C3%A1n_Santero")],
    ["Mendocino de Guaymallén, ganó su primera carrera de TC en Viedma en 2017 con un Torino.", W("Juli%C3%A1n_Santero")],
  ],
  "facundo-ardusso": [
    ["En 2020 la Fundación Konex lo eligió entre los cinco mejores corredores de la década.", W("Facundo_Ardusso")],
    ["Le dicen «el Flaco», es de Las Parejas y en Toyota reemplazó a Norberto Fontana.", W("Facundo_Ardusso")],
  ],
  "gabriel-ponce-de-leon": [
    ["Campeón de Fórmula Renault en 1998, como premio debutó en TC 2000 con un Ford Escort de Berta Sport.", W("Gabriel_Ponce_de_Le%C3%B3n")],
    ["Juninense, fue tricampeón de TC 2000 en 2001, 2003 y 2005.", W("Gabriel_Ponce_de_Le%C3%B3n")],
  ],
  "esteban-guerrieri": [
    ["Fue subcampeón de Indy Lights en 2011 y 2012.", W("Esteban_Guerrieri")],
    ["Es el piloto con más victorias en la historia del WTCR, el Mundial de Turismos.", W("Esteban_Guerrieri")],
  ],
  "federico-villagra": [
    ["Empezó en el motocross y corrió varios Dakar, primero en autos y después en camiones.", W("Federico_Villagra")],
    ["Cordobés, superó la marca de títulos de Gabriel Raies en el Rally Argentino.", W("Federico_Villagra")],
  ],
  "gabriel-raies": [
    ["Debutó en 1976 y se retiró en 2002. En 2017 apadrinó al equipo Toyota Young del TC 2000.", W("Gabriel_Raies")],
    ["Cordobés, fue durante años el máximo ganador del Campeonato Argentino de Rally.", W("Gabriel_Raies")],
  ],
  "jorge-recalde": [
    ["En 1978 ganó la clase B de la Vuelta a la América del Sud con un Renault 12.", W("Jorge_Recalde")],
    ["«El Cóndor de Traslasierra»: el único argentino que ganó el Rally de Argentina en la general, en 1988.", W("Jorge_Recalde")],
  ],
  "marcos-ligato": [
    ["Antes del auto fue campeón de motocross. Debutó en el Mundial de Rally en el Rally de Argentina 1998.", W("Marcos_Ligato")],
    ["Cordobés de Río Ceballos, fue subcampeón mundial de Producción del WRC en 2012 con un Subaru.", W("Marcos_Ligato")],
  ],
  "emanuel-moriatis": [
    ["Empezó en cuatriciclos y debutó en autos en 1998, en la monomarca Citroën AX.", W("Emanuel_Moriatis")],
    ["De Lanús, fue campeón de TC en 2009 y llegó a presidir el Turismo Nacional.", W("Emanuel_Moriatis")],
  ],
  "luis-jose-di-palma": [
    ["Debutó en 2004 en el TC Pista y en 2011 volvió al TC con equipo propio y un Torino Cherokee.", W("Luis_Jos%C3%A9_Di_Palma")],
    ["Le dicen «Josito» y es nieto de un bicampeón de TC con Torino.", W("Luis_Jos%C3%A9_Di_Palma")],
  ],
  "marcos-di-palma": [
    ["Su único título fue el Supercart de 1991. Entre 2017 y 2021 fue diputado bonaerense.", W("Marcos_Di_Palma")],
    ["Le dicen «el Loco», como a su padre, y es defensor acérrimo de Chevrolet.", W("Marcos_Di_Palma")],
  ],
  "jonatan-castellano": [
    ["Fue campeón de TC Pista en 2005 y del Turismo Nacional en 2022.", W("Jonatan_Castellano")],
    ["De Lobería, corrió con un Dodge Polara naranja en homenaje a «La Naranja Mecánica» de su padre.", W("Jonatan_Castellano")],
  ],
  "marcos-patronelli": [
    ["En 2010 ganó el Rally de los Faraones, primer argentino en lograrlo.", W("Marcos_Patronelli")],
    ["Le dicen «Loquillo» y en 2010 fue el primer argentino en ganar el Dakar, en cuatriciclos.", W("Marcos_Patronelli")],
  ],
  "alejandro-patronelli": [
    ["Ganó tres veces el Enduro del Verano: 1996, 1997 y 1999.", W("Alejandro_Patronelli")],
    ["Le dicen «Bagre». Ganó el Dakar en cuatriciclos en 2011 y 2012, y su hermano menor también es campeón.", W("Alejandro_Patronelli")],
  ],
  "kevin-benavides": [
    ["En 2016 fue el primer argentino en ganar una etapa del Dakar en motos.", W("Kevin_Benavides")],
    ["Salteño, en 2021 fue el primer argentino en ganar el Dakar en motos, y lo repitió en 2023.", W("Kevin_Benavides")],
  ],
  "luciano-benavides": [
    ["Fue campeón del Mundial de Rally Raid en 2023 y del argentino de enduro en 2015 y 2016.", W("Luciano_Benavides")],
    ["Salteño, ganó el Dakar 2026 en motos por apenas 2 segundos. Su hermano mayor también lo ganó.", W("Luciano_Benavides")],
  ],
  "nicolas-cavigliasso": [
    ["En 2017 ganó el Merzouga Dakar Series de Marruecos.", W("Nicol%C3%A1s_Cavigliasso")],
    ["Cordobés de General Cabrera, ganó el Dakar en cuatriciclos (2019) y en Challenger (2025), con su esposa de copiloto.", W("Nicol%C3%A1s_Cavigliasso")],
  ],
  "manuel-andujar": [
    ["En 2021 fue campeón del Mundial de Rally Cross-Country de la FIM en cuatriciclos.", W("Manuel_And%C3%BAjar_(motociclista)")],
    ["Nacido en Lobos, ganó el Dakar en cuatriciclos en 2021 y en 2024.", W("Manuel_And%C3%BAjar_(motociclista)")],
  ],
};

const ROOT = path.resolve(import.meta.dirname, "..");
const base = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/juego/pilotos.json"), "utf8")).pilotos;
const porSlug = new Map(base.map((p) => [p.slug, p]));
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const salida = {};
const problemas = [];
for (const [slug, pistas] of Object.entries(PISTAS)) {
  const p = porSlug.get(slug);
  if (!p) {
    problemas.push(`${slug}: no está en la base`);
    continue;
  }
  // Ninguna pista puede nombrar al piloto (apellido o nombre de pila distintivo).
  const palabras = sinTildes(p.nombre).split(/\s+/).filter((w) => w.length > 3 && !["juan", "jose", "maria", "luis", "carlos", "oscar", "manuel"].includes(w));
  for (const [texto] of pistas) {
    const t = sinTildes(texto);
    for (const w of palabras) if (new RegExp(`\\b${w}\\b`).test(t)) problemas.push(`${slug}: la pista nombra "${w}"`);
  }
  salida[slug] = { desde: DESDE, pistas: pistas.map(([texto, fuente]) => ({ texto, fuente })) };
}
if (problemas.length) {
  console.error(problemas.join("\n"));
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, "src/data/juego/pistas.json"), JSON.stringify(salida, null, 2) + "\n");
console.log(`${Object.keys(salida).length} pilotos con pistas`);
