import React, { useState } from 'react';
import type { PapelParticipante, VinculoParticipante } from '../../../services/classificacoes';
import {
  salvarPapelAdmin,
  excluirPapelAdmin,
} from '../../../services/classificacoes';
import { SectionTitle } from '../components/SectionTitle';
import { DeletePapelModal } from '../components/DeletePapelModal';

interface ConfiguracoesTabProps {
  papeis: PapelParticipante[];
  vinculos?: VinculoParticipante[];
  onRefresh: () => Promise<void>;
}

export function ConfiguracoesTab({
  papeis,
  onRefresh,
}: ConfiguracoesTabProps) {
  // Papéis Form State
  const [novoPapelNome, setNovoPapelNome] = useState('');
  const [novoPapelCortejo, setNovoPapelCortejo] = useState(false);
  const [papelEmEdicao, setPapelEmEdicao] = useState<PapelParticipante | null>(null);
  const [salvandoPapel, setSalvandoPapel] = useState(false);

  // Exclusão Modal State
  const [papelParaExcluir, setPapelParaExcluir] = useState<PapelParticipante | null>(null);
  const [excluindoPapel, setExcluindoPapel] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  // Mensagens
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const showFeedback = (tipo: 'sucesso' | 'erro', msg: string) => {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handlers de Papel
  const handleSalvarPapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPapelNome.trim()) return;

    setSalvandoPapel(true);
    const res = await salvarPapelAdmin({
      id: papelEmEdicao?.id,
      nome: novoPapelNome.trim(),
      cortejo: novoPapelCortejo,
    });
    setSalvandoPapel(false);

    if (res.success) {
      showFeedback('sucesso', res.message || 'Papel salvo com sucesso!');
      setNovoPapelNome('');
      setNovoPapelCortejo(false);
      setPapelEmEdicao(null);
      await onRefresh();
    } else {
      showFeedback('erro', res.message || 'Erro ao salvar papel.');
    }
  };

  const handleIniciarEdicaoPapel = (p: PapelParticipante) => {
    setPapelEmEdicao(p);
    setNovoPapelNome(p.nome);
    setNovoPapelCortejo(Boolean(p.cortejo));
  };

  const handleCancelarEdicaoPapel = () => {
    setPapelEmEdicao(null);
    setNovoPapelNome('');
    setNovoPapelCortejo(false);
  };

  const handleConfirmarExclusaoPapel = async () => {
    if (!papelParaExcluir?.id) return;
    setExcluindoPapel(true);
    setErroExclusao('');

    const res = await excluirPapelAdmin(papelParaExcluir.id);
    setExcluindoPapel(false);

    if (res.success) {
      showFeedback('sucesso', `Papel "${papelParaExcluir.nome}" excluído com sucesso!`);
      if (papelEmEdicao?.id === papelParaExcluir.id) handleCancelarEdicaoPapel();
      setPapelParaExcluir(null);
      await onRefresh();
    } else {
      setErroExclusao(res.message || 'Erro ao excluir papel.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-[#E8DFD5] pb-4">
        <p className="text-[0.66rem] font-sans tracking-[0.22em] uppercase text-[#6B5A4D] font-semibold mb-1">
          Configurações do Evento
        </p>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#261811] font-normal">
          Papéis dos Participantes
        </h1>
        <p className="text-xs font-serif italic text-[#543D30] mt-1">
          Defina as funções das pessoas na celebração (ex: Convidado, Padrinho, Madrinha, Daminha, Pajem).
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-[8px] text-xs font-sans font-medium flex justify-between items-center shadow-xs ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border border-rose-300 text-rose-950'
          }`}
        >
          <span>{feedback.tipo === 'sucesso' ? '✓ ' : ''}{feedback.msg}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="underline ml-2 cursor-pointer font-bold"
            aria-label="Fechar mensagem"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: PAPEL NO EVENTO */}
      <div className="bg-white border border-[#E8DFD5] rounded-[14px] p-5 sm:p-7 shadow-[0_4px_30px_-8px_rgba(38,24,17,0.06)] space-y-6">
        <div>
          <SectionTitle>Papel no Evento ({papeis.length})</SectionTitle>
          <p className="text-xs font-sans text-[#543D30] mt-1">
            Papéis marcados com <strong className="text-[#261811]">Participa do cortejo</strong> integram automaticamente a cerimônia e o cortejo de honra.
          </p>
        </div>

        <form onSubmit={handleSalvarPapel} className="p-4 sm:p-5 bg-[#FAF7F2] border border-[#E8DFD5] rounded-[10px] space-y-3.5">
          <label htmlFor="novo-papel-nome-input" className="text-xs font-sans font-semibold uppercase tracking-wider text-[#543D30] block">
            {papelEmEdicao ? `Editar Papel: ${papelEmEdicao.nome}` : 'Adicionar Novo Papel'}
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              id="novo-papel-nome-input"
              type="text"
              required
              value={novoPapelNome}
              onChange={(e) => setNovoPapelNome(e.target.value)}
              placeholder="Ex: Convidado, Padrinho, Daminha, Pajem, Florista..."
              className="flex-1 bg-white border border-[#D8CDC0] px-3.5 py-2.5 text-sm font-sans text-[#261811] rounded-[8px] focus:outline-none focus:border-[#261811] min-h-[42px]"
            />

            <label className="flex items-center gap-2 text-xs font-sans text-[#261811] cursor-pointer shrink-0 select-none bg-white border border-[#D8CDC0] px-3.5 py-2.5 rounded-[8px] min-h-[42px]">
              <input
                type="checkbox"
                checked={novoPapelCortejo}
                onChange={(e) => setNovoPapelCortejo(e.target.checked)}
                className="accent-[#261811] w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold">Participa do cortejo</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {papelEmEdicao && (
              <button
                type="button"
                onClick={handleCancelarEdicaoPapel}
                className="px-4 py-2 bg-white border border-[#D8CDC0] text-[#543D30] hover:text-[#261811] rounded-[8px] text-xs font-sans uppercase font-semibold cursor-pointer min-h-[38px]"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={salvandoPapel}
              className="px-5 py-2 bg-[#261811] hover:bg-[#1A100B] text-white rounded-[8px] text-xs font-sans uppercase tracking-wider font-semibold cursor-pointer disabled:opacity-50 min-h-[38px] shadow-xs"
            >
              {salvandoPapel ? 'Salvando...' : papelEmEdicao ? 'Atualizar Papel' : '+ Adicionar Papel'}
            </button>
          </div>
        </form>

        <div className="divide-y divide-[#EAE0D5] border border-[#E8DFD5] rounded-[10px] overflow-hidden bg-white">
          {papeis.map((p) => (
            <div key={p.id || p.nome} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 transition-colors">
              <div className="flex items-center gap-2.5 flex-wrap">
                <strong className="font-serif text-base text-[#261811] font-medium">{p.nome}</strong>
                {p.cortejo ? (
                  <span className="text-[0.62rem] font-sans tracking-wider uppercase px-2.5 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-amber-950 font-semibold">
                    ✨ Cortejo de Honra
                  </span>
                ) : (
                  <span className="text-[0.62rem] font-sans tracking-wider uppercase px-2.5 py-0.5 bg-[#FAF7F2] border border-[#E8DFD5] rounded-full text-[#6B5A4D]">
                    Convidado Geral
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleIniciarEdicaoPapel(p)}
                  className="text-xs font-sans font-medium text-[#261811] bg-[#FAF7F2] hover:bg-[#EFE8DC] border border-[#D8CDC0] px-3 py-1.5 rounded-[6px] cursor-pointer transition-colors"
                >
                  Editar
                </button>
                {p.id && (
                  <button
                    type="button"
                    onClick={() => setPapelParaExcluir(p)}
                    className="text-xs font-sans font-medium text-rose-800 hover:text-rose-950 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-[6px] cursor-pointer transition-colors"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}

          {!papeis.length && (
            <div className="p-8 text-center text-xs font-serif italic text-[#6B5A4D]">
              Nenhum papel cadastrado.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Exclusão de Papel no mesmo layout oficial do Excluir Convite */}
      <DeletePapelModal
        papel={papelParaExcluir}
        loading={excluindoPapel}
        error={erroExclusao}
        onCancel={() => {
          setPapelParaExcluir(null);
          setErroExclusao('');
        }}
        onConfirm={handleConfirmarExclusaoPapel}
      />
    </div>
  );
}
