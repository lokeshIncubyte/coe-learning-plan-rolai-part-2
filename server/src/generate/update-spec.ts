export interface DerivedFormula {
  numerator: string;
  denominator: string;
  multiplier?: number;
}

export interface SpecVariable {
  min?: number;
  max?: number;
  derived?: Record<string, DerivedFormula>;
}

export interface UpdateSpec {
  variables: Record<string, SpecVariable>;
}
