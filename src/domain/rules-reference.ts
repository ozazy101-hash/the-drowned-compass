// Application-owned summaries of SRD 5.2.1; see docs/rules/srd-conditions.md.
export type RulesReference = { name: string; paragraphs: readonly string[] };
export const rulesReferences: Readonly<Record<string, RulesReference>> = {
  "Blinded": {
    "name": "Blinded",
    "paragraphs": [
      "You cannot see and automatically fail ability checks requiring sight.",
      "Attack rolls against you have Advantage; your attack rolls have Disadvantage."
    ]
  },
  "Charmed": {
    "name": "Charmed",
    "paragraphs": [
      "You cannot attack the charmer or target them with damaging abilities or magical effects.",
      "The charmer has Advantage on ability checks to interact socially with you."
    ]
  },
  "Deafened": {
    "name": "Deafened",
    "paragraphs": [
      "You cannot hear and automatically fail ability checks requiring hearing."
    ]
  },
  "Exhaustion": {
    "name": "Exhaustion",
    "paragraphs": [
      "This condition is cumulative: each time you receive it, gain one level. At level 6, you die.",
      "Subtract twice your Exhaustion level from every D20 Test. Reduce your Speed by 5 feet per level.",
      "A Long Rest removes one level. At level 0, the condition ends."
    ]
  },
  "Frightened": {
    "name": "Frightened",
    "paragraphs": [
      "You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.",
      "You cannot willingly move closer to the source of fear."
    ]
  },
  "Grappled": {
    "name": "Grappled",
    "paragraphs": [
      "Your Speed is 0 and cannot increase.",
      "You have Disadvantage on attack rolls against targets other than the grappler.",
      "The grappler can drag or carry you, spending one extra foot per foot moved unless you are Tiny or at least two sizes smaller."
    ]
  },
  "Incapacitated": {
    "name": "Incapacitated",
    "paragraphs": [
      "You cannot take actions, Bonus Actions, or Reactions. Your Concentration is broken, and you cannot speak.",
      "If Incapacitated when rolling Initiative, you have Disadvantage on that roll."
    ]
  },
  "Invisible": {
    "name": "Invisible",
    "paragraphs": [
      "If Invisible when rolling Initiative, you have Advantage on the roll.",
      "Effects requiring a visible target cannot affect you unless their creator can somehow see you. Equipment you wear or carry is also concealed.",
      "Attack rolls against you have Disadvantage and your attack rolls have Advantage, except against creatures that can see you."
    ]
  },
  "Paralyzed": {
    "name": "Paralyzed",
    "paragraphs": [
      "You have the Incapacitated condition. Your Speed is 0 and cannot increase.",
      "You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage.",
      "An attack roll that hits you is a Critical Hit if the attacker is within 5 feet."
    ]
  },
  "Petrified": {
    "name": "Petrified",
    "paragraphs": [
      "You and your nonmagical worn and carried objects become a solid inanimate substance (usually stone). Your weight increases tenfold and you stop aging.",
      "You have the Incapacitated condition. Your Speed is 0 and cannot increase.",
      "Attack rolls against you have Advantage. You automatically fail Strength and Dexterity saving throws.",
      "You have Resistance to all damage and Immunity to the Poisoned condition."
    ]
  },
  "Poisoned": {
    "name": "Poisoned",
    "paragraphs": [
      "You have Disadvantage on attack rolls and ability checks."
    ]
  },
  "Prone": {
    "name": "Prone",
    "paragraphs": [
      "You can only crawl or spend half your Speed (rounded down) to stand and end this condition. You cannot stand if your Speed is 0.",
      "Your attack rolls have Disadvantage. Attack rolls against you have Advantage from attackers within 5 feet, and Disadvantage otherwise."
    ]
  },
  "Restrained": {
    "name": "Restrained",
    "paragraphs": [
      "Your Speed is 0 and cannot increase.",
      "Attack rolls against you have Advantage; your attack rolls have Disadvantage.",
      "You have Disadvantage on Dexterity saving throws."
    ]
  },
  "Stunned": {
    "name": "Stunned",
    "paragraphs": [
      "You have the Incapacitated condition.",
      "You automatically fail Strength and Dexterity saving throws. Attack rolls against you have Advantage."
    ]
  },
  "Unconscious": {
    "name": "Unconscious",
    "paragraphs": [
      "You have the Incapacitated and Prone conditions and drop whatever you hold. You remain Prone when Unconscious ends.",
      "Your Speed is 0 and cannot increase. Attack rolls against you have Advantage.",
      "You automatically fail Strength and Dexterity saving throws. An attack roll that hits you is a Critical Hit if the attacker is within 5 feet.",
      "You are unaware of your surroundings."
    ]
  },
  "Advantage": {
    "name": "Advantage",
    "paragraphs": [
      "Roll two d20s for the D20 Test and use the higher result. Multiple sources do not add more dice. If Advantage and Disadvantage both apply, they cancel regardless of how many sources there are."
    ]
  },
  "Disadvantage": {
    "name": "Disadvantage",
    "paragraphs": [
      "Roll two d20s for the D20 Test and use the lower result. Multiple sources do not add more dice. If Advantage and Disadvantage both apply, they cancel regardless of how many sources there are."
    ]
  },
  "Critical Hit": {
    "name": "Critical Hit",
    "paragraphs": [
      "When you score a Critical Hit, roll the damage dice twice, add them together, and then add the usual modifiers. Extra damage dice, such as Sneak Attack, are also rolled twice."
    ]
  },
  "Resistance": {
    "name": "Resistance",
    "paragraphs": [
      "Resistance to a damage type halves damage of that type, rounded down."
    ]
  },
  "Immunity": {
    "name": "Immunity",
    "paragraphs": [
      "Immunity to a damage type prevents damage of that type. Immunity to a condition prevents you from being affected by it."
    ]
  },
  "D20 Test": {
    "name": "D20 Test",
    "paragraphs": [
      "An ability check, saving throw, or attack roll is a D20 Test. Roll a d20, add applicable modifiers, and compare to the target number."
    ]
  },
  "Concentration": {
    "name": "Concentration",
    "paragraphs": [
      "Some spells and effects require Concentration. You can concentrate on only one at a time; it ends if you become Incapacitated or die. Damage can require a Constitution saving throw to maintain it."
    ]
  },
  "Initiative": {
    "name": "Initiative",
    "paragraphs": [
      "Initiative determines turn order in combat. Each participant makes a Dexterity check at the start of combat."
    ]
  },
  "Speed": {
    "name": "Speed",
    "paragraphs": [
      "Speed is how far you can move on your turn. Movement uses your available Speed."
    ]
  },
  "Long Rest": {
    "name": "Long Rest",
    "paragraphs": [
      "A Long Rest lasts at least 8 hours, including at least 6 hours of sleep and no more than 2 hours of light activity. A completed Long Rest removes one Exhaustion level. Consult the source for recovery and interruption rules."
    ]
  },
  "Bonus Action": {
    "name": "Bonus Action",
    "paragraphs": [
      "You can take a Bonus Action only when a rule grants one. You can take only one on your turn."
    ]
  },
  "Reactions": {
    "name": "Reactions",
    "paragraphs": [
      "A Reaction responds to a specified trigger. After taking one, you cannot take another until the start of your next turn."
    ]
  }
};
export const standardConditionNames = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"] as const;
export const srdSource = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';
