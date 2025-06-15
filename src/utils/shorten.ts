// Utility functions for shortening strings

export const shortUuid = (uuid: string): string => uuid.substring(0, 8);

export const shortNick = (name: string): string => name.substring(0, 5);
