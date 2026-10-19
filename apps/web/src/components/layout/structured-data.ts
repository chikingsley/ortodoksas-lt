/** JSON-LD values serialize optional properties by omission. */
export type StructuredDataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | StructuredDataValue[]
  | StructuredData;

export interface StructuredData {
  [property: string]: StructuredDataValue;
}
