jest.mock('../services/supabaseClient', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: jest.fn(() => true),
  ensureSessionRestored: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../config/env', () => ({ env: { SHEETS_ENDPOINT_URL: 'https://example.test/sheets' } }));

import { supabase } from '../services/supabaseClient';
import { organistasEnsaioService } from '../services/organistasEnsaioService';
import { OrganistaEnsaio } from '../types/models';

const registro: OrganistaEnsaio = {
  id: 'registro-1',
  organista_nome: 'Nome corrigido',
  organista_comum: 'Comum corrigida',
  organista_cidade: 'Cidade',
  local_ensaio: 'Fazendinha',
  data_ensaio: '2026-11-19',
  tocou: true,
  usuario_responsavel: 'Responsável',
  observacoes: 'Observação preservada',
};

describe('Edição e exclusão de organistas', () => {
  let chain: Record<string, jest.Mock>;
  let originalFetch: typeof fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({});
    chain = {};
    for (const method of ['update', 'delete', 'eq', 'ilike', 'select'])
      chain[method] = jest.fn(() => chain);
    chain.single = jest.fn().mockResolvedValue({ data: { id: registro.id }, error: null });
    (supabase!.from as jest.Mock).mockReturnValue(chain);
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('corrige o nome no mesmo ID, limitando a alteração ao local e data', async () => {
    expect(await organistasEnsaioService.updateOrganistaEnsaio(registro)).toEqual({
      success: true,
    });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        organista_nome: 'Nome corrigido',
        organista_comum: 'Comum corrigida',
        organista_cidade: 'Cidade',
        observacoes: 'Observação preservada',
        tocou: true,
      })
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'registro-1');
    expect(chain.ilike).toHaveBeenCalledWith('local_ensaio', 'Fazendinha');
    expect(chain.eq).toHaveBeenCalledWith('data_ensaio', '2026-11-19');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('não informa sucesso nem atualiza a planilha quando a edição é negada', async () => {
    chain.single.mockResolvedValue({ data: null, error: { message: 'Sem permissão' } });
    expect(await organistasEnsaioService.updateOrganistaEnsaio(registro)).toEqual({
      success: false,
      error: 'Sem permissão',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recusa edição sem ID antes de enviar uma operação ao banco', async () => {
    expect(
      (await organistasEnsaioService.updateOrganistaEnsaio({ ...registro, id: undefined })).success
    ).toBe(false);
    expect(supabase!.from).not.toHaveBeenCalled();
  });

  it('exclui somente o ID no local e data informados e sincroniza a planilha', async () => {
    expect(
      await organistasEnsaioService.deleteOrganistaEnsaio('registro-1', 'Fazendinha', '2026-11-19')
    ).toEqual({ success: true });
    expect(chain.delete).toHaveBeenCalledTimes(1);
    expect(chain.eq).toHaveBeenCalledWith('id', 'registro-1');
    expect(chain.ilike).toHaveBeenCalledWith('local_ensaio', 'Fazendinha');
    expect(chain.eq).toHaveBeenCalledWith('data_ensaio', '2026-11-19');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('não confirma exclusão de um registro ausente ou inacessível', async () => {
    chain.single.mockResolvedValue({ data: null, error: null });
    expect(
      (
        await organistasEnsaioService.deleteOrganistaEnsaio(
          'registro-1',
          'Fazendinha',
          '2026-11-19'
        )
      ).success
    ).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('recusa exclusão sem contexto do ensaio', async () => {
    expect(
      (await organistasEnsaioService.deleteOrganistaEnsaio('registro-1', '', '2026-11-19')).success
    ).toBe(false);
    expect(supabase!.from).not.toHaveBeenCalled();
  });
});
