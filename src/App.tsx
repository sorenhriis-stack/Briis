import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgePlus,
  BarChart3,
  BottleWine,
  Check,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  Edit3,
  Grape,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
  Wine,
} from "lucide-react";

type Tab = "cellar" | "add" | "tasting" | "ratings";
type Language = "en" | "da";
type TastingSource = "own_bottle" | "coravin" | "other";
type SortOption =
  | "vintage-desc"
  | "vintage-asc"
  | "region"
  | "grape"
  | "producer"
  | "rating-desc";

type WineRecord = {
  id: string;
  name: string;
  producer: string;
  vintage: number | null;
  grape: string;
  region: string;
  commune: string;
  country: string;
  bottleCount: number;
  externalRatingSource: string;
  externalRatingScore: number | null;
  createdAt: string;
};

type TastingRecord = {
  id: string;
  wineId: string | null;
  wineNameSnapshot: string;
  tastedAt: string;
  source: TastingSource;
  rating: number | null;
  color: string;
  noseNotes: string[];
  palateNotes: string[];
  structureNotes: string[];
  acidity: string;
  tannin: string;
  customNote: string;
  guesses: {
    vintage: number | null;
    grape: string;
    region: string;
    commune: string;
    producer: string;
  };
  guessScore: number | null;
  tastingNotes?: string[];
};

type WineForm = {
  name: string;
  producer: string;
  vintage: string;
  grape: string;
  region: string;
  commune: string;
  country: string;
  bottleCount: string;
  externalRatingSource: string;
  externalRatingScore: string;
};

type TastingForm = {
  wineId: string;
  outsideWineName: string;
  source: TastingSource;
  rating: string;
  color: string;
  acidity: string;
  tannin: string;
  customNote: string;
  guessVintage: string;
  guessGrape: string;
  guessRegion: string;
  guessCommune: string;
  guessProducer: string;
};

type CellarFilters = {
  vintage: string;
  region: string;
  grape: string;
  producer: string;
};

type CustomNotesByCategory = Record<string, string[]>;
type LocalizedText = Record<Language, string>;

type LocalizedOption = {
  value: string;
  label: LocalizedText;
};

type NoteCategory = {
  name: string;
  label: LocalizedText;
  notes: LocalizedOption[];
};

const defaultWineForm: WineForm = {
  name: "",
  producer: "",
  vintage: "",
  grape: "",
  region: "",
  commune: "",
  country: "",
  bottleCount: "1",
  externalRatingSource: "",
  externalRatingScore: "",
};

const defaultTastingForm: TastingForm = {
  wineId: "",
  outsideWineName: "",
  source: "other",
  rating: "",
  color: "",
  acidity: "M",
  tannin: "M",
  customNote: "",
  guessVintage: "",
  guessGrape: "",
  guessRegion: "",
  guessCommune: "",
  guessProducer: "",
};

const colorGroups: Array<{
  value: string;
  label: LocalizedText;
  colors: LocalizedOption[];
}> = [
  {
    value: "red",
    label: { en: "Red wines", da: "Rødvin" },
    colors: [
      { value: "red-purple", label: { en: "Purple", da: "Lilla" } },
      { value: "red-ruby", label: { en: "Ruby", da: "Rubin" } },
      { value: "red-garnet", label: { en: "Garnet", da: "Bordeauxrød" } },
      { value: "red-tawny", label: { en: "Tawny", da: "Gyldenbrun" } },
      { value: "red-brown", label: { en: "Brown", da: "Brun" } },
    ],
  },
  {
    value: "white",
    label: { en: "White wines", da: "Hvidvin" },
    colors: [
      { value: "white-lemon-green", label: { en: "Lemon-green", da: "Citrongrøn" } },
      { value: "white-lemon", label: { en: "Lemon", da: "Citron" } },
      { value: "white-gold", label: { en: "Gold", da: "Guld" } },
      { value: "white-amber", label: { en: "Amber", da: "Rav" } },
      { value: "white-brown", label: { en: "Brown", da: "Brun" } },
    ],
  },
  {
    value: "rose",
    label: { en: "Rosé wines", da: "Rosévin" },
    colors: [
      { value: "rose-pink", label: { en: "Pink", da: "Pink" } },
      { value: "rose-salmon", label: { en: "Salmon", da: "Laks" } },
      { value: "rose-orange", label: { en: "Orange", da: "Orange" } },
    ],
  },
];

const intensityScale = ["L-", "L", "L+", "M-", "M", "M+", "H-", "H", "H+"];

const noteCategories: NoteCategory[] = [
  {
    name: "Frugt og bær",
    label: { en: "Fruit and berries", da: "Frugt og bær" },
    notes: [
      { value: "Jordbær", label: { en: "Strawberry", da: "Jordbær" } },
      { value: "Hindbær", label: { en: "Raspberry", da: "Hindbær" } },
      { value: "Kirsebær", label: { en: "Cherry", da: "Kirsebær" } },
      { value: "Solbær", label: { en: "Blackcurrant", da: "Solbær" } },
      { value: "Brombær", label: { en: "Blackberry", da: "Brombær" } },
      { value: "Blomme", label: { en: "Plum", da: "Blomme" } },
      { value: "Æble", label: { en: "Apple", da: "Æble" } },
      { value: "Pære", label: { en: "Pear", da: "Pære" } },
      { value: "Citrus", label: { en: "Citrus", da: "Citrus" } },
      { value: "Grapefrugt", label: { en: "Grapefruit", da: "Grapefrugt" } },
      { value: "Abrikos", label: { en: "Apricot", da: "Abrikos" } },
      { value: "Fersken", label: { en: "Peach", da: "Fersken" } },
      { value: "Ananas", label: { en: "Pineapple", da: "Ananas" } },
    ],
  },
  {
    name: "Blomster og urter",
    label: { en: "Flowers and herbs", da: "Blomster og urter" },
    notes: [
      { value: "Viol", label: { en: "Violet", da: "Viol" } },
      { value: "Rose", label: { en: "Rose", da: "Rose" } },
      { value: "Hvid blomst", label: { en: "White flowers", da: "Hvid blomst" } },
      { value: "Lavendel", label: { en: "Lavender", da: "Lavendel" } },
      { value: "Mynte", label: { en: "Mint", da: "Mynte" } },
      { value: "Timian", label: { en: "Thyme", da: "Timian" } },
      { value: "Eukalyptus", label: { en: "Eucalyptus", da: "Eukalyptus" } },
      { value: "Grøn peber", label: { en: "Green bell pepper", da: "Grøn peber" } },
    ],
  },
  {
    name: "Jord, krydderi og animalsk",
    label: { en: "Earth, spice and animal", da: "Jord, krydderi og animalsk" },
    notes: [
      { value: "Skovbund", label: { en: "Forest floor", da: "Skovbund" } },
      { value: "Vådt løv", label: { en: "Wet leaves", da: "Vådt løv" } },
      { value: "Svamp", label: { en: "Mushroom", da: "Svamp" } },
      { value: "Læder", label: { en: "Leather", da: "Læder" } },
      { value: "Stald", label: { en: "Barnyard", da: "Stald" } },
      { value: "Peber", label: { en: "Pepper", da: "Peber" } },
      { value: "Lakrids", label: { en: "Liquorice", da: "Lakrids" } },
      { value: "Tobak", label: { en: "Tobacco", da: "Tobak" } },
      { value: "Cedertræ", label: { en: "Cedar", da: "Cedertræ" } },
      { value: "Røg", label: { en: "Smoke", da: "Røg" } },
    ],
  },
  {
    name: "Fad, gær og mineralitet",
    label: { en: "Oak, yeast and minerality", da: "Fad, gær og mineralitet" },
    notes: [
      { value: "Vanilje", label: { en: "Vanilla", da: "Vanilje" } },
      { value: "Kokos", label: { en: "Coconut", da: "Kokos" } },
      { value: "Kaffe", label: { en: "Coffee", da: "Kaffe" } },
      { value: "Chokolade", label: { en: "Chocolate", da: "Chokolade" } },
      { value: "Smør", label: { en: "Butter", da: "Smør" } },
      { value: "Brioche", label: { en: "Brioche", da: "Brioche" } },
      { value: "Brøddej", label: { en: "Bread dough", da: "Brøddej" } },
      { value: "Gær", label: { en: "Yeast", da: "Gær" } },
      { value: "Kridt", label: { en: "Chalk", da: "Kridt" } },
      { value: "Flint", label: { en: "Flint", da: "Flint" } },
      { value: "Salt", label: { en: "Salt", da: "Salt" } },
    ],
  },
];

const structureOptions: LocalizedOption[] = [
  { value: "Kort hale", label: { en: "Short finish", da: "Kort hale" } },
  { value: "Mellem hale", label: { en: "Medium finish", da: "Mellem hale" } },
  { value: "Lang hale", label: { en: "Long finish", da: "Lang hale" } },
  { value: "Let krop", label: { en: "Light body", da: "Let krop" } },
  { value: "Medium krop", label: { en: "Medium body", da: "Medium krop" } },
  { value: "Fyldig krop", label: { en: "Full body", da: "Fyldig krop" } },
  { value: "Fin mousse", label: { en: "Fine mousse", da: "Fin mousse" } },
  { value: "Cremet mousse", label: { en: "Creamy mousse", da: "Cremet mousse" } },
  { value: "Markant alkohol", label: { en: "Noticeable alcohol", da: "Markant alkohol" } },
  { value: "Balanceret", label: { en: "Balanced", da: "Balanceret" } },
  { value: "Reduktiv", label: { en: "Reductive", da: "Reduktiv" } },
  { value: "Oxidativ", label: { en: "Oxidative", da: "Oxidativ" } },
];

const starterWines: WineRecord[] = [
  {
    id: "starter-1",
    name: "Barolo",
    producer: "Cascina Fontana",
    vintage: 2019,
    grape: "Nebbiolo",
    region: "Piemonte",
    commune: "Barolo",
    country: "Italien",
    bottleCount: 3,
    externalRatingSource: "Manuel reference",
    externalRatingScore: 93,
    createdAt: new Date().toISOString(),
  },
  {
    id: "starter-2",
    name: "Bourgogne Pinot Noir",
    producer: "Domaine Leflaive",
    vintage: 2021,
    grape: "Pinot Noir",
    region: "Bourgogne",
    commune: "Puligny-Montrachet",
    country: "Frankrig",
    bottleCount: 2,
    externalRatingSource: "",
    externalRatingScore: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "starter-3",
    name: "Ribera del Duero",
    producer: "Bodegas Aalto",
    vintage: 2020,
    grape: "Tempranillo",
    region: "Castilla y León",
    commune: "Ribera del Duero",
    country: "Spanien",
    bottleCount: 4,
    externalRatingSource: "Manuel reference",
    externalRatingScore: 94,
    createdAt: new Date().toISOString(),
  },
];

const sourceLabels: Record<TastingSource, LocalizedText> = {
  own_bottle: { en: "Own bottle", da: "Egen flaske" },
  coravin: { en: "Coravin", da: "Coravin" },
  other: { en: "Someone else's wine", da: "Andens vin" },
};

const copy = {
  en: {
    overviewLabel: "Briis overview",
    tagline: "Your wine journal and cellar",
    bottles: "bottles",
    tastings: "tastings",
    ownAverage: "own avg",
    bestGuess: "best guess",
    tabsLabel: "Briis tabs",
    cellar: "Cellar",
    addWine: "Add wine",
    tasting: "Tasting",
    ratings: "Ratings",
    winesInStock: "Wines in stock",
    searchPlaceholder: "Search wine, grape or region",
    filtersLabel: "Cellar filters",
    filterAndSort: "Filter and sort",
    sorting: "Sorting",
    vintageNewest: "Vintage, newest first",
    vintageOldest: "Vintage, oldest first",
    vintage: "Vintage",
    region: "Region",
    grape: "Grape",
    producer: "Producer",
    ownRating: "Own rating",
    all: "All",
    producerMissing: "Producer missing",
    external: "External",
    removeBottle: "Remove one bottle",
    addBottle: "Add one bottle",
    removeFromCellar: "Remove from cellar",
    deleteWine: "Delete wine",
    deleteTasting: "Delete tasting",
    confirmDeleteWine: "Delete this wine? Existing tastings are kept as history.",
    confirmDeleteTasting:
      "Delete this tasting? Any own bottle or Coravin cellar adjustment is restored.",
    saveWineInCellar: "Save wine in cellar",
    wineName: "Wine name",
    wineNamePlaceholder: "Barolo, Riesling, Châteauneuf-du-Pape...",
    commune: "Commune",
    country: "Country",
    bottleCount: "Number of bottles",
    externalRatingSource: "External rating source",
    externalScore: "External score",
    saveWine: "Save wine",
    editTasting: "Edit tasting",
    analysisAndBlindGuess: "Analysis and blind guess",
    cancel: "Cancel",
    rating: "Rating",
    ratingPlaceholder: "Optional",
    color: "Color",
    chooseColor: "Choose color",
    acidity: "Acidity",
    tannin: "Tannin",
    nose: "Nose",
    aromaNotes: "Aroma notes",
    palate: "Palate",
    tastingNotes: "Tasting notes",
    addNoteUnder: "Add note under",
    addToNose: "Add to nose",
    addToPalate: "Add to palate",
    character: "Character",
    structureAndFinish: "Structure and finish",
    freeNote: "Free note",
    freeNotePlaceholder: "Structure, balance, serving, food pairing...",
    blindGuess: "Blind guess",
    whatDoYouThink: "What do you think the wine is?",
    revealAndCellar: "Reveal and cellar",
    fillWhenRevealed: "Fill in when the wine is revealed",
    revealedWine: "Revealed wine",
    notChosenYet: "Not chosen yet",
    outsideWineName: "Name if not in cellar",
    outsideWinePlaceholder: "Restaurant, friend, tasting...",
    bottleType: "Bottle type",
    saveChanges: "Save changes",
    saveTasting: "Save tasting",
    yourTastings: "Your tastings",
    noTastings: "No tastings yet.",
    guessScore: "guess score",
    edit: "Edit",
    colorPrefixAcidity: "Acidity",
    colorPrefixTannin: "Tannin",
    noseLabel: "Nose",
    palateLabel: "Palate",
    characterLabel: "Character",
    language: "Language",
    english: "English",
    danish: "Danish",
    draftTitle: "Draft-friendly",
    draftText: "You can save a tasting with only one field filled in, or with nothing but today's date.",
    untitledTasting: "Untitled tasting",
  },
  da: {
    overviewLabel: "Briis overblik",
    tagline: "Din vinjournal og kælder",
    bottles: "flasker",
    tastings: "smagninger",
    ownAverage: "egen snit",
    bestGuess: "bedste gæt",
    tabsLabel: "Briis faner",
    cellar: "Kælder",
    addWine: "Tilføj vin",
    tasting: "Smagning",
    ratings: "Ratings",
    winesInStock: "Vine på lager",
    searchPlaceholder: "Søg vin, drue eller område",
    filtersLabel: "Kælderfiltre",
    filterAndSort: "Filtrer og sorter",
    sorting: "Sortering",
    vintageNewest: "Årgang, nyeste først",
    vintageOldest: "Årgang, ældste først",
    vintage: "Årgang",
    region: "Område",
    grape: "Drue",
    producer: "Producent",
    ownRating: "Egen rating",
    all: "Alle",
    producerMissing: "Producent mangler",
    external: "Ekstern",
    removeBottle: "Fjern en flaske",
    addBottle: "Tilføj en flaske",
    removeFromCellar: "Fjern fra kælder",
    deleteWine: "Slet vin",
    deleteTasting: "Slet smagning",
    confirmDeleteWine: "Slet denne vin? Eksisterende smagninger bevares som historik.",
    confirmDeleteTasting:
      "Slet denne smagning? Eventuel egen flaske eller Coravin-træk lægges tilbage i kælderen.",
    saveWineInCellar: "Gem vin i kælderen",
    wineName: "Vinens navn",
    wineNamePlaceholder: "Barolo, Riesling, Châteauneuf-du-Pape...",
    commune: "Kommune",
    country: "Land",
    bottleCount: "Antal flasker",
    externalRatingSource: "Ekstern ratingkilde",
    externalScore: "Ekstern score",
    saveWine: "Gem vin",
    editTasting: "Rediger smagning",
    analysisAndBlindGuess: "Analyse og blindgæt",
    cancel: "Annuller",
    rating: "Rating",
    ratingPlaceholder: "Valgfri",
    color: "Farve",
    chooseColor: "Vælg farve",
    acidity: "Syre",
    tannin: "Tannin",
    nose: "Næse",
    aromaNotes: "Duftnoter",
    palate: "Smag",
    tastingNotes: "Smagsnoter",
    addNoteUnder: "Tilføj note under",
    addToNose: "Tilføj til næse",
    addToPalate: "Tilføj til smag",
    character: "Karakter",
    structureAndFinish: "Struktur og hale",
    freeNote: "Fri note",
    freeNotePlaceholder: "Struktur, balance, servering, madmatch...",
    blindGuess: "Blindgæt",
    whatDoYouThink: "Hvad tror du, vinen er?",
    revealAndCellar: "Facit og kælder",
    fillWhenRevealed: "Udfyld når vinen er afsløret",
    revealedWine: "Facitvin",
    notChosenYet: "Ikke valgt endnu",
    outsideWineName: "Navn hvis ikke i kælder",
    outsideWinePlaceholder: "Restaurant, ven, smagning...",
    bottleType: "Flasketype",
    saveChanges: "Gem ændringer",
    saveTasting: "Gem smagning",
    yourTastings: "Dine smagninger",
    noTastings: "Ingen smagninger endnu.",
    guessScore: "gættescore",
    edit: "Rediger",
    colorPrefixAcidity: "Syre",
    colorPrefixTannin: "Tannin",
    noseLabel: "Næse",
    palateLabel: "Smag",
    characterLabel: "Karakter",
    language: "Sprog",
    english: "Engelsk",
    danish: "Dansk",
    draftTitle: "Kladdevenlig",
    draftText: "Du kan gemme en smagning med kun ét udfyldt felt, eller helt uden andet end datoen.",
    untitledTasting: "Smagning uden titel",
  },
};

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;

    try {
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function createId() {
  return crypto.randomUUID();
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatBottleCount(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function compareText(guess: string, actual: string) {
  return guess.trim().toLowerCase() === actual.trim().toLowerCase();
}

function calculateGuessScore(
  guesses: TastingRecord["guesses"],
  wine: WineRecord | undefined,
) {
  if (!wine) return null;

  let score = 0;
  if (guesses.vintage && wine.vintage) {
    if (guesses.vintage === wine.vintage) score += 20;
    else if (Math.abs(guesses.vintage - wine.vintage) === 1) score += 10;
  }
  if (compareText(guesses.grape, wine.grape)) score += 20;
  if (compareText(guesses.region, wine.region)) score += 20;
  if (compareText(guesses.commune, wine.commune)) score += 20;
  if (compareText(guesses.producer, wine.producer)) score += 20;

  return score;
}

function average(numbers: Array<number | null | undefined>) {
  const validNumbers = numbers.filter((number): number is number => typeof number === "number");
  if (validNumbers.length === 0) return null;
  return Math.round(validNumbers.reduce((sum, number) => sum + number, 0) / validNumbers.length);
}

function uniqueValues(values: Array<string | number | null>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string | number => value !== null && value !== "")
        .map((value) => value.toString()),
    ),
  ).sort((a, b) => a.localeCompare(b, "da-DK", { numeric: true }));
}

function getConsumptionDelta(source: TastingSource) {
  if (source === "own_bottle") return -1;
  if (source === "coravin") return -0.2;
  return 0;
}

function safeNotes(tasting: TastingRecord) {
  return tasting.palateNotes ?? tasting.tastingNotes ?? [];
}

function labelForOption(options: LocalizedOption[], value: string, language: Language) {
  return options.find((option) => option.value === value)?.label[language] ?? value;
}

function displayColor(value: string, language: Language) {
  for (const group of colorGroups) {
    const color = group.colors.find((item) => item.value === value);
    if (color) return `${group.label[language]}: ${color.label[language]}`;
  }

  return value;
}

function displayNote(value: string, language: Language) {
  for (const category of noteCategories) {
    const note = category.notes.find((item) => item.value === value);
    if (note) return note.label[language];
  }

  return value;
}

function displayNotes(values: string[], language: Language) {
  return values.map((value) => displayNote(value, language)).join(" · ") || "-";
}

function displayStructure(value: string, language: Language) {
  return labelForOption(structureOptions, value, language);
}

function App() {
  const [language, setLanguage] = useStoredState<Language>("briis.language", "en");
  const [activeTab, setActiveTab] = useState<Tab>("cellar");
  const [wines, setWines] = useStoredState<WineRecord[]>("briis.wines", starterWines);
  const [tastings, setTastings] = useStoredState<TastingRecord[]>(
    "briis.tastings",
    [],
  );
  const [customNoteOptions, setCustomNoteOptions] = useStoredState<CustomNotesByCategory>(
    "briis.customNotesByCategory",
    {},
  );
  const [wineForm, setWineForm] = useState<WineForm>(defaultWineForm);
  const [tastingForm, setTastingForm] = useState<TastingForm>(defaultTastingForm);
  const [selectedNoseNotes, setSelectedNoseNotes] = useState<string[]>([]);
  const [selectedPalateNotes, setSelectedPalateNotes] = useState<string[]>([]);
  const [selectedStructureNotes, setSelectedStructureNotes] = useState<string[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [cellarSort, setCellarSort] = useState<SortOption>("vintage-desc");
  const [cellarFilters, setCellarFilters] = useState<CellarFilters>({
    vintage: "",
    region: "",
    grape: "",
    producer: "",
  });
  const [editingTastingId, setEditingTastingId] = useState<string | null>(null);
  const t = copy[language];

  const noteGroups = useMemo(() => {
    return noteCategories.map((category) => ({
      key: category.name,
      label: category.label[language],
      notes: [
        ...category.notes.map((note) => ({
          label: note.label[language],
          value: note.value,
        })),
        ...(customNoteOptions[category.name] ?? []).map((note) => ({
          label: note,
          value: note,
        })),
      ],
    }));
  }, [customNoteOptions, language]);

  const ratingByWine = useMemo(() => {
    return wines.map((wine) => {
      const wineRatings = tastings
        .filter((tasting) => tasting.wineId === wine.id)
        .map((tasting) => tasting.rating);

      return {
        wineId: wine.id,
        averageRating: average(wineRatings),
        tastingCount: wineRatings.length,
      };
    });
  }, [tastings, wines]);

  const filterOptions = useMemo(
    () => ({
      vintages: uniqueValues(wines.map((wine) => wine.vintage)),
      regions: uniqueValues(wines.map((wine) => wine.region)),
      grapes: uniqueValues(wines.map((wine) => wine.grape)),
      producers: uniqueValues(wines.map((wine) => wine.producer)),
    }),
    [wines],
  );

  const filteredCellarWines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return wines
      .filter((wine) => wine.bottleCount > 0)
      .filter((wine) => {
        if (!search) return true;
        return [
          wine.name,
          wine.producer,
          wine.vintage?.toString() ?? "",
          wine.grape,
          wine.region,
          wine.commune,
          wine.country,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .filter((wine) => {
        if (cellarFilters.vintage && wine.vintage?.toString() !== cellarFilters.vintage) {
          return false;
        }
        if (cellarFilters.region && wine.region !== cellarFilters.region) return false;
        if (cellarFilters.grape && wine.grape !== cellarFilters.grape) return false;
        if (cellarFilters.producer && wine.producer !== cellarFilters.producer) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ratingA = ratingByWine.find((rating) => rating.wineId === a.id)?.averageRating ?? 0;
        const ratingB = ratingByWine.find((rating) => rating.wineId === b.id)?.averageRating ?? 0;

        if (cellarSort === "vintage-desc") return (b.vintage ?? 0) - (a.vintage ?? 0);
        if (cellarSort === "vintage-asc") return (a.vintage ?? 0) - (b.vintage ?? 0);
        if (cellarSort === "region") return a.region.localeCompare(b.region, "da-DK");
        if (cellarSort === "grape") return a.grape.localeCompare(b.grape, "da-DK");
        if (cellarSort === "producer") return a.producer.localeCompare(b.producer, "da-DK");
        return ratingB - ratingA;
      });
  }, [cellarFilters, cellarSort, ratingByWine, searchTerm, wines]);

  const cellarBottleTotal = wines.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const averageOwnRating = average(tastings.map((tasting) => tasting.rating));
  const bestGuessScore = Math.max(
    0,
    ...tastings
      .map((tasting) => tasting.guessScore)
      .filter((score): score is number => typeof score === "number"),
  );

  function updateWineForm(field: keyof WineForm, value: string) {
    setWineForm((current) => ({ ...current, [field]: value }));
  }

  function updateTastingForm(field: keyof TastingForm, value: string) {
    setTastingForm((current) => ({ ...current, [field]: value }));
  }

  function updateCellarFilter(field: keyof CellarFilters, value: string) {
    setCellarFilters((current) => ({ ...current, [field]: value }));
  }

  function addWine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const wine: WineRecord = {
      id: createId(),
      name: wineForm.name.trim(),
      producer: wineForm.producer.trim(),
      vintage: parseOptionalNumber(wineForm.vintage),
      grape: wineForm.grape.trim(),
      region: wineForm.region.trim(),
      commune: wineForm.commune.trim(),
      country: wineForm.country.trim(),
      bottleCount: Math.max(0, Number(wineForm.bottleCount) || 0),
      externalRatingSource: wineForm.externalRatingSource.trim(),
      externalRatingScore: parseOptionalNumber(wineForm.externalRatingScore),
      createdAt: new Date().toISOString(),
    };

    if (!wine.name) return;

    setWines((current) => [wine, ...current]);
    setWineForm(defaultWineForm);
    setActiveTab("cellar");
  }

  function changeBottleCount(wineId: string, amount: number) {
    setWines((current) =>
      current.map((wine) =>
        wine.id === wineId
          ? {
              ...wine,
              bottleCount: Math.max(
                0,
                Number((wine.bottleCount + amount).toFixed(1)),
              ),
            }
          : wine,
      ),
    );
  }

  function applyBottleDeltas(deltas: Array<{ wineId: string; amount: number }>) {
    if (deltas.length === 0) return;

    setWines((current) =>
      current.map((wine) => {
        const amount = deltas
          .filter((delta) => delta.wineId === wine.id)
          .reduce((sum, delta) => sum + delta.amount, 0);

        if (amount === 0) return wine;

        return {
          ...wine,
          bottleCount: Math.max(0, Number((wine.bottleCount + amount).toFixed(1))),
        };
      }),
    );
  }

  function removeFromCellar(wineId: string) {
    setWines((current) =>
      current.map((wine) =>
        wine.id === wineId ? { ...wine, bottleCount: 0 } : wine,
      ),
    );
  }

  function deleteWine(wineId: string) {
    if (!window.confirm(t.confirmDeleteWine)) return;

    setWines((current) => current.filter((wine) => wine.id !== wineId));
    setTastings((current) =>
      current.map((tasting) =>
        tasting.wineId === wineId ? { ...tasting, wineId: null } : tasting,
      ),
    );
    setTastingForm((current) =>
      current.wineId === wineId ? { ...current, wineId: "" } : current,
    );
  }

  function toggleListValue(
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function updateNoteDraft(draftKey: string, value: string) {
    setNoteDrafts((current) => ({ ...current, [draftKey]: value }));
  }

  function addCustomNoteTag(
    categoryName: string,
    draftKey: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) {
    const note = (noteDrafts[draftKey] ?? "").trim();
    const baseNotes =
      noteCategories.find((category) => category.name === categoryName)?.notes.map((item) => item.value) ??
      [];
    const existingNotes = [...baseNotes, ...(customNoteOptions[categoryName] ?? [])];

    if (
      !note ||
      existingNotes.some((existingNote) => existingNote.toLowerCase() === note.toLowerCase())
    ) {
      updateNoteDraft(draftKey, "");
      return;
    }

    setCustomNoteOptions((current) => ({
      ...current,
      [categoryName]: [...(current[categoryName] ?? []), note],
    }));
    setter((current) => [...current, note]);
    updateNoteDraft(draftKey, "");
  }

  function resetTastingForm() {
    setTastingForm(defaultTastingForm);
    setSelectedNoseNotes([]);
    setSelectedPalateNotes([]);
    setSelectedStructureNotes([]);
    setEditingTastingId(null);
  }

  function saveTasting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedWine = wines.find((wine) => wine.id === tastingForm.wineId);
    const guesses: TastingRecord["guesses"] = {
      vintage: parseOptionalNumber(tastingForm.guessVintage),
      grape: tastingForm.guessGrape.trim(),
      region: tastingForm.guessRegion.trim(),
      commune: tastingForm.guessCommune.trim(),
      producer: tastingForm.guessProducer.trim(),
    };
    const parsedRating = parseOptionalNumber(tastingForm.rating);

    const tasting: TastingRecord = {
      id: editingTastingId ?? createId(),
      wineId: selectedWine?.id ?? null,
      wineNameSnapshot:
        selectedWine?.name || tastingForm.outsideWineName.trim() || t.untitledTasting,
      tastedAt: editingTastingId
        ? tastings.find((item) => item.id === editingTastingId)?.tastedAt ??
          new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      source: tastingForm.source,
      rating:
        parsedRating === null
          ? null
          : Math.min(100, Math.max(1, parsedRating)),
      color: tastingForm.color,
      noseNotes: selectedNoseNotes,
      palateNotes: selectedPalateNotes,
      structureNotes: selectedStructureNotes,
      acidity: tastingForm.acidity,
      tannin: tastingForm.tannin,
      customNote: tastingForm.customNote.trim(),
      guesses,
      guessScore: calculateGuessScore(guesses, selectedWine),
    };

    const previousTasting = tastings.find((item) => item.id === editingTastingId);
    const deltas: Array<{ wineId: string; amount: number }> = [];

    if (previousTasting?.wineId) {
      deltas.push({
        wineId: previousTasting.wineId,
        amount: -getConsumptionDelta(previousTasting.source),
      });
    }

    if (selectedWine) {
      deltas.push({
        wineId: selectedWine.id,
        amount: getConsumptionDelta(tasting.source),
      });
    }

    setTastings((current) => {
      if (!editingTastingId) return [tasting, ...current];
      return current.map((item) => (item.id === editingTastingId ? tasting : item));
    });
    applyBottleDeltas(deltas);
    resetTastingForm();
    setActiveTab("ratings");
  }

  function editTasting(tasting: TastingRecord) {
    setEditingTastingId(tasting.id);
    setTastingForm({
      wineId: tasting.wineId ?? "",
      outsideWineName: tasting.wineId ? "" : tasting.wineNameSnapshot,
      source: tasting.source,
      rating: tasting.rating?.toString() ?? "",
      color: tasting.color ?? "",
      acidity: tasting.acidity ?? "M",
      tannin: tasting.tannin ?? "M",
      customNote: tasting.customNote ?? "",
      guessVintage: tasting.guesses.vintage?.toString() ?? "",
      guessGrape: tasting.guesses.grape,
      guessRegion: tasting.guesses.region,
      guessCommune: tasting.guesses.commune,
      guessProducer: tasting.guesses.producer,
    });
    setSelectedNoseNotes(tasting.noseNotes ?? []);
    setSelectedPalateNotes(safeNotes(tasting));
    setSelectedStructureNotes(tasting.structureNotes ?? []);
    setActiveTab("tasting");
  }

  function deleteTasting(tasting: TastingRecord) {
    if (!window.confirm(t.confirmDeleteTasting)) return;

    if (tasting.wineId) {
      applyBottleDeltas([
        {
          wineId: tasting.wineId,
          amount: -getConsumptionDelta(tasting.source),
        },
      ]);
    }

    setTastings((current) => current.filter((item) => item.id !== tasting.id));

    if (editingTastingId === tasting.id) {
      resetTastingForm();
    }
  }

  function getWineRating(wineId: string) {
    return ratingByWine.find((rating) => rating.wineId === wineId);
  }

  return (
    <main className="appShell">
      <section className="topbar" aria-label={t.overviewLabel}>
        <div className="brandBlock">
          <div className="brandMark" aria-hidden="true">
            <Wine size={28} />
          </div>
          <div>
            <p className="eyebrow">Briis</p>
            <h1>{t.tagline}</h1>
          </div>
        </div>

        <label className="languageSelect">
          <span>{t.language}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="en">{t.english}</option>
            <option value="da">{t.danish}</option>
          </select>
        </label>

        <div className="metricStrip" aria-label="Nøgletal">
          <div>
            <span>{formatBottleCount(cellarBottleTotal)}</span>
            <p>{t.bottles}</p>
          </div>
          <div>
            <span>{tastings.length}</span>
            <p>{t.tastings}</p>
          </div>
          <div>
            <span>{averageOwnRating ?? "-"}</span>
            <p>{t.ownAverage}</p>
          </div>
          <div>
            <span>{bestGuessScore}</span>
            <p>{t.bestGuess}</p>
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label={t.tabsLabel}>
        <button
          className={activeTab === "cellar" ? "active" : ""}
          onClick={() => setActiveTab("cellar")}
          type="button"
        >
          <Archive size={18} />
          {t.cellar}
        </button>
        <button
          className={activeTab === "add" ? "active" : ""}
          onClick={() => setActiveTab("add")}
          type="button"
        >
          <BadgePlus size={18} />
          {t.addWine}
        </button>
        <button
          className={activeTab === "tasting" ? "active" : ""}
          onClick={() => setActiveTab("tasting")}
          type="button"
        >
          <Grape size={18} />
          {t.tasting}
        </button>
        <button
          className={activeTab === "ratings" ? "active" : ""}
          onClick={() => setActiveTab("ratings")}
          type="button"
        >
          <BarChart3 size={18} />
          {t.ratings}
        </button>
      </nav>

      {activeTab === "cellar" && (
        <section className="viewStack">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.cellar}</p>
              <h2>{t.winesInStock}</h2>
            </div>
            <label className="searchBox">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t.searchPlaceholder}
              />
            </label>
          </div>

          <div className="filterPanel" aria-label={t.filtersLabel}>
            <div className="filterTitle">
              <SlidersHorizontal size={18} />
              <span>{t.filterAndSort}</span>
            </div>
            <label>
              {t.sorting}
              <select
                value={cellarSort}
                onChange={(event) => setCellarSort(event.target.value as SortOption)}
              >
                <option value="vintage-desc">{t.vintageNewest}</option>
                <option value="vintage-asc">{t.vintageOldest}</option>
                <option value="region">{t.region}</option>
                <option value="grape">{t.grape}</option>
                <option value="producer">{t.producer}</option>
                <option value="rating-desc">{t.ownRating}</option>
              </select>
            </label>
            <label>
              {t.vintage}
              <select
                value={cellarFilters.vintage}
                onChange={(event) => updateCellarFilter("vintage", event.target.value)}
              >
                <option value="">{t.all}</option>
                {filterOptions.vintages.map((vintage) => (
                  <option key={vintage} value={vintage}>
                    {vintage}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.region}
              <select
                value={cellarFilters.region}
                onChange={(event) => updateCellarFilter("region", event.target.value)}
              >
                <option value="">{t.all}</option>
                {filterOptions.regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.grape}
              <select
                value={cellarFilters.grape}
                onChange={(event) => updateCellarFilter("grape", event.target.value)}
              >
                <option value="">{t.all}</option>
                {filterOptions.grapes.map((grape) => (
                  <option key={grape} value={grape}>
                    {grape}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.producer}
              <select
                value={cellarFilters.producer}
                onChange={(event) => updateCellarFilter("producer", event.target.value)}
              >
                <option value="">{t.all}</option>
                {filterOptions.producers.map((producer) => (
                  <option key={producer} value={producer}>
                    {producer}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="wineGrid">
            {filteredCellarWines.map((wine) => {
              const ownRating = getWineRating(wine.id);

              return (
                <article className="wineCard" key={wine.id}>
                  <div className="labelArt" aria-hidden="true">
                    <BottleWine size={42} />
                  </div>
                  <div className="wineCardMain">
                    <div>
                      <p className="wineMeta">
                        {[wine.vintage, wine.grape, wine.country]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <h3>{wine.name}</h3>
                      <p>{wine.producer || t.producerMissing}</p>
                    </div>
                    <dl className="cardStats">
                      <div>
                        <dt>{t.bottles}</dt>
                        <dd>{formatBottleCount(wine.bottleCount)}</dd>
                      </div>
                      <div>
                        <dt>{t.ownRating}</dt>
                        <dd>{ownRating?.averageRating ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>{t.external}</dt>
                        <dd>{wine.externalRatingScore ?? "-"}</dd>
                      </div>
                    </dl>
                    <div className="actionRow">
                      <button
                        className="iconButton"
                        onClick={() => changeBottleCount(wine.id, -1)}
                        title={t.removeBottle}
                        type="button"
                      >
                        <CircleMinus size={18} />
                      </button>
                      <button
                        className="iconButton"
                        onClick={() => changeBottleCount(wine.id, 1)}
                        title={t.addBottle}
                        type="button"
                      >
                        <CirclePlus size={18} />
                      </button>
                      <button
                        className="ghostButton"
                        onClick={() => removeFromCellar(wine.id)}
                        type="button"
                      >
                        {t.removeFromCellar}
                      </button>
                      <button
                        className="iconButton dangerIcon"
                        onClick={() => deleteWine(wine.id)}
                        title={t.deleteWine}
                        type="button"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "add" && (
        <section className="formLayout">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.addWine}</p>
              <h2>{t.saveWineInCellar}</h2>
            </div>
          </div>

          <form className="panelForm" onSubmit={addWine}>
            <label>
              {t.wineName}
              <input
                required
                value={wineForm.name}
                onChange={(event) => updateWineForm("name", event.target.value)}
                placeholder={t.wineNamePlaceholder}
              />
            </label>
            <label>
              {t.producer}
              <input
                value={wineForm.producer}
                onChange={(event) => updateWineForm("producer", event.target.value)}
                placeholder={t.producer}
              />
            </label>
            <div className="formGrid">
              <label>
                {t.vintage}
                <input
                  inputMode="numeric"
                  value={wineForm.vintage}
                  onChange={(event) => updateWineForm("vintage", event.target.value)}
                  placeholder="2020"
                />
              </label>
              <label>
                {t.grape}
                <input
                  value={wineForm.grape}
                  onChange={(event) => updateWineForm("grape", event.target.value)}
                  placeholder="Nebbiolo"
                />
              </label>
              <label>
                {t.region}
                <input
                  value={wineForm.region}
                  onChange={(event) => updateWineForm("region", event.target.value)}
                  placeholder="Piemonte"
                />
              </label>
              <label>
                {t.commune}
                <input
                  value={wineForm.commune}
                  onChange={(event) => updateWineForm("commune", event.target.value)}
                  placeholder="Barolo"
                />
              </label>
              <label>
                {t.country}
                <input
                  value={wineForm.country}
                  onChange={(event) => updateWineForm("country", event.target.value)}
                  placeholder="Italien"
                />
              </label>
              <label>
                {t.bottleCount}
                <input
                  inputMode="decimal"
                  min="0"
                  step="1"
                  type="number"
                  value={wineForm.bottleCount}
                  onChange={(event) =>
                    updateWineForm("bottleCount", event.target.value)
                  }
                />
              </label>
              <label>
                {t.externalRatingSource}
                <input
                  value={wineForm.externalRatingSource}
                  onChange={(event) =>
                    updateWineForm("externalRatingSource", event.target.value)
                  }
                  placeholder="Wine Spectator, Vinous..."
                />
              </label>
              <label>
                {t.externalScore}
                <input
                  inputMode="numeric"
                  max="100"
                  min="1"
                  type="number"
                  value={wineForm.externalRatingScore}
                  onChange={(event) =>
                    updateWineForm("externalRatingScore", event.target.value)
                  }
                  placeholder="94"
                />
              </label>
            </div>
            <button className="primaryButton" type="submit">
              <Check size={18} />
              {t.saveWine}
            </button>
          </form>
        </section>
      )}

      {activeTab === "tasting" && (
        <section className="formLayout">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.tasting}</p>
              <h2>{editingTastingId ? t.editTasting : t.analysisAndBlindGuess}</h2>
            </div>
            {editingTastingId && (
              <button className="ghostButton" onClick={resetTastingForm} type="button">
                <X size={18} />
                {t.cancel}
              </button>
            )}
          </div>

          <form className="panelForm" onSubmit={saveTasting}>
            <div className="draftNotice">
              <strong>{t.draftTitle}</strong>
              <span>{t.draftText}</span>
            </div>
            <div className="formGrid">
              <label>
                {t.rating}
                <input
                  max="100"
                  min="1"
                  placeholder={t.ratingPlaceholder}
                  type="number"
                  value={tastingForm.rating}
                  onChange={(event) => updateTastingForm("rating", event.target.value)}
                />
              </label>
              <label>
                {t.color}
                <select
                  value={tastingForm.color}
                  onChange={(event) => updateTastingForm("color", event.target.value)}
                >
                  <option value="">{t.chooseColor}</option>
                  {colorGroups.map((group) => (
                    <optgroup key={group.value} label={group.label[language]}>
                      {group.colors.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label[language]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                {t.acidity}
                <select
                  value={tastingForm.acidity}
                  onChange={(event) => updateTastingForm("acidity", event.target.value)}
                >
                  {intensityScale.map((step) => (
                    <option key={step} value={step}>
                      {step}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.tannin}
                <select
                  value={tastingForm.tannin}
                  onChange={(event) => updateTastingForm("tannin", event.target.value)}
                >
                  {intensityScale.map((step) => (
                    <option key={step} value={step}>
                      {step}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="noteSection">
              <div>
                <p className="eyebrow">{t.nose}</p>
                <h3>{t.aromaNotes}</h3>
              </div>
              {noteGroups.map((group) => (
                <div className="noteGroup" key={`nose-${group.key}`}>
                  <p>{group.label}</p>
                  <div className="notePicker">
                    {group.notes.map((note) => (
                      <button
                        className={
                          selectedNoseNotes.includes(note.value) ? "noteChip selected" : "noteChip"
                        }
                        key={`nose-${note.value}`}
                        onClick={() => toggleListValue(note.value, setSelectedNoseNotes)}
                        type="button"
                      >
                        {note.label}
                      </button>
                    ))}
                  </div>
                  <div className="categoryNoteInput">
                    <input
                      value={noteDrafts[`nose-${group.key}`] ?? ""}
                      onChange={(event) =>
                        updateNoteDraft(`nose-${group.key}`, event.target.value)
                      }
                      placeholder={`${t.addNoteUnder} ${group.label.toLowerCase()}`}
                    />
                    <button
                      className="secondaryButton"
                      onClick={() =>
                        addCustomNoteTag(group.key, `nose-${group.key}`, setSelectedNoseNotes)
                      }
                      type="button"
                    >
                      <BadgePlus size={18} />
                      {t.addToNose}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="noteSection">
              <div>
                <p className="eyebrow">{t.palate}</p>
                <h3>{t.tastingNotes}</h3>
              </div>
              {noteGroups.map((group) => (
                <div className="noteGroup" key={`palate-${group.key}`}>
                  <p>{group.label}</p>
                  <div className="notePicker">
                    {group.notes.map((note) => (
                      <button
                        className={
                          selectedPalateNotes.includes(note.value)
                            ? "noteChip selected"
                            : "noteChip"
                        }
                        key={`palate-${note.value}`}
                        onClick={() => toggleListValue(note.value, setSelectedPalateNotes)}
                        type="button"
                      >
                        {note.label}
                      </button>
                    ))}
                  </div>
                  <div className="categoryNoteInput">
                    <input
                      value={noteDrafts[`palate-${group.key}`] ?? ""}
                      onChange={(event) =>
                        updateNoteDraft(`palate-${group.key}`, event.target.value)
                      }
                      placeholder={`${t.addNoteUnder} ${group.label.toLowerCase()}`}
                    />
                    <button
                      className="secondaryButton"
                      onClick={() =>
                        addCustomNoteTag(
                          group.key,
                          `palate-${group.key}`,
                          setSelectedPalateNotes,
                        )
                      }
                      type="button"
                    >
                      <BadgePlus size={18} />
                      {t.addToPalate}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="noteSection">
              <div>
                <p className="eyebrow">{t.character}</p>
                <h3>{t.structureAndFinish}</h3>
              </div>
              <div className="notePicker">
                {structureOptions.map((note) => (
                  <button
                    className={
                      selectedStructureNotes.includes(note.value)
                        ? "noteChip selected"
                        : "noteChip"
                    }
                    key={note.value}
                    onClick={() => toggleListValue(note.value, setSelectedStructureNotes)}
                    type="button"
                  >
                    {note.label[language]}
                  </button>
                ))}
              </div>
            </div>

            <label>
              {t.freeNote}
              <textarea
                rows={4}
                value={tastingForm.customNote}
                onChange={(event) => updateTastingForm("customNote", event.target.value)}
                placeholder={t.freeNotePlaceholder}
              />
            </label>

            <div className="guessBlock">
              <div>
                <p className="eyebrow">{t.blindGuess}</p>
                <h3>{t.whatDoYouThink}</h3>
              </div>
              <div className="formGrid">
                <label>
                  {t.vintage}
                  <input
                    inputMode="numeric"
                    value={tastingForm.guessVintage}
                    onChange={(event) =>
                      updateTastingForm("guessVintage", event.target.value)
                    }
                    placeholder="2019"
                  />
                </label>
                <label>
                  {t.grape}
                  <input
                    value={tastingForm.guessGrape}
                    onChange={(event) =>
                      updateTastingForm("guessGrape", event.target.value)
                    }
                    placeholder="Nebbiolo"
                  />
                </label>
                <label>
                  {t.region}
                  <input
                    value={tastingForm.guessRegion}
                    onChange={(event) =>
                      updateTastingForm("guessRegion", event.target.value)
                    }
                    placeholder="Piemonte"
                  />
                </label>
                <label>
                  {t.commune}
                  <input
                    value={tastingForm.guessCommune}
                    onChange={(event) =>
                      updateTastingForm("guessCommune", event.target.value)
                    }
                    placeholder="Barolo"
                  />
                </label>
                <label>
                  {t.producer}
                  <input
                    value={tastingForm.guessProducer}
                    onChange={(event) =>
                      updateTastingForm("guessProducer", event.target.value)
                    }
                    placeholder="Producent"
                  />
                </label>
              </div>
            </div>

            <div className="guessBlock">
              <div>
                <p className="eyebrow">{t.revealAndCellar}</p>
                <h3>{t.fillWhenRevealed}</h3>
              </div>
              <div className="formGrid">
                <label>
                  {t.revealedWine}
                  <select
                    value={tastingForm.wineId}
                    onChange={(event) => updateTastingForm("wineId", event.target.value)}
                  >
                    <option value="">{t.notChosenYet}</option>
                    {wines.map((wine) => (
                      <option key={wine.id} value={wine.id}>
                        {[wine.name, wine.producer, wine.vintage]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t.outsideWineName}
                  <input
                    disabled={Boolean(tastingForm.wineId)}
                    value={tastingForm.outsideWineName}
                    onChange={(event) =>
                      updateTastingForm("outsideWineName", event.target.value)
                    }
                    placeholder={t.outsideWinePlaceholder}
                  />
                </label>
                <label>
                  {t.bottleType}
                  <select
                    value={tastingForm.source}
                    onChange={(event) =>
                      updateTastingForm("source", event.target.value as TastingSource)
                    }
                  >
                    <option value="other">{sourceLabels.other[language]}</option>
                    <option value="own_bottle">{sourceLabels.own_bottle[language]}</option>
                    <option value="coravin">{sourceLabels.coravin[language]}</option>
                  </select>
                </label>
              </div>
            </div>

            <button className="primaryButton" type="submit">
              <Star size={18} />
              {editingTastingId ? t.saveChanges : t.saveTasting}
            </button>
          </form>
        </section>
      )}

      {activeTab === "ratings" && (
        <section className="viewStack">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.ratings}</p>
              <h2>{t.yourTastings}</h2>
            </div>
          </div>

          <div className="ratingList">
            {tastings.length === 0 && (
              <div className="emptyState">
                <ClipboardList size={36} />
                <p>{t.noTastings}</p>
              </div>
            )}

            {tastings.map((tasting) => (
              <article className="ratingRow" key={tasting.id}>
                <div className="scoreBadge">{tasting.rating ?? "-"}</div>
                <div>
                  <p className="wineMeta">
                    {new Date(tasting.tastedAt).toLocaleDateString("da-DK")} ·{" "}
                    {sourceLabels[tasting.source][language]}
                  </p>
                  <h3>{tasting.wineNameSnapshot}</h3>
                  <p>
                    {[
                      tasting.color ? displayColor(tasting.color, language) : "",
                      `${t.colorPrefixAcidity} ${tasting.acidity ?? "-"}`,
                      `${t.colorPrefixTannin} ${tasting.tannin ?? "-"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p>{t.noseLabel}: {displayNotes(tasting.noseNotes ?? [], language)}</p>
                  <p>{t.palateLabel}: {displayNotes(safeNotes(tasting), language)}</p>
                  {(tasting.structureNotes ?? []).length > 0 && (
                    <p>
                      {t.characterLabel}:{" "}
                      {(tasting.structureNotes ?? [])
                        .map((note) => displayStructure(note, language))
                        .join(" · ")}
                    </p>
                  )}
                  {tasting.customNote && <p>{tasting.customNote}</p>}
                </div>
                <div className="ratingActions">
                  <div className="guessScore">
                    <span>{tasting.guessScore ?? "-"}</span>
                    <p>{t.guessScore}</p>
                  </div>
                  <button
                    className="ghostButton compactButton"
                    onClick={() => editTasting(tasting)}
                    type="button"
                  >
                    <Edit3 size={17} />
                    {t.edit}
                  </button>
                  <button
                    className="ghostButton dangerButton compactButton"
                    onClick={() => deleteTasting(tasting)}
                    type="button"
                  >
                    <Trash2 size={17} />
                    {t.deleteTasting}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
