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

export interface CascadeCondition {
  key: string;
  op: '<' | '<=' | '>=' | '>' | '==';
  value: number;
}

export interface CascadeRule {
  when: CascadeCondition;
  apply: Record<string, unknown>;
  priority?: number;
}

export interface UpdateSpec {
  variables: Record<string, SpecVariable>;
  cascades?: CascadeRule[];
}
