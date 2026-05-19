export type Card = {
  id: string;
  base_id: string;
  set_code: string;
  card_number: string;
  variant_suffix: string | null;
  name: string;
  card_type: string | null;
  color: string | null;
  cost: number | null;
  level: number | null;
  ap: number | null;
  hp: number | null;
  effect: string | null;
  zone: string | null;
  trait: string | null;
  link: string | null;
  source_title: string | null;
  rarity: string | null;
  image_path: string;
};

export type Deck = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type DeckCard = {
  deck_id: string;
  card_id: string;
  copies: number;
};

export type DeckWithCards = Deck & {
  cards: (DeckCard & { card: Card })[];
};

export const DECK_RULES = {
  MAIN_DECK_SIZE: 50,
  MAX_COPIES_PER_BASE_CARD: 4,
  MAX_COLORS_PER_DECK: 2,
} as const;
