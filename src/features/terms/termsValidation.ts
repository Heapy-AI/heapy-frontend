import { TermsItem } from '../../shared/types/api';

export const areRequiredTermsSelected = (
  terms: TermsItem[],
  selected: ReadonlySet<number>,
): boolean =>
  terms.filter(term => term.required).every(term => selected.has(term.termsId));
