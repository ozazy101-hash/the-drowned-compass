// Deterministic offline import of baseline-ordered text from the official SRD 5.2.1 PDF.
import fs from "node:fs";
const source = JSON.parse(
  fs.readFileSync(
    new URL("../src/data/srd/spell-source-5.2.1.json", import.meta.url),
    "utf8",
  ),
);
const text = source
  .map((p) => p.text.replace(/System Reference Document 5\.2\.1\n\d+\n/g, ""))
  .join("\n");
const heading =
  /^([^\n]+)\n((?:Level [1-9] [A-Za-z]+|[A-Za-z]+ Cantrip) \([^)]*\))\s*\nCasting Time:/gm;
const starts = [...text.matchAll(heading)];
const repair = (s) =>
  s
    .replace(
      /([\w-]+)\s*-\s*\n\s*(\w)/g,
      (_, word, next) =>
        `${word}${/\d|-/.test(word) || ["higher", "lower", "half", "short", "long", "one", "two", "three"].includes(word.toLowerCase()) ? "-" : ""}${next}`,
    )
    .trim();
const normalize = (s) => repair(s).replace(/\s+/g, " ");
const spells = starts.map((m, i) => {
  const block = text.slice(m.index, starts[i + 1]?.index ?? text.length);
  const name = normalize(m[1])
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/’S\b/g, "’s");
  const meta = normalize(m[2]);
  const body = block.slice(block.indexOf("Casting Time:"));
  const fields = body.match(
    /^Casting Time: ([\s\S]*?)\nRange: ([\s\S]*?)\nComponents?: ([\s\S]*?)\nDuration: ([^\n]+)([\s\S]*)$/,
  );
  if (!fields) throw new Error(name);
  // Duration may wrap onto an unindented second line, notably hour/minute.
  let duration = fields[4],
    description = fields[5];
  if (description.match(/^\n(?:hour|minute|day|round|until|spell)[^\n]*\n/)) {
    const end = description.indexOf("\n", 1);
    duration += " " + description.slice(1, end);
    description = description.slice(end);
  }
  const statNames = {
    "Animate Objects": "Animated Object",
    "Find Steed": "Otherworldly Steed",
    "Giant Insect": "Giant Insect",
    "Summon Dragon": "Draconic Spirit",
  };
  const statName = statNames[name];
  const statStart = statName ? description.indexOf("\n" + statName + "\n") : -1;
  const statBlock = statStart < 0 ? null : description.slice(statStart).trim();
  if (statStart >= 0) description = description.slice(0, statStart);
  let tables = [];
  if (name === "Teleport") {
    const match = description.match(
      /Teleportation Outcome\n[\s\S]*?False destination 01–50 51–00 — —/,
    );
    if (!match) throw new Error("Missing Teleport source table");
    tables = [
      {
        caption: "Teleportation Outcome",
        headers: [
          "Familiarity",
          "Mishap",
          "Similar Area",
          "Off Target",
          "On Target",
        ],
        rows: [
          ["Permanent circle", "—", "—", "—", "01–00"],
          ["Linked object", "—", "—", "—", "01–00"],
          ["Very familiar", "01–05", "06–13", "14–24", "25–00"],
          ["Seen casually", "01–33", "34–43", "44–53", "54–00"],
          ["Viewed once or described", "01–43", "44–53", "54–73", "74–00"],
          ["False destination", "01–50", "51–00", "—", "—"],
        ],
      },
    ];
    description = description.replace(
      match[0],
      "[Teleportation Outcome table below]",
    );
  }
  if (name === "Reincarnate") {
    const match = description.match(
      /1d10 Species 1d10 Species\n[\s\S]*?5 Gnome 10 Tiefling/,
    );
    if (!match) throw new Error("Missing Reincarnate source table");
    tables = [
      {
        caption: "Reincarnate species",
        headers: ["1d10", "Species"],
        rows: [
          ["1", "Roll again."],
          ["2", "Dragonborn"],
          ["3", "Dwarf"],
          ["4", "Elf"],
          ["5", "Gnome"],
          ["6", "Goliath"],
          ["7", "Halfling"],
          ["8", "Human"],
          ["9", "Orc"],
          ["10", "Tiefling"],
        ],
      },
    ];
    description = description.replace(
      match[0],
      "[Reincarnate species table below]",
    );
  }
  const higher = description.search(
    /Using a Higher-Level Spell Slot\.|Cantrip Upgrade\./,
  );
  const offset = m.index;
  let remaining = offset,
    page = 107;
  for (const p of source) {
    const cleaned = p.text.replace(
      /System Reference Document 5\.2\.1\n\d+\n/g,
      "",
    );
    if (remaining < cleaned.length + 1) {
      page = p.page;
      break;
    }
    remaining -= cleaned.length + 1;
  }
  const components = normalize(fields[3]);
  return {
    id: `srd-5.2.1:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    level: meta.includes("Cantrip") ? 0 : Number(meta[6]),
    school: meta.includes("Cantrip") ? meta.split(" ")[0] : meta.split(" ")[2],
    classes: meta
      .slice(meta.indexOf("(") + 1, -1)
      .split(",")
      .map((s) => s.trim()),
    castingTime: normalize(fields[1]),
    range: normalize(fields[2]),
    components: components.replace(/ \([\s\S]*\)$/, ""),
    material: components.includes("(")
      ? components.slice(components.indexOf("(") + 1, -1)
      : null,
    duration: normalize(duration),
    ritual: fields[1].includes("Ritual"),
    concentration: duration.includes("Concentration"),
    description: repair(
      higher < 0 ? description : description.slice(0, higher),
    ),
    statBlock,
    tables,
    higherLevel: higher < 0 ? null : normalize(description.slice(higher)),
    source: { version: "5.2.1", license: "CC-BY-4.0", page },
  };
});
if (spells.length !== 339)
  throw new Error(`Expected 339 spells, got ${spells.length}`);
fs.writeFileSync(
  new URL("../src/data/srd/spells-5.2.1.json", import.meta.url),
  JSON.stringify(spells, null, 2) + "\n",
);
console.log(
  `${spells.length} spells`,
  Object.fromEntries(
    Array.from({ length: 10 }, (_, level) => [
      level,
      spells.filter((s) => s.level === level).length,
    ]),
  ),
);
