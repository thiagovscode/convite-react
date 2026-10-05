import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_STYLES, STATUS_LABELS, TYPE_STYLES, TYPE_LABELS } from './tokens';

describe('Design System Tokens e Regras', () => {
  it('STATUS_LABELS deve mapear todos os status para portugues correto', () => {
    assert.equal(STATUS_LABELS['CONFIRMADO'], 'Confirmado');
    assert.equal(STATUS_LABELS['RECUSADO'], 'Recusado');
    assert.equal(STATUS_LABELS['PENDENTE'], 'Pendente');
    assert.equal(STATUS_LABELS['PRESENTE'], 'Presente');
    assert.equal(STATUS_LABELS['AUSENTE'], 'Ausente');
  });

  it('STATUS_STYLES deve possuir definicao de classes para cada status suportado', () => {
    const statusEsperados = ['CONFIRMADO', 'RECUSADO', 'PENDENTE', 'PRESENTE', 'AUSENTE'];
    for (const st of statusEsperados) {
      assert.ok(typeof STATUS_STYLES[st] === 'string' && STATUS_STYLES[st].length > 0, `Status ${st} sem estilo`);
    }
  });

  it('TYPE_LABELS deve suportar CONVIDADO e FORNECEDOR', () => {
    assert.equal(TYPE_LABELS['CONVIDADO'], 'Convidado');
    assert.equal(TYPE_LABELS['FORNECEDOR'], 'Fornecedor');
  });

  it('TYPE_STYLES deve possuir estilo proprio para CONVIDADO e FORNECEDOR', () => {
    assert.ok(TYPE_STYLES['CONVIDADO'].includes('slate'));
    assert.ok(TYPE_STYLES['FORNECEDOR'].includes('violet'));
  });
});
