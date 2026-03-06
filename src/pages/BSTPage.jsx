import { useMemo } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import bstData from "../config/bst.json";
import pokedexData from "../config/pokedex.json";

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23333' width='64' height='64'/%3E%3Ctext x='32' y='36' fill='%23666' font-size='10' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

/** Normalise un nom pour la recherche (sans accents, minuscules) */
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trouve le sprite dans le pokedex par nom */
function findSprite(name, pokedexEntries) {
  if (!name || !pokedexEntries?.length) return null;
  const n = normalizeName(name);
  // Correspondance exacte
  let entry = pokedexEntries.find((e) => normalizeName(e.name) === n);
  if (entry?.imageUrl) return entry.imageUrl;
  // Variantes: "Méga Staross" <-> "Méga-Staross", "Géolithe Néantin" <-> "Géolithe Enfant du Néant"
  const nAlt = n.replace(/\s+/g, "-");
  entry = pokedexEntries.find(
    (e) =>
      normalizeName(e.name) === nAlt ||
      normalizeName(e.name).replace(/\s+/g, "-") === n
  );
  if (entry?.imageUrl) return entry.imageUrl;
  // Recherche par base (ex: "Méga Dracolosse" -> "Dracolosse")
  const baseName = n.replace(/^mega\s*-?\s*/i, "").trim();
  entry = pokedexEntries.find((e) => normalizeName(e.name) === baseName);
  if (entry?.imageUrl) return entry.imageUrl;
  // Recherche partielle
  const partial = pokedexEntries.find(
    (e) =>
      n.includes(normalizeName(e.name)) || normalizeName(e.name).includes(n)
  );
  return partial?.imageUrl || null;
}

const TYPE_COLORS = {
  plante: "#7ec850",
  feu: "#f08030",
  eau: "#6890f0",
  glace: "#98d8d8",
  malice: "#705898",
  poison: "#a040a0",
  vol: "#a890f0",
  dragon: "#7038f8",
  sol: "#e0c068",
  combat: "#c03028",
  spectre: "#705898",
  psy: "#f85888",
  electrik: "#f8d030",
  fee: "#ee99ac",
  tenebres: "#705848",
  roche: "#b8a038",
  acier: "#b8b8d0",
  normal: "#a8a878",
  insecte: "#a8b820",
  aspic: "#a08060",
  neant: "#4a4a6a",
};

function getTypeStyle(typeStr) {
  const types = (typeStr || "")
    .split("/")
    .map((t) => t.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const primary = types[0] || "normal";
  const color = TYPE_COLORS[primary] || TYPE_COLORS.normal;
  return { background: `${color}33`, borderColor: color, color };
}

function BSTTable({ title, data, pokedexEntries }) {
  const rows = useMemo(() => {
    return (data || []).map((row) => ({
      ...row,
      sprite: findSprite(row.name, pokedexEntries) || PLACEHOLDER_SPRITE,
    }));
  }, [data, pokedexEntries]);

  return (
    <section className="bst-section">
      <h2 className="bst-section-title">{title}</h2>
      <div className="bst-table-wrap">
        <table className="bst-table">
          <thead>
            <tr>
              <th className="bst-th-sprite">Sprite</th>
              <th>Nom</th>
              <th>Type</th>
              <th className="bst-th-stat">PV</th>
              <th className="bst-th-stat">ATK</th>
              <th className="bst-th-stat">DEF</th>
              <th className="bst-th-stat">ATK SPE</th>
              <th className="bst-th-stat">DEF SPE</th>
              <th className="bst-th-stat">SPE</th>
              <th className="bst-th-total">Total</th>
              <th>Talent</th>
              <th className="bst-th-desc">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.name}-${i}`}>
                <td className="bst-td-sprite">
                  <img
                    src={row.sprite}
                    alt=""
                    className="bst-sprite"
                    loading="lazy"
                    onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
                  />
                </td>
                <td className="bst-td-name">{row.name}</td>
                <td className="bst-td-type">
                  <span
                    className="bst-type-badge"
                    style={getTypeStyle(row.type)}
                  >
                    {row.type}
                  </span>
                </td>
                <td className="bst-td-stat">{row.hp}</td>
                <td className="bst-td-stat">{row.atk}</td>
                <td className="bst-td-stat">{row.def}</td>
                <td className="bst-td-stat">{row.spa}</td>
                <td className="bst-td-stat">{row.spd}</td>
                <td className="bst-td-stat">{row.spe}</td>
                <td className="bst-td-total">{row.total}</td>
                <td className="bst-td-ability">{row.ability}</td>
                <td className="bst-td-desc">{row.abilityDesc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function BSTPage() {
  const pokedexEntries = pokedexData?.entries || [];

  return (
    <div className="page bst-page">
      <Sidebar />
      <div className="bst-bg" />
      <div className="bst-overlay" />
      <main className="bst-main">
        <header className="bst-header">
          <Link to="/" className="bst-back">
            <i className="fa-solid fa-arrow-left" />
            Retour
          </Link>
          <h1 className="bst-title">
            <i className="fa-solid fa-table" />
            All BST + new Abilities
          </h1>
          <p className="bst-subtitle">
            Statistiques de base et talents des Fakemon, Mégas et Pokémon spéciaux
          </p>
        </header>

        <div className="bst-content">
          <BSTTable
            title="Fakemon + Formes Régionales"
            data={bstData.fakemon}
            pokedexEntries={pokedexEntries}
          />
          <BSTTable
            title="Nouvelles Mégas"
            data={bstData.megas}
            pokedexEntries={pokedexEntries}
          />
          <BSTTable
            title="Pokémons Spéciaux"
            data={bstData.speciaux}
            pokedexEntries={pokedexEntries}
          />
        </div>
      </main>
    </div>
  );
}
