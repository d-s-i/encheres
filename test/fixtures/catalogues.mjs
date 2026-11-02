// Public catalog excerpts, checked against Crédit Municipal de Paris listings on 2026-11-02.
export const sale2021 = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/';
export const sale2026 = 'https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/';
export const detail318 = sale2021 + 'tag-heuer-carrera-montre-dhomme-ronde-en-acier-3/';
export const detail323 = sale2021 + 'chopard-alfa-romeo-montre-dhomme-en-acier-avec/';
export const detail262 = sale2026 + 'omega-seamaster-professionnal-montre-bracelet-d/';
const card = (n, href) => `<div class="card card--lot"><span class="card__number">Lot n°${n}</span><h2 class="card__title"><a href="${href}">Montre</a></h2></div>`;
const listing = (cards) => `<main><h1>Vente terminée</h1>${cards}</main>`;
const detail = (n, title, description, sold, estimate, date) => `<main><div class="lot"><span class="lot__number">Lot n°${n}</span><h1 class="lot__title">${title}</h1><div class="lot__prices"><span>Adjugé à ${sold} €* le ${date}</span></div><div class="lot__estimation">* Hors frais<br>Estimation : ${estimate} €</div><div class="lot__description"><span>Description</span><p>${description}</p></div></div></main>`;
export const pages = new Map([
  [sale2021, listing(card(318, detail318) + card(323, detail323))],
  [detail318, detail(318, 'TAG HEUER, Carrera. Montre d’homme ronde en acier', 'TAG HEUER, Carrera. Montre d’homme ronde en acier avec chronographe. Mouvement mécanique à remontage automatique. Calibre 16. Bracelet caoutchouc avec fermoir déployant siglé. Diamètre : 41,5 mm. Référence : CV2010-3. N° de série : EWL8719. Sans écrin ni papiers.', '1 500', '600 / 800', '5 juin 2021')],
  [detail323, detail(323, 'CHOPARD, Alfa Romeo. Montre d’homme en acier', 'CHOPARD, Alfa Romeo. Montre d’homme en acier avec chronographe et fonction GMT. Bracelet en caoutchouc avec fermoir double déployant en acier signé. Référence : 8954. N° de série : 1102847. Écrin, surboîte, compteur, certificat d’origine et carte de garantie.', '3 600', '1 500 / 2 500', '5 juin 2021')],
  [sale2026, listing(card(262, detail262))],
  [detail262, detail(262, 'OMEGA, Seamaster Professionnal.', 'OMEGA, Seamaster Professionnal. Montre bracelet de forme ronde. Boîtier en acier signé et numéroté 89415867. Bracelet en acier avec boucle déployante signée. Boîte, surboîte, notice, sans papiers.', '3 600', '1 500 / 2 000', '20 juin 2026')],
]);
export const fetchFixture = async url => {
  if (!pages.has(url)) throw new Error(`Fixture absente : ${url}`);
  return { ok: true, status: 200, text: async () => pages.get(url) };
};
