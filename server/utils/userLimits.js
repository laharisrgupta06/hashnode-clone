// Limits for profile text. The bio limit mirrors the schema (PRD §4.1); the name limit
// is our own, enforced when a name is WRITTEN (register, profile update), never when read.
export const MAX_NAME_LENGTH = 50;
export const MAX_BIO_LENGTH = 200;

// Counts what a person sees as characters, so an emoji counts as 1 (not 2).
export const nameLength = (name) => [...name].length;
