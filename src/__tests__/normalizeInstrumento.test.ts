import {
  expandInstrumentoSearch,
  normalizeInstrumentoForSearch,
} from '../utils/normalizeInstrumento';

describe('normalizacao de clarinete baixo (clarone)', () => {
  it.each(['CLARINETE BAIXO', 'CLARONE', 'CLARINETE BAIXO (CLARONE)'])(
    'mapeia %s para o instrumento canonico correto',
    instrumento => {
      expect(normalizeInstrumentoForSearch(instrumento)).toBe(
        'CLARINETE BAIXO (CLARONE)'
      );
    }
  );

  it('mantem clarinete comum como outro instrumento', () => {
    expect(normalizeInstrumentoForSearch('CLARINETE')).toBe('CLARINETE');
  });

  it('inclui os nomes usados pelo cadastro SAM na busca do clarone', () => {
    expect(expandInstrumentoSearch('CLARINETE BAIXO')).toEqual(
      expect.arrayContaining(['CLARINETE BAIXO (CLARONE)', 'CLARINETE BAIXO', 'CLARONE'])
    );
  });
});
