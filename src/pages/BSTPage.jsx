import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import bstData from "../config/bst.json";
import pokedexData from "../config/pokedex.json";

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23222' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='38' fill='%23555' font-size='14' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const FILTER_OPTIONS = [
  { id: "all", label: "Tout afficher", icon: "fa-layer-group" },
  { id: "fakemon", label: "Fakemon + Formes Régionales", icon: "fa-leaf" },
  { id: "megas", label: "Nouvelles Mégas", icon: "fa-bolt" },
  { id: "speciaux", label: "Pokémons Spéciaux", icon: "fa-star" },
];

/** Normalise un nom pour la recherche */
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trouve l'entrée pokedex (sprite + types) par nom */
function findPokedexEntry(name, entries) {
  if (!name || !entries?.length) return null;
  const n = normalizeName(name);
  let e = entries.find((x) => normalizeName(x.name) === n);
  if (e) return e;
  const nAlt = n.replace(/\s+/g, "-");
  e = entries.find(
    (x) =>
      normalizeName(x.name) === nAlt ||
      normalizeName(x.name).replace(/\s+/g, "-") === n
  );
  if (e) return e;
  const baseName = n.replace(/^mega\s*-?\s*/i, "").trim();
  e = entries.find((x) => normalizeName(x.name) === baseName);
  if (e) return e;
  e = entries.find(
    (x) =>
      n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n)
  );
  return e || null;
}

/** Extrait les types: pokedex en priorité, sinon parse "Eau/Psy" */
function getTypes(row, pokedexEntry) {
  if (pokedexEntry?.types?.length) {
    return pokedexEntry.types.map((t) => TYPE_LABELS[t] || t);
  }
  const str = row.type || "";
  return str
    .split(/[/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
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
  electr: "#f8d030",
  fee: "#ee99ac",
  tenebres: "#705848",
  roche: "#b8a038",
  acier: "#b8b8d0",
  normal: "#a8a878",
  insecte: "#a8b820",
  aspic: "#a08060",
  neant: "#5a5a8a",
};

const TYPE_LABELS = {
  plante: "Plante", feu: "Feu", eau: "Eau", glace: "Glace", malice: "Malice",
  poison: "Poison", vol: "Vol", dragon: "Dragon", sol: "Sol", combat: "Combat",
  spectre: "Spectre", psy: "Psy", electrik: "Électrik", electr: "Électrik",
  fee: "Fée", tenebres: "Ténèbres", roche: "Roche", acier: "Acier",
  normal: "Normal", insecte: "Insecte", aspic: "Aspic", neant: "Néant",
};

function getTypeKey(label) {
  return Object.entries(TYPE_LABELS).find(
    ([, v]) => v.toLowerCase() === (label || "").toLowerCase()
  )?.[0] || label?.toLowerCase().replace(/[^a-z]/g, "") || "normal";
}

function TypeBadges({ types }) {
  if (!types?.length) return <span className="bst-type-empty">—</span>;
  return (
    <span className="bst-type-badges">
      {types.map((t) => {
        const key = getTypeKey(t);
        const color = TYPE_COLORS[key] || TYPE_COLORS.normal;
        return (
          <span
            key={t}
            className="bst-type-badge"
            style={{
              background: `linear-gradient(135deg, ${color}44, ${color}22)`,
              borderColor: color,
              color: color,
              boxShadow: `0 0 12px ${color}40`,
            }}
          >
            {t}
          </span>
        );
      })}
    </span>
  );
}

function BSTTable({ id, title, icon, data, pokedexEntries, accent }) {
  const rows = useMemo(() => {
    return (data || []).map((row) => {
      const entry = findPokedexEntry(row.name, pokedexEntries);
      return {
        ...row,
        sprite: entry?.imageUrl || PLACEHOLDER_SPRITE,
        types: getTypes(row, entry),
      };
    });
  }, [data, pokedexEntries]);

  return (
    <section className="bst-section" data-accent={accent}>
      <div className="bst-section-header">
        <i className={`fa-solid ${icon} bst-section-icon`} />
        <h2 className="bst-section-title">{title}</h2>
        <span className="bst-section-count">{rows.length} Pokémon</span>
      </div>
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
              <tr key={`${row.name}-${i}`} className="bst-row">
                <td className="bst-td-sprite">
                  <div className="bst-sprite-wrap">
                    <img
                      src={row.sprite}
                      alt=""
                      className="bst-sprite"
                      loading="lazy"
                      onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
                    />
                  </div>
                </td>
                <td className="bst-td-name">{row.name}</td>
                <td className="bst-td-type">
                  <TypeBadges types={row.types} />
                </td>
                <td className="bst-td-stat">{row.hp}</td>
                <td className="bst-td-stat">{row.atk}</td>
                <td className="bst-td-stat">{row.def}</td>
                <td className="bst-td-stat">{row.spa}</td>
                <td className="bst-td-stat">{row.spd}</td>
                <td className="bst-td-stat">{row.spe}</td>
                <td className="bst-td-total">
                  <span className="bst-total-value">{row.total}</span>
                </td>
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
  const [filter, setFilter] = useState("all");
  const pokedexEntries = pokedexData?.entries || [];

  const sections = useMemo(() => {
    const list = [
      {
        id: "fakemon",
        title: "Fakemon + Formes Régionales",
        icon: "fa-leaf",
        accent: "plante",
        data: bstData.fakemon,
      },
      {
        id: "megas",
        title: "Nouvelles Mégas",
        icon: "fa-bolt",
        accent: "electrik",
        data: bstData.megas,
      },
      {
        id: "speciaux",
        title: "Pokémons Spéciaux",
        icon: "fa-star",
        accent: "fee",
        data: bstData.speciaux,
      },
    ];
    if (filter === "all") return list;
    return list.filter((s) => s.id === filter);
  }, [filter]);

  return (
    <div className="page bst-page">
      <Sidebar />
      <div className="bst-bg">
        <div className="bst-bg-grid" />
        <div className="bst-bg-glow bst-bg-glow-1" />
        <div className="bst-bg-glow bst-bg-glow-2" />
      </div>
      <main className="bst-main">
        <header className="bst-header">
          <Link to="/" className="bst-back">
            <i className="fa-solid fa-arrow-left" />
            Retour
          </Link>
          <div className="bst-title-block">
            <h1 className="bst-title">
              <i className="fa-solid fa-chart-line" />
              All BST + new Abilities
            </h1>
            <p className="bst-subtitle">
              Statistiques de base et talents des Fakemon, Mégas et Pokémon spéciaux
            </p>
          </div>

          <div className="bst-filter">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`bst-filter-btn ${filter === opt.id ? "bst-filter-btn--active" : ""}`}
                onClick={() => setFilter(opt.id)}
              >
                <i className={`fa-solid ${opt.icon}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="bst-content">
          {sections.map((s) => (
            <BSTTable
              key={s.id}
              id={s.id}
              title={s.title}
              icon={s.icon}
              data={s.data}
              pokedexEntries={pokedexEntries}
              accent={s.accent}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
