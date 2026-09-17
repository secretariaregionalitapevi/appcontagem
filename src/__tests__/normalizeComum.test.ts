import { canonicalizeComum, createStableComumId, isSameComum, normalizeComumDisplay, resolveComumById } from '../utils/normalizeComum';

describe('normalizacao de comuns da regional', () => {
  it.each([
    ['JARDIM BELA VISTA - ITAPEVI', 'ITAPEVI', 'JARDIM BELA VISTA'],
    ['JARDIM PAULISTA - ITAPEVI', 'ITAPEVI', 'JARDIM PAULISTA'],
    ['JARDIM BELA VISTA (ITAPEVI)', 'ITAPEVI', 'JARDIM BELA VISTA'],
  ])('remove somente a cidade repetida de %s', (comum, cidade, esperado) => {
    expect(normalizeComumDisplay(comum, cidade)).toBe(esperado);
  });

  it.each([
    ['PARQUE SANTANA II', 'SANTANA DE PARNAIBA'],
    ['JARDIM BELA VISTA - PUNUNDUVA', 'CAUCAIA DO ALTO'],
    ['ITAPEVI - CENTRAL', 'ITAPEVI'],
    ['CAUCAIA DO ALTO', 'CAUCAIA DO ALTO'],
    ['CAUCAIA DO ALTO - CENTRAL', 'CAUCAIA DO ALTO'],
  ])('preserva o nome legitimo %s', (comum, cidade) => {
    expect(normalizeComumDisplay(comum, cidade)).toBe(comum);
  });

  it('fixa definitivamente os codigos de Alphaville e Capela Velha - Suru', () => {
    expect(canonicalizeComum('ALPHAVILLE')).toBe('BR-21-1251 - ALPHAVILLE');
    expect(canonicalizeComum('BR-21-1251 - CAPELA VELHA - SURU')).toBe(
      'BR-21-1303 - CAPELA VELHA - SURU'
    );
    expect(
      isSameComum(
        'BR-21-1303 - CAPELA VELHA - SURU',
        'BR-21-1251 - CAPELA VELHA - SURU',
        'SANTANA DE PARNAÍBA'
      )
    ).toBe(true);
    expect(
      isSameComum(
        'BR-21-1251 - ALPHAVILLE',
        'BR-21-1251 - CAPELA VELHA - SURU',
        'SANTANA DE PARNAÍBA'
      )
    ).toBe(false);
  });
  it('consolida todas as variantes BR-22-0423 na Central de Caucaia', () => {
    expect(canonicalizeComum('BR-22-0423 - CAUCAIA DO ALTO')).toBe(
      'BR-22-0423 - CENTRAL - CAUCAIA DO ALTO'
    );
    expect(canonicalizeComum('BR-22-0423 - CAUCAIA DO ALTO - CENTRAL')).toBe(
      'BR-22-0423 - CENTRAL - CAUCAIA DO ALTO'
    );
    expect(
      isSameComum(
        'BR-22-0423 - CAUCAIA DO ALTO',
        'BR-22-0423 - CAUCAIA DO ALTO - CENTRAL',
        'CAUCAIA DO ALTO'
      )
    ).toBe(true);
  });

  it('consolida todas as variantes BR-22-0417 na Central de VGP - Portão Vermelho', () => {
    const oficial = 'BR-22-0417 - CENTRAL DE VGP - PORTÃO VERMELHO';

    expect(canonicalizeComum('BR-22-0417 - PORTÃO VERMELHO - CENTRAL')).toBe(oficial);
    expect(canonicalizeComum(oficial)).toBe(oficial);
    expect(
      isSameComum(
        oficial,
        'BR-22-0417 - PORTÃO VERMELHO - CENTRAL',
        'VARGEM GRANDE PAULISTA'
      )
    ).toBe(true);
  });

  it('agrupa apenas a cidade redundante quando a igreja permanece identificada', () => {
    expect(
      isSameComum(
        'BR-22-0679 - JARDIM BELA VISTA - ITAPEVI',
        'BR-22-0679 - JARDIM BELA VISTA',
        'ITAPEVI'
      )
    ).toBe(true);
  });

  it.each([
    ['BR-22-0424 - PEDRAS - COTIA', 'BR-22-0424 - PEDRAS (CHÁCARA SANTA MARIA)', 'COTIA'],
    ['BR-22-2833 - PARQUE SANTANA I', 'BR-22-2833 - PARQUE SANTANA DE PARNAÍBA I', 'SANTANA DE PARNAÍBA'],
    ['BR-21-1588 - COLINAS DA ANHANGUERA II', 'BR-21-1588 - COLINAS DA ANHAGUERA II', 'SANTANA DE PARNAÍBA'],
  ])('mantem membros de variantes textuais do mesmo codigo: %s', (selecionada, cadastro, cidade) => {
    expect(isSameComum(selecionada, cadastro, cidade)).toBe(true);
  });
  it('nao agrupa nomes distintos que compartilham um codigo', () => {
    expect(
      isSameComum(
        'BR-21-1251 - ALPHAVILLE',
        'BR-21-1251 - CAPELA VELHA - SURU',
        'SANTANA DE PARNAIBA'
      )
    ).toBe(false);
  });

  it('mantem Jaguari e Parque Jaguari como comuns diferentes', () => {
    expect(
      isSameComum(
        'BR-22-0273 - JAGUARI',
        'BR-21-1644 - PARQUE JAGUARI',
        'SANTANA DE PARNAIBA'
      )
    ).toBe(false);
    expect(
      isSameComum(
        'BR-21-1644 - PARQUE JAGUARI',
        'BR-22-0273 - JAGUARI',
        'SANTANA DE PARNAIBA'
      )
    ).toBe(false);
    expect(isSameComum('PARQUE JAGUARI', 'JAGUARI', 'SANTANA DE PARNAIBA')).toBe(false);
    expect(isSameComum('JAGUARI', 'PARQUE JAGUARI', 'SANTANA DE PARNAIBA')).toBe(false);
  });

  it('trata acentos e espacos sem criar outra igreja', () => {
    expect(normalizeComumDisplay('JARDIM TESTE  -  SANTANA DE PARNAÍBA', 'SANTANA DE PARNAIBA'))
      .toBe('JARDIM TESTE');
  });

  it('gera ID estavel sem depender da posicao da comum na lista', () => {
    expect(createStableComumId('BR-22-1892 - VILA BELIZÁRIO', 'VILA BELIZÁRIO', 'COTIA'))
      .toBe('comum_br_22_1892_vila_belizario_cotia');
  });

  it('recupera uma comum a partir do ID posicional legado da fila', () => {
    const comuns = [{
      id: 'comum_br_22_1892_vila_belizario_cotia',
      nome: 'BR-22-1892 - VILA BELIZÁRIO',
      displayName: 'VILA BELIZÁRIO',
      cidade: 'COTIA',
    }];

    expect(resolveComumById(comuns, 'comum_102_vila_belizário')).toBe(comuns[0]);
  });

  it('nao arrisca resolver um ID legado ambiguo para a igreja errada', () => {
    const comuns = [
      { id: 'a', nome: 'BR-22-1000 - CENTRAL', displayName: 'CENTRAL', cidade: 'COTIA' },
      { id: 'b', nome: 'BR-22-2000 - CENTRAL', displayName: 'CENTRAL', cidade: 'ITAPEVI' },
    ];

    expect(resolveComumById(comuns, 'comum_5_central')).toBeUndefined();
  });
});
