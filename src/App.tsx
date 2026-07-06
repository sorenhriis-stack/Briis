import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Archive,
  BadgePlus,
  BarChart3,
  BottleWine,
  Check,
  CircleMinus,
  CirclePlus,
  ClipboardList,
  Copy,
  Edit3,
  Grape,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
  X,
  Wine,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

type Tab = "cellar" | "add" | "tasting" | "ratings" | "profile";
type Language = "en" | "da";
type TastingSource = "own_bottle" | "coravin" | "other";
type RatingsView = "mine" | "friends";
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

type RevealedWineDetails = {
  name: string;
  producer: string;
  vintage: number | null;
  grape: string;
  region: string;
  commune: string;
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
  revealedWine: RevealedWineDetails;
  guessScore: number | null;
  tastingNotes?: string[];
};

type ProfileRecord = {
  userId: string;
  displayName: string;
  friendCode: string;
  createdAt: string;
  updatedAt: string;
};

type FriendRecord = {
  userId: string;
  displayName: string;
  friendCode: string;
  createdAt: string;
};

type FriendRatingRecord = {
  tastingId: string;
  friendUserId: string;
  friendName: string;
  wineName: string;
  rating: number | null;
  tastedAt: string;
  color: string;
  noseNotes: string[];
  palateNotes: string[];
  structureNotes: string[];
  acidity: string;
  tannin: string;
  guesses: TastingRecord["guesses"];
  revealedWine: RevealedWineDetails;
  guessScore: number | null;
  createdAt: string;
};

type DbWineRow = {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  grape: string | null;
  region: string | null;
  commune: string | null;
  country: string | null;
  bottle_count: number | string | null;
  external_rating_source: string | null;
  external_rating_score: number | null;
  created_at: string;
};

type DbTastingRow = {
  id: string;
  wine_id: string | null;
  wine_name_snapshot: string;
  tasted_at: string;
  source: TastingSource;
  rating: number | null;
  color: string | null;
  nose_notes: string[] | null;
  palate_notes: string[] | null;
  structure_notes: string[] | null;
  acidity: string | null;
  tannin: string | null;
  custom_note: string | null;
  guess_vintage: number | null;
  guess_grape: string | null;
  guess_region: string | null;
  guess_commune: string | null;
  guess_producer: string | null;
  revealed_wine_name: string | null;
  revealed_producer: string | null;
  revealed_vintage: number | null;
  revealed_grape: string | null;
  revealed_region: string | null;
  revealed_commune: string | null;
  guess_score: number | null;
  created_at: string;
};

type DbProfileRow = {
  user_id: string;
  display_name: string | null;
  friend_code: string;
  created_at: string;
  updated_at: string | null;
};

type DbFriendRow = {
  friend_user_id: string;
  display_name: string | null;
  friend_code: string;
  created_at: string;
};

type DbFriendRatingRow = {
  tasting_id: string;
  friend_user_id: string;
  friend_name: string | null;
  wine_name: string;
  rating: number | null;
  tasted_at: string;
  color: string | null;
  nose_notes: string[] | null;
  palate_notes: string[] | null;
  structure_notes: string[] | null;
  acidity: string | null;
  tannin: string | null;
  guess_vintage: number | null;
  guess_grape: string | null;
  guess_region: string | null;
  guess_commune: string | null;
  guess_producer: string | null;
  revealed_wine_name: string | null;
  revealed_producer: string | null;
  revealed_vintage: number | null;
  revealed_grape: string | null;
  revealed_region: string | null;
  revealed_commune: string | null;
  guess_score: number | null;
  created_at: string;
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
  revealedWineName: string;
  revealedProducer: string;
  revealedVintage: string;
  revealedGrape: string;
  revealedRegion: string;
  revealedCommune: string;
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
  revealedWineName: "",
  revealedProducer: "",
  revealedVintage: "",
  revealedGrape: "",
  revealedRegion: "",
  revealedCommune: "",
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
    profile: "Profile",
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
    revealedWineFromCellar: "Wine from cellar",
    notChosenYet: "Not chosen yet",
    manualRevealedWine: "Manual revealed wine",
    manualRevealedWineHelp: "Use this for restaurant, friend or tasting wines.",
    revealedWineName: "Wine name",
    revealedWinePlaceholder: "Restaurant, friend, tasting...",
    revealedWineDetailsLabel: "Revealed details",
    cellarWineLocksManualFields: "Chosen from cellar",
    bottleType: "Bottle type",
    saveChanges: "Save changes",
    saveTasting: "Save tasting",
    yourTastings: "Your tastings",
    myRatings: "My ratings",
    ratingsViewLabel: "Choose ratings view",
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
    signInTitle: "Sign in to Briis",
    signInText: "Use Google or an email login link to save your cellar and tastings securely.",
    signInWithGoogle: "Sign in with Google",
    orLoginWith: "Or",
    emailLoginLabel: "Email",
    emailLoginPlaceholder: "you@example.com",
    signInWithEmail: "Send login link",
    emailLoginSent: "Check your email for the login link.",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    loadingAccount: "Checking login...",
    loadingData: "Loading your cellar...",
    refreshData: "Refresh data",
    syncError: "Sync error",
    missingSupabaseConfig: "Supabase is missing URL or publishable key.",
    noWines: "No wines in your cellar yet.",
    draftTitle: "Draft-friendly",
    draftText: "You can save a tasting with only one field filled in, or with nothing but today's date.",
    untitledTasting: "Untitled tasting",
    profileAndFriends: "Profile and friend code",
    displayName: "Display name",
    displayNamePlaceholder: "Your name",
    saveProfile: "Save profile",
    profileSaved: "Profile saved.",
    friendCode: "Friend code",
    friendCodeHelp: "Share this code later when a friend wants to connect with you.",
    copyCode: "Copy code",
    copied: "Copied",
    communityFoundation: "Community foundation",
    communityFoundationText:
      "This is the first small step toward friends and shared ratings. Only you can see and edit your profile for now.",
    friends: "Friends",
    addFriend: "Add friend",
    addFriendHelp: "Enter a friend's Briis code to connect.",
    friendCodeToAdd: "Friend code",
    friendCodePlaceholder: "BRIIS-ABC123",
    addFriendButton: "Add friend",
    friendAdded: "Friend added.",
    cannotAddYourself: "That is your own friend code.",
    friendCodeNotFound: "Friend code not found.",
    noFriends: "No friends added yet.",
    friendsRatings: "Friends' ratings",
    friendsRatingsHelp: "See the newest ratings your friends have shared through Briis.",
    noFriendRatings: "No friend ratings yet.",
    ratedBy: "Rated by",
    showDetails: "Show details",
    hideDetails: "Hide details",
    sharedDetails: "Shared tasting details",
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
    profile: "Profil",
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
    revealedWineFromCellar: "Vin fra kælder",
    notChosenYet: "Ikke valgt endnu",
    manualRevealedWine: "Manuel facitvin",
    manualRevealedWineHelp: "Brug dette til restaurant, ven eller smagning.",
    revealedWineName: "Vinens navn",
    revealedWinePlaceholder: "Restaurant, ven, smagning...",
    revealedWineDetailsLabel: "Facitdetaljer",
    cellarWineLocksManualFields: "Valgt fra kælder",
    bottleType: "Flasketype",
    saveChanges: "Gem ændringer",
    saveTasting: "Gem smagning",
    yourTastings: "Dine smagninger",
    myRatings: "Mine ratings",
    ratingsViewLabel: "Vælg ratingvisning",
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
    signInTitle: "Log ind på Briis",
    signInText: "Brug Google eller et login-link på email til at gemme din kælder og dine smagninger sikkert.",
    signInWithGoogle: "Log ind med Google",
    orLoginWith: "Eller",
    emailLoginLabel: "Email",
    emailLoginPlaceholder: "dig@example.com",
    signInWithEmail: "Send login-link",
    emailLoginSent: "Tjek din email for login-linket.",
    signOut: "Log ud",
    signedInAs: "Logget ind som",
    loadingAccount: "Tjekker login...",
    loadingData: "Henter din kælder...",
    refreshData: "Genindlæs data",
    syncError: "Synkroniseringsfejl",
    missingSupabaseConfig: "Supabase mangler URL eller publishable key.",
    noWines: "Ingen vine i kælderen endnu.",
    draftTitle: "Kladdevenlig",
    draftText: "Du kan gemme en smagning med kun ét udfyldt felt, eller helt uden andet end datoen.",
    untitledTasting: "Smagning uden titel",
    profileAndFriends: "Profil og vennekode",
    displayName: "Visningsnavn",
    displayNamePlaceholder: "Dit navn",
    saveProfile: "Gem profil",
    profileSaved: "Profil gemt.",
    friendCode: "Vennekode",
    friendCodeHelp: "Del denne kode senere, når en ven skal forbinde med dig.",
    copyCode: "Kopiér kode",
    copied: "Kopieret",
    communityFoundation: "Community-fundament",
    communityFoundationText:
      "Dette er første lille trin mod venner og delte ratings. Kun du kan se og redigere din profil lige nu.",
    friends: "Venner",
    addFriend: "Tilføj ven",
    addFriendHelp: "Indtast en vens Briis-kode for at forbinde.",
    friendCodeToAdd: "Vennekode",
    friendCodePlaceholder: "BRIIS-ABC123",
    addFriendButton: "Tilføj ven",
    friendAdded: "Ven tilføjet.",
    cannotAddYourself: "Det er din egen vennekode.",
    friendCodeNotFound: "Vennekoden blev ikke fundet.",
    noFriends: "Ingen venner tilføjet endnu.",
    friendsRatings: "Venners ratings",
    friendsRatingsHelp: "Se de nyeste ratings dine venner har delt gennem Briis.",
    noFriendRatings: "Ingen ratings fra venner endnu.",
    ratedBy: "Vurderet af",
    showDetails: "Vis detaljer",
    hideDetails: "Skjul detaljer",
    sharedDetails: "Delte smagedetaljer",
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

function createFriendCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return `BRIIS-${Array.from(values)
    .map((value) => alphabet[value % alphabet.length])
    .join("")}`;
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
  revealedWine: RevealedWineDetails | undefined,
) {
  if (
    !revealedWine ||
    ![
      revealedWine.vintage,
      revealedWine.grape,
      revealedWine.region,
      revealedWine.commune,
      revealedWine.producer,
    ].some(Boolean)
  ) {
    return null;
  }

  let score = 0;
  if (guesses.vintage && revealedWine.vintage) {
    if (guesses.vintage === revealedWine.vintage) score += 20;
    else if (Math.abs(guesses.vintage - revealedWine.vintage) === 1) score += 10;
  }
  if (guesses.grape && revealedWine.grape && compareText(guesses.grape, revealedWine.grape)) {
    score += 20;
  }
  if (guesses.region && revealedWine.region && compareText(guesses.region, revealedWine.region)) {
    score += 20;
  }
  if (
    guesses.commune &&
    revealedWine.commune &&
    compareText(guesses.commune, revealedWine.commune)
  ) {
    score += 20;
  }
  if (
    guesses.producer &&
    revealedWine.producer &&
    compareText(guesses.producer, revealedWine.producer)
  ) {
    score += 20;
  }

  return score;
}

function wineToRevealedDetails(wine: WineRecord): RevealedWineDetails {
  return {
    name: wine.name,
    producer: wine.producer,
    vintage: wine.vintage,
    grape: wine.grape,
    region: wine.region,
    commune: wine.commune,
  };
}

function formatRevealedDetails(revealedWine: RevealedWineDetails) {
  return [
    revealedWine.vintage,
    revealedWine.grape,
    revealedWine.region,
    revealedWine.commune,
    revealedWine.producer,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatGuessDetails(guesses: TastingRecord["guesses"]) {
  return [guesses.vintage, guesses.grape, guesses.region, guesses.commune, guesses.producer]
    .filter(Boolean)
    .join(" · ");
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

function dbWineToRecord(row: DbWineRow): WineRecord {
  return {
    id: row.id,
    name: row.name,
    producer: row.producer ?? "",
    vintage: row.vintage,
    grape: row.grape ?? "",
    region: row.region ?? "",
    commune: row.commune ?? "",
    country: row.country ?? "",
    bottleCount: Number(row.bottle_count ?? 0),
    externalRatingSource: row.external_rating_source ?? "",
    externalRatingScore: row.external_rating_score,
    createdAt: row.created_at,
  };
}

function wineToDbRow(wine: WineRecord) {
  return {
    id: wine.id,
    name: wine.name,
    producer: wine.producer || null,
    vintage: wine.vintage,
    grape: wine.grape || null,
    region: wine.region || null,
    commune: wine.commune || null,
    country: wine.country || null,
    bottle_count: wine.bottleCount,
    external_rating_source: wine.externalRatingSource || null,
    external_rating_score: wine.externalRatingScore,
  };
}

function dbTastingToRecord(row: DbTastingRow): TastingRecord {
  return {
    id: row.id,
    wineId: row.wine_id,
    wineNameSnapshot: row.wine_name_snapshot,
    tastedAt: row.tasted_at,
    source: row.source,
    rating: row.rating,
    color: row.color ?? "",
    noseNotes: row.nose_notes ?? [],
    palateNotes: row.palate_notes ?? [],
    structureNotes: row.structure_notes ?? [],
    acidity: row.acidity ?? "",
    tannin: row.tannin ?? "",
    customNote: row.custom_note ?? "",
    guesses: {
      vintage: row.guess_vintage,
      grape: row.guess_grape ?? "",
      region: row.guess_region ?? "",
      commune: row.guess_commune ?? "",
      producer: row.guess_producer ?? "",
    },
    revealedWine: {
      name: row.revealed_wine_name ?? row.wine_name_snapshot ?? "",
      producer: row.revealed_producer ?? "",
      vintage: row.revealed_vintage,
      grape: row.revealed_grape ?? "",
      region: row.revealed_region ?? "",
      commune: row.revealed_commune ?? "",
    },
    guessScore: row.guess_score,
  };
}

function tastingToDbRow(tasting: TastingRecord) {
  return {
    id: tasting.id,
    wine_id: tasting.wineId,
    wine_name_snapshot: tasting.wineNameSnapshot,
    tasted_at: tasting.tastedAt,
    source: tasting.source,
    rating: tasting.rating,
    color: tasting.color || null,
    nose_notes: tasting.noseNotes,
    palate_notes: tasting.palateNotes,
    structure_notes: tasting.structureNotes,
    acidity: tasting.acidity || null,
    tannin: tasting.tannin || null,
    custom_note: tasting.customNote || null,
    guess_vintage: tasting.guesses.vintage,
    guess_grape: tasting.guesses.grape || null,
    guess_region: tasting.guesses.region || null,
    guess_commune: tasting.guesses.commune || null,
    guess_producer: tasting.guesses.producer || null,
    revealed_wine_name: tasting.revealedWine.name || null,
    revealed_producer: tasting.revealedWine.producer || null,
    revealed_vintage: tasting.revealedWine.vintage,
    revealed_grape: tasting.revealedWine.grape || null,
    revealed_region: tasting.revealedWine.region || null,
    revealed_commune: tasting.revealedWine.commune || null,
    guess_score: tasting.guessScore,
  };
}

function dbProfileToRecord(row: DbProfileRow): ProfileRecord {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? "",
    friendCode: row.friend_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function dbFriendToRecord(row: DbFriendRow): FriendRecord {
  return {
    userId: row.friend_user_id,
    displayName: row.display_name ?? "",
    friendCode: row.friend_code,
    createdAt: row.created_at,
  };
}

function dbFriendRatingToRecord(row: DbFriendRatingRow): FriendRatingRecord {
  return {
    tastingId: row.tasting_id,
    friendUserId: row.friend_user_id,
    friendName: row.friend_name ?? "",
    wineName: row.wine_name,
    rating: row.rating,
    tastedAt: row.tasted_at,
    color: row.color ?? "",
    noseNotes: row.nose_notes ?? [],
    palateNotes: row.palate_notes ?? [],
    structureNotes: row.structure_notes ?? [],
    acidity: row.acidity ?? "",
    tannin: row.tannin ?? "",
    guesses: {
      vintage: row.guess_vintage,
      grape: row.guess_grape ?? "",
      region: row.guess_region ?? "",
      commune: row.guess_commune ?? "",
      producer: row.guess_producer ?? "",
    },
    revealedWine: {
      name: row.revealed_wine_name ?? "",
      producer: row.revealed_producer ?? "",
      vintage: row.revealed_vintage,
      grape: row.revealed_grape ?? "",
      region: row.revealed_region ?? "",
      commune: row.revealed_commune ?? "",
    },
    guessScore: row.guess_score,
    createdAt: row.created_at,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;

  if (error && typeof error === "object") {
    const errorLike = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [errorLike.message, errorLike.details, errorLike.hint]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim());

    if (parts.length > 0) return parts.join(" ");
    if (typeof errorLike.code === "string") return errorLike.code;
  }

  return "Unknown error";
}

function friendlyFriendError(message: string, t: (typeof copy)[Language]) {
  const normalized = message.toLowerCase();
  if (normalized.includes("friend code not found")) return t.friendCodeNotFound;
  if (normalized.includes("cannot add yourself")) return t.cannotAddYourself;
  return message;
}

function App() {
  const [language, setLanguage] = useStoredState<Language>("briis.language", "en");
  const [activeTab, setActiveTab] = useState<Tab>("cellar");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [emailForLogin, setEmailForLogin] = useState("");
  const [emailLoginSent, setEmailLoginSent] = useState(false);
  const [wines, setWines] = useState<WineRecord[]>([]);
  const [tastings, setTastings] = useState<TastingRecord[]>([]);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [friendCodeCopied, setFriendCodeCopied] = useState(false);
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendRatings, setFriendRatings] = useState<FriendRatingRecord[]>([]);
  const [openFriendRatingId, setOpenFriendRatingId] = useState<string | null>(null);
  const [ratingsView, setRatingsView] = useState<RatingsView>("mine");
  const [friendCodeToAdd, setFriendCodeToAdd] = useState("");
  const [friendMessage, setFriendMessage] = useState<string | null>(null);
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

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setAuthLoading(false);
      setSyncError(t.missingSupabaseConfig);
      return;
    }

    let isMounted = true;

    client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) setSyncError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSyncError(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [t.missingSupabaseConfig]);

  useEffect(() => {
    if (!session) {
      setWines([]);
      setTastings([]);
      setProfile(null);
      setProfileName("");
      setProfileMessage(null);
      setFriendCodeCopied(false);
      setFriends([]);
      setFriendRatings([]);
      setOpenFriendRatingId(null);
      setFriendCodeToAdd("");
      setFriendMessage(null);
      setDataLoading(false);
      return;
    }

    void loadUserData();
  }, [session?.user.id]);

  async function loadUserData() {
    const client = supabase;
    if (!client || !session) return;

    setDataLoading(true);
    setSyncError(null);
    setFriendMessage(null);

    try {
      const [wineResult, tastingResult, profileResult, friendResult, friendRatingResult] =
        await Promise.all([
          client.from("wines").select("*").order("created_at", { ascending: false }),
          client.from("tastings").select("*").order("created_at", { ascending: false }),
          client.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
          client.rpc("list_friends"),
          client.rpc("list_friend_ratings"),
        ]);

      if (wineResult.error) throw wineResult.error;
      if (tastingResult.error) throw tastingResult.error;
      if (profileResult.error) throw profileResult.error;
      if (friendResult.error) throw friendResult.error;
      if (friendRatingResult.error) throw friendRatingResult.error;

      setWines((wineResult.data ?? []).map((row) => dbWineToRecord(row as DbWineRow)));
      setTastings(
        (tastingResult.data ?? []).map((row) => dbTastingToRecord(row as DbTastingRow)),
      );

      const profileRecord = profileResult.data
        ? dbProfileToRecord(profileResult.data as DbProfileRow)
        : await createProfile();

      setProfile(profileRecord);
      setProfileName(profileRecord.displayName);
      setFriends(((friendResult.data ?? []) as DbFriendRow[]).map(dbFriendToRecord));
      setFriendRatings(
        ((friendRatingResult.data ?? []) as DbFriendRatingRow[]).map(dbFriendRatingToRecord),
      );
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }

  async function createProfile() {
    const client = supabase;
    if (!client || !session) throw new Error(t.missingSupabaseConfig);

    const defaultName =
      typeof session.user.user_metadata.full_name === "string"
        ? session.user.user_metadata.full_name
        : session.user.email?.split("@")[0] ?? "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await client
        .from("profiles")
        .insert({
          user_id: session.user.id,
          display_name: defaultName,
          friend_code: createFriendCode(),
        })
        .select("*")
        .single();

      if (!error) return dbProfileToRecord(data as DbProfileRow);
      if (error.code !== "23505") throw error;
    }

    throw new Error("Could not create a unique friend code.");
  }

  async function signInWithGoogle() {
    const client = supabase;
    if (!client) {
      setSyncError(t.missingSupabaseConfig);
      return;
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) setSyncError(error.message);
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    const email = emailForLogin.trim();

    if (!client) {
      setSyncError(t.missingSupabaseConfig);
      return;
    }

    if (!email) return;

    setSyncError(null);
    setEmailLoginSent(false);

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setSyncError(error.message);
      return;
    }

    setEmailLoginSent(true);
  }

  async function signOut() {
    const client = supabase;
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) setSyncError(error.message);
  }

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

  function selectRevealedWine(wineId: string) {
    const selectedWine = wines.find((wine) => wine.id === wineId);

    setTastingForm((current) => ({
      ...current,
      wineId,
      ...(selectedWine
        ? {
            revealedWineName: selectedWine.name,
            revealedProducer: selectedWine.producer,
            revealedVintage: selectedWine.vintage?.toString() ?? "",
            revealedGrape: selectedWine.grape,
            revealedRegion: selectedWine.region,
            revealedCommune: selectedWine.commune,
          }
        : {}),
    }));
  }

  function updateCellarFilter(field: keyof CellarFilters, value: string) {
    setCellarFilters((current) => ({ ...current, [field]: value }));
  }

  async function addWine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    if (!client || !session) {
      setSyncError(t.missingSupabaseConfig);
      return;
    }

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

    setSyncError(null);

    try {
      const { data, error } = await client
        .from("wines")
        .insert(wineToDbRow(wine))
        .select("*")
        .single();

      if (error) throw error;

      setWines((current) => [dbWineToRecord(data as DbWineRow), ...current]);
      setWineForm(defaultWineForm);
      setActiveTab("cellar");
    } catch (error) {
      setSyncError(getErrorMessage(error));
    }
  }

  async function updateWineBottleCount(wineId: string, bottleCount: number) {
    const client = supabase;
    if (!client || !session) return;

    setWines((current) =>
      current.map((wine) => (wine.id === wineId ? { ...wine, bottleCount } : wine)),
    );

    const { error } = await client
      .from("wines")
      .update({ bottle_count: bottleCount })
      .eq("id", wineId);

    if (error) {
      setSyncError(error.message);
      await loadUserData();
    }
  }

  function changeBottleCount(wineId: string, amount: number) {
    const wine = wines.find((item) => item.id === wineId);
    if (!wine) return;

    const nextBottleCount = Math.max(
      0,
      Number((wine.bottleCount + amount).toFixed(1)),
    );

    void updateWineBottleCount(wineId, nextBottleCount);
  }

  async function applyBottleDeltas(deltas: Array<{ wineId: string; amount: number }>) {
    const client = supabase;
    if (deltas.length === 0) return;
    if (!client || !session) return;

    const amountByWineId = new Map<string, number>();
    deltas.forEach((delta) => {
      amountByWineId.set(
        delta.wineId,
        (amountByWineId.get(delta.wineId) ?? 0) + delta.amount,
      );
    });

    const nextWines = wines.map((wine) => {
      const amount = amountByWineId.get(wine.id) ?? 0;
      if (amount === 0) return wine;

      return {
        ...wine,
        bottleCount: Math.max(0, Number((wine.bottleCount + amount).toFixed(1))),
      };
    });
    const changedWines = nextWines.filter((wine) => amountByWineId.has(wine.id));

    setWines(nextWines);

    const results = await Promise.all(
      changedWines.map((wine) =>
        client
          .from("wines")
          .update({ bottle_count: wine.bottleCount })
          .eq("id", wine.id),
      ),
    );
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      throw failedResult.error;
    }
  }

  function removeFromCellar(wineId: string) {
    void updateWineBottleCount(wineId, 0);
  }

  async function deleteWine(wineId: string) {
    if (!window.confirm(t.confirmDeleteWine)) return;

    const client = supabase;
    if (!client || !session) return;

    setSyncError(null);

    try {
      const { error } = await client.from("wines").delete().eq("id", wineId);
      if (error) throw error;

      setWines((current) => current.filter((wine) => wine.id !== wineId));
      setTastings((current) =>
        current.map((tasting) =>
          tasting.wineId === wineId ? { ...tasting, wineId: null } : tasting,
        ),
      );
      setTastingForm((current) =>
        current.wineId === wineId ? { ...current, wineId: "" } : current,
      );
    } catch (error) {
      setSyncError(getErrorMessage(error));
    }
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

  async function saveTasting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    if (!client || !session) {
      setSyncError(t.missingSupabaseConfig);
      return;
    }

    const selectedWine = wines.find((wine) => wine.id === tastingForm.wineId);
    const revealedWine: RevealedWineDetails = selectedWine
      ? wineToRevealedDetails(selectedWine)
      : {
          name: tastingForm.revealedWineName.trim(),
          producer: tastingForm.revealedProducer.trim(),
          vintage: parseOptionalNumber(tastingForm.revealedVintage),
          grape: tastingForm.revealedGrape.trim(),
          region: tastingForm.revealedRegion.trim(),
          commune: tastingForm.revealedCommune.trim(),
        };
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
      wineNameSnapshot: selectedWine?.name || revealedWine.name || t.untitledTasting,
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
      revealedWine,
      guessScore: calculateGuessScore(guesses, revealedWine),
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

    setSyncError(null);

    try {
      const request = editingTastingId
        ? client
            .from("tastings")
            .update(tastingToDbRow(tasting))
            .eq("id", editingTastingId)
            .select("*")
            .single()
        : client
            .from("tastings")
            .insert(tastingToDbRow(tasting))
            .select("*")
            .single();
      const { data, error } = await request;

      if (error) throw error;

      const savedTasting = dbTastingToRecord(data as DbTastingRow);

      setTastings((current) => {
        if (!editingTastingId) return [savedTasting, ...current];
        return current.map((item) =>
          item.id === editingTastingId ? savedTasting : item,
        );
      });
      await applyBottleDeltas(deltas);
      resetTastingForm();
      setActiveTab("ratings");
    } catch (error) {
      setSyncError(getErrorMessage(error));
      await loadUserData();
    }
  }

  function editTasting(tasting: TastingRecord) {
    setEditingTastingId(tasting.id);
    setTastingForm({
      wineId: tasting.wineId ?? "",
      revealedWineName: tasting.revealedWine.name || tasting.wineNameSnapshot,
      revealedProducer: tasting.revealedWine.producer,
      revealedVintage: tasting.revealedWine.vintage?.toString() ?? "",
      revealedGrape: tasting.revealedWine.grape,
      revealedRegion: tasting.revealedWine.region,
      revealedCommune: tasting.revealedWine.commune,
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

  async function deleteTasting(tasting: TastingRecord) {
    if (!window.confirm(t.confirmDeleteTasting)) return;

    const client = supabase;
    if (!client || !session) return;

    setSyncError(null);

    try {
      const { error } = await client.from("tastings").delete().eq("id", tasting.id);
      if (error) throw error;

      if (tasting.wineId) {
        await applyBottleDeltas([
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
    } catch (error) {
      setSyncError(getErrorMessage(error));
      await loadUserData();
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    if (!client || !session || !profile) return;

    setSyncError(null);
    setProfileMessage(null);

    try {
      const { data, error } = await client
        .from("profiles")
        .update({
          display_name: profileName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.userId)
        .select("*")
        .single();

      if (error) throw error;

      const savedProfile = dbProfileToRecord(data as DbProfileRow);
      setProfile(savedProfile);
      setProfileName(savedProfile.displayName);
      setProfileMessage(t.profileSaved);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    }
  }

  async function copyFriendCode() {
    if (!profile) return;

    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setFriendCodeCopied(true);
    } catch (error) {
      setSyncError(getErrorMessage(error));
    }
  }

  async function addFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = supabase;
    const code = friendCodeToAdd.trim().toUpperCase();

    if (!client || !session || !profile) return;
    if (!code) return;

    setSyncError(null);
    setFriendMessage(null);

    if (code === profile.friendCode.toUpperCase()) {
      setFriendMessage(t.cannotAddYourself);
      return;
    }

    try {
      const { data, error } = await client.rpc("add_friend_by_code", {
        input_friend_code: code,
      });

      if (error) throw error;

      const nextFriends = ((data ?? []) as DbFriendRow[]).map(dbFriendToRecord);
      setFriends((current) => {
        const byUserId = new Map(current.map((friend) => [friend.userId, friend]));
        nextFriends.forEach((friend) => byUserId.set(friend.userId, friend));
        return Array.from(byUserId.values()).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
      });
      setFriendCodeToAdd("");
      setFriendMessage(t.friendAdded);
    } catch (error) {
      setFriendMessage(friendlyFriendError(getErrorMessage(error), t));
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

      {syncError && (
        <div className="statusBanner errorBanner">
          <strong>{t.syncError}</strong>
          <span>{syncError}</span>
        </div>
      )}

      {authLoading && (
        <section className="authPanel">
          <RefreshCw size={22} />
          <div>
            <h2>{t.loadingAccount}</h2>
          </div>
        </section>
      )}

      {!authLoading && !session && (
        <section className="authPanel loginPanel">
          <LogIn size={28} />
          <div>
            <h2>{t.signInTitle}</h2>
            <p>{t.signInText}</p>
          </div>
          <div className="authMethods">
            <button
              className="primaryButton"
              disabled={!isSupabaseConfigured}
              onClick={signInWithGoogle}
              type="button"
            >
              <LogIn size={18} />
              {t.signInWithGoogle}
            </button>
            <span className="authDivider">{t.orLoginWith}</span>
            <form className="emailLoginForm" onSubmit={signInWithEmail}>
              <label htmlFor="email-login">{t.emailLoginLabel}</label>
              <div className="inlineFields">
                <input
                  autoComplete="email"
                  id="email-login"
                  onChange={(event) => {
                    setEmailForLogin(event.target.value);
                    setEmailLoginSent(false);
                  }}
                  placeholder={t.emailLoginPlaceholder}
                  type="email"
                  value={emailForLogin}
                />
                <button
                  className="secondaryButton"
                  disabled={!isSupabaseConfigured || !emailForLogin.trim()}
                  type="submit"
                >
                  {t.signInWithEmail}
                </button>
              </div>
              {emailLoginSent && <p className="successText">{t.emailLoginSent}</p>}
            </form>
          </div>
        </section>
      )}

      {!authLoading && session && (
        <>
          <section className="authPanel accountPanel">
            <div>
              <p className="eyebrow">{t.signedInAs}</p>
              <h2>{session.user.email}</h2>
            </div>
            <div className="accountActions">
              <button className="ghostButton" onClick={loadUserData} type="button">
                <RefreshCw size={17} />
                {t.refreshData}
              </button>
              <button className="ghostButton" onClick={signOut} type="button">
                <LogOut size={17} />
                {t.signOut}
              </button>
            </div>
          </section>

          {dataLoading && (
            <div className="statusBanner">
              <RefreshCw size={18} />
              <span>{t.loadingData}</span>
            </div>
          )}

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
        <button
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
          type="button"
        >
          <UserRound size={18} />
          {t.profile}
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
            {!dataLoading && filteredCellarWines.length === 0 && (
              <div className="emptyState">
                <BottleWine size={36} />
                <p>{t.noWines}</p>
              </div>
            )}
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
                  {t.revealedWineFromCellar}
                  <select
                    value={tastingForm.wineId}
                    onChange={(event) => selectRevealedWine(event.target.value)}
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
              <div className="manualRevealPanel">
                <div>
                  <p className="eyebrow">{t.manualRevealedWine}</p>
                  <span>{t.manualRevealedWineHelp}</span>
                </div>
                <div className="formGrid">
                  <label>
                    {t.revealedWineName}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      value={tastingForm.revealedWineName}
                      onChange={(event) =>
                        updateTastingForm("revealedWineName", event.target.value)
                      }
                      placeholder={t.revealedWinePlaceholder}
                    />
                  </label>
                  <label>
                    {t.producer}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      value={tastingForm.revealedProducer}
                      onChange={(event) =>
                        updateTastingForm("revealedProducer", event.target.value)
                      }
                      placeholder={t.producer}
                    />
                  </label>
                  <label>
                    {t.vintage}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      inputMode="numeric"
                      value={tastingForm.revealedVintage}
                      onChange={(event) =>
                        updateTastingForm("revealedVintage", event.target.value)
                      }
                      placeholder="2019"
                    />
                  </label>
                  <label>
                    {t.grape}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      value={tastingForm.revealedGrape}
                      onChange={(event) =>
                        updateTastingForm("revealedGrape", event.target.value)
                      }
                      placeholder="Nebbiolo"
                    />
                  </label>
                  <label>
                    {t.region}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      value={tastingForm.revealedRegion}
                      onChange={(event) =>
                        updateTastingForm("revealedRegion", event.target.value)
                      }
                      placeholder="Piemonte"
                    />
                  </label>
                  <label>
                    {t.commune}
                    <input
                      disabled={Boolean(tastingForm.wineId)}
                      value={tastingForm.revealedCommune}
                      onChange={(event) =>
                        updateTastingForm("revealedCommune", event.target.value)
                      }
                      placeholder="Barolo"
                    />
                  </label>
                </div>
                {tastingForm.wineId && (
                  <p className="fieldHint">{t.cellarWineLocksManualFields}</p>
                )}
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
          <div className="sectionHeader ratingsHeader">
            <div>
              <p className="eyebrow">{t.ratings}</p>
              <h2>{ratingsView === "mine" ? t.yourTastings : t.friendsRatings}</h2>
            </div>
            <div className="ratingViewToggle" role="tablist" aria-label={t.ratingsViewLabel}>
              <button
                aria-selected={ratingsView === "mine"}
                className={ratingsView === "mine" ? "active" : ""}
                onClick={() => setRatingsView("mine")}
                role="tab"
                type="button"
              >
                {t.myRatings}
              </button>
              <button
                aria-selected={ratingsView === "friends"}
                className={ratingsView === "friends" ? "active" : ""}
                onClick={() => setRatingsView("friends")}
                role="tab"
                type="button"
              >
                {t.friendsRatings}
              </button>
            </div>
          </div>

          {ratingsView === "mine" && (
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
                    {formatRevealedDetails(tasting.revealedWine) && (
                      <p>
                        {t.revealedWineDetailsLabel}:{" "}
                        {formatRevealedDetails(tasting.revealedWine)}
                      </p>
                    )}
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
          )}

          {ratingsView === "friends" && (
            <section className="friendRatingsPanel">
              <p className="fieldHint">{t.friendsRatingsHelp}</p>
              <div className="friendRatingList">
                {friendRatings.length === 0 && (
                  <div className="emptyState">
                    <ClipboardList size={36} />
                    <p>{t.noFriendRatings}</p>
                  </div>
                )}
                {friendRatings.map((friendRating) => {
                  const isOpen = openFriendRatingId === friendRating.tastingId;
                  const friendGuessDetails = formatGuessDetails(friendRating.guesses);
                  const friendRevealedDetails = formatRevealedDetails(friendRating.revealedWine);

                  return (
                    <article className="friendRatingCard" key={friendRating.tastingId}>
                      <button
                        aria-expanded={isOpen}
                        className="friendRatingRow"
                        onClick={() =>
                          setOpenFriendRatingId(isOpen ? null : friendRating.tastingId)
                        }
                        type="button"
                      >
                        <div className="scoreBadge">{friendRating.rating ?? "-"}</div>
                        <div>
                          <p className="wineMeta">
                            {new Date(friendRating.tastedAt).toLocaleDateString("da-DK")} ·{" "}
                            {t.ratedBy} {friendRating.friendName || "-"}
                          </p>
                          <strong className="friendRatingTitle">{friendRating.wineName}</strong>
                          <span>{isOpen ? t.hideDetails : t.showDetails}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="friendRatingDetails">
                          <p className="eyebrow">{t.sharedDetails}</p>
                          <p>
                            {[
                              friendRating.color ? displayColor(friendRating.color, language) : "",
                              `${t.colorPrefixAcidity} ${friendRating.acidity || "-"}`,
                              `${t.colorPrefixTannin} ${friendRating.tannin || "-"}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p>
                            {t.noseLabel}: {displayNotes(friendRating.noseNotes, language)}
                          </p>
                          <p>
                            {t.palateLabel}: {displayNotes(friendRating.palateNotes, language)}
                          </p>
                          {friendRating.structureNotes.length > 0 && (
                            <p>
                              {t.characterLabel}:{" "}
                              {friendRating.structureNotes
                                .map((note) => displayStructure(note, language))
                                .join(" · ")}
                            </p>
                          )}
                          <div className="friendRatingSharedBlock">
                            <strong>{t.blindGuess}</strong>
                            <p>{friendGuessDetails || "-"}</p>
                          </div>
                          <div className="friendRatingSharedBlock">
                            <strong>{t.revealedWine}</strong>
                            <p>{friendRating.revealedWine.name || t.notChosenYet}</p>
                            {friendRevealedDetails && <p>{friendRevealedDetails}</p>}
                            {friendRating.guessScore !== null && (
                              <p>
                                {t.guessScore}: {friendRating.guessScore}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <section className="formLayout">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{t.profile}</p>
              <h2>{t.profileAndFriends}</h2>
            </div>
          </div>

          <div className="profileGrid">
            <form className="panelForm" onSubmit={saveProfile}>
              <div className="draftNotice">
                <strong>{t.communityFoundation}</strong>
                <span>{t.communityFoundationText}</span>
              </div>
              <label>
                {t.displayName}
                <input
                  value={profileName}
                  onChange={(event) => {
                    setProfileName(event.target.value);
                    setProfileMessage(null);
                  }}
                  placeholder={t.displayNamePlaceholder}
                />
              </label>
              <button className="primaryButton" disabled={!profile} type="submit">
                <Check size={18} />
                {t.saveProfile}
              </button>
              {profileMessage && <p className="successText">{profileMessage}</p>}
            </form>

            <section className="panelForm friendCodePanel">
              <div>
                <p className="eyebrow">{t.friendCode}</p>
                <h2>{profile?.friendCode ?? "-"}</h2>
              </div>
              <p>{t.friendCodeHelp}</p>
              <button
                className="ghostButton"
                disabled={!profile}
                onClick={copyFriendCode}
                type="button"
              >
                <Copy size={17} />
                {friendCodeCopied ? t.copied : t.copyCode}
              </button>
            </section>

            <section className="panelForm friendsPanel">
              <div>
                <p className="eyebrow">{t.friends}</p>
                <h2>{t.addFriend}</h2>
                <p>{t.addFriendHelp}</p>
              </div>
              <form className="addFriendForm" onSubmit={addFriend}>
                <label>
                  {t.friendCodeToAdd}
                  <input
                    value={friendCodeToAdd}
                    onChange={(event) => {
                      setFriendCodeToAdd(event.target.value.toUpperCase());
                      setFriendMessage(null);
                    }}
                    placeholder={t.friendCodePlaceholder}
                  />
                </label>
                <button
                  className="secondaryButton"
                  disabled={!profile || !friendCodeToAdd.trim()}
                  type="submit"
                >
                  <UserRound size={17} />
                  {t.addFriendButton}
                </button>
              </form>
              {friendMessage && <p className="successText">{friendMessage}</p>}
              <div className="friendList">
                {friends.length === 0 && <p className="fieldHint">{t.noFriends}</p>}
                {friends.map((friend) => (
                  <div className="friendRow" key={friend.userId}>
                    <UserRound size={20} />
                    <div>
                      <h3>{friend.displayName || friend.friendCode}</h3>
                      <p>{friend.friendCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </section>
      )}
        </>
      )}
    </main>
  );
}

export default App;
