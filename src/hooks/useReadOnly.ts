import { createContext, useContext } from "react";

export const ReadOnlyContext = createContext<boolean>(false);

/** Returns true when the agency's subscription is expired (read-only mode). */
export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
