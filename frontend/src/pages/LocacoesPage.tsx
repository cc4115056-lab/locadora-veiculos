import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Veiculo, Cliente, Seguro, Locacao } from '../types';

function diasEntre(inicio: string, fim: string): number {
  const d1 = new Date(inicio);
  const d2 = new Date(fim);

  const diff = Math.round(
    (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diff > 0 ? diff : 0;
}

export default function LocacoesPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);

  const [form, setForm] = useState({
    veiculoId: '',
    clienteId: '',
    seguroId: '',
    dataInicio: '',
    dataFimPrevista: '',
  });

  const [preview, setPreview] = useState(0);

  const [dataDevolucao, setDataDevolucao] = useState<
    Record<number, string>
  >({});

  async function carregar() {
    try {
      const [
        veiculosData,
        clientesData,
        segurosData,
        locacoesData,
      ] = await Promise.all([
        api.listarVeiculos(),
        api.listarClientes(),
        api.listarSeguros(),
        api.listarLocacoes(),
      ]);

      setVeiculos(veiculosData);
      setClientes(clientesData);
      setSeguros(segurosData);
      setLocacoes(locacoesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Não foi possível carregar os dados da locação.');
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const veiculo = veiculos.find(
      v => v.id === Number(form.veiculoId)
    );

    if (
      !veiculo ||
      !form.dataInicio ||
      !form.dataFimPrevista
    ) {
      setPreview(0);
      return;
    }

    const dias = diasEntre(
      form.dataInicio,
      form.dataFimPrevista
    );

    if (dias <= 0) {
      setPreview(0);
      return;
    }

    // Valor da diária do veículo
    let valorTotal =
      veiculo.categoria.valorDiaria * dias;

    // Seguro é OPCIONAL
    if (form.seguroId) {
      const seguro = seguros.find(
        s => s.id === Number(form.seguroId)
      );

      if (seguro) {
        valorTotal += seguro.valorDiaria * dias;
      }
    }

    setPreview(valorTotal);
  }, [
    form.veiculoId,
    form.seguroId,
    form.dataInicio,
    form.dataFimPrevista,
    veiculos,
    seguros,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Veículo obrigatório
    if (!form.veiculoId) {
      alert('Selecione um veículo.');
      return;
    }

    // Cliente obrigatório
    if (!form.clienteId) {
      alert('Selecione um cliente.');
      return;
    }

    // Data de início obrigatória
    if (!form.dataInicio) {
      alert('Informe a data de início.');
      return;
    }

    // Data final obrigatória
    if (!form.dataFimPrevista) {
      alert('Informe a data de devolução prevista.');
      return;
    }

    // Validação das datas
    if (
      new Date(form.dataFimPrevista) <
      new Date(form.dataInicio)
    ) {
      alert(
        'Erro: A data final da locação não pode ser anterior à data de início!'
      );
      return;
    }

    try {
      const locacao = await api.criarLocacao({
        veiculoId: Number(form.veiculoId),
        clienteId: Number(form.clienteId),

        // SEM SEGURO = null
        seguroId: form.seguroId
          ? Number(form.seguroId)
          : null,

        dataInicio: form.dataInicio,
        dataFimPrevista: form.dataFimPrevista,
      });

      alert(
        form.seguroId
          ? 'Locação criada com seguro!'
          : 'Locação criada sem seguro!'
      );

      setForm({
        veiculoId: '',
        clienteId: '',
        seguroId: '',
        dataInicio: '',
        dataFimPrevista: '',
      });

      setPreview(0);

      await carregar();

      return locacao;
    } catch (error) {
      console.error('Erro ao criar locação:', error);

      alert(
        'Não foi possível criar a locação. Verifique se o backend está funcionando.'
      );
    }
  }

  async function handleFinalizar(id: number) {
    const data = dataDevolucao[id];

    if (!data) {
      alert('Informe a data de devolução.');
      return;
    }

    try {
      await api.finalizarLocacao(id, data);

      alert('Locação finalizada com sucesso!');

      await carregar();
    } catch (error) {
      console.error('Erro ao finalizar locação:', error);
      alert('Não foi possível finalizar a locação.');
    }
  }

  function fmt(v: number) {
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  return (
    <div className="page">

      <div className="page-head">
        <h1>Locações</h1>

        <p>
          Nova locação e histórico de aluguéis.
        </p>
      </div>

      <div className="card">

        <h2>Nova locação</h2>

        <form
          className="grid-form"
          onSubmit={handleSubmit}
        >

          {/* VEÍCULO */}
          <select
            value={form.veiculoId}
            onChange={e =>
              setForm({
                ...form,
                veiculoId: e.target.value,
              })
            }
            required
          >
            <option value="">
              Selecione o veículo
            </option>

            {veiculos.map(v => (
              <option
                key={v.id}
                value={v.id}
              >
                {v.modelo} — {v.placa} ({v.status})
              </option>
            ))}
          </select>


          {/* CLIENTE */}
          <select
            value={form.clienteId}
            onChange={e =>
              setForm({
                ...form,
                clienteId: e.target.value,
              })
            }
            required
          >
            <option value="">
              Selecione o cliente
            </option>

            {clientes.map(c => (
              <option
                key={c.id}
                value={c.id}
              >
                {c.nome}
              </option>
            ))}
          </select>


          {/* SEGURO OPCIONAL */}
          <select
            value={form.seguroId}
            onChange={e =>
              setForm({
                ...form,
                seguroId: e.target.value,
              })
            }
          >
            {/* PRIMEIRA OPÇÃO = SEM SEGURO */}
            <option value="">
              Sem seguro
            </option>

            {seguros.map(s => (
              <option
                key={s.id}
                value={s.id}
              >
                {s.nome} (+{fmt(s.valorDiaria)}/dia)
              </option>
            ))}
          </select>


          {/* DATA DE INÍCIO */}
          <input
            type="date"
            value={form.dataInicio}
            onChange={e =>
              setForm({
                ...form,
                dataInicio: e.target.value,
              })
            }
            required
          />


          {/* DATA DE FIM */}
          <input
            type="date"
            value={form.dataFimPrevista}
            min={form.dataInicio || undefined}
            onChange={e =>
              setForm({
                ...form,
                dataFimPrevista: e.target.value,
              })
            }
            required
          />


          {/* BOTÃO */}
          <button
            type="submit"
            className="btn-primary"
          >
            Alugar
          </button>

        </form>


        {/* PREVISÃO DO VALOR */}
        {preview > 0 && (
          <div className="preview-box">

            Valor estimado:{' '}

            <strong>
              {fmt(preview)}
            </strong>

            {!form.seguroId && (
              <span>
                {' '}
                — sem seguro
              </span>
            )}

          </div>
        )}

      </div>                                  -


      {/* HISTÓRICO */}
      <div className="card">

        <h2>Histórico de locações</h2>

        <table className="data-table">

          <thead>
            <tr>
              <th>Veículo</th>
              <th>Cliente</th>
              <th>Período</th>
              <th>Seguro</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>


          <tbody>

            {locacoes.length === 0 ? (

              <tr>

                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                  }}
                >
                  Nenhuma locação encontrada.
                </td>

              </tr>

            ) : (

              locacoes.map(l => (

                <tr key={l.id}>

                  {/* VEÍCULO */}
                  <td>
                    {l.veiculo?.modelo}{' '}
                    ({l.veiculo?.placa})
                  </td>


                  {/* CLIENTE */}
                  <td>
                    {l.cliente?.nome}
                  </td>


                  {/* PERÍODO */}
                  <td>
                    {l.dataInicio}
                    {' → '}
                    {l.dataFimPrevista}
                  </td>


                  {/* SEGURO */}
                  <td>
                    {l.seguro
                      ? l.seguro.nome
                      : 'Sem seguro'}
                  </td>


                  {/* TOTAL */}
                  <td>
                    {fmt(l.valorTotal)}
                  </td>


                  {/* STATUS */}
                  <td>

                    <span
                      className={
                        'tag ' +
                        (
                          l.status === 'ATIVA'
                            ? 'tag-active'
                            : 'tag-muted'
                        )
                      }
                    >
                      {l.status}
                    </span>

                  </td>


                  {/* AÇÕES */}
                  <td className="col-actions">

                    {l.status === 'ATIVA' && (

                      <div className="inline-form">

                        <input
                          type="date"
                          value={
                            dataDevolucao[l.id] || ''
                          }
                          min={l.dataInicio}
                          onChange={e =>
                            setDataDevolucao({
                              ...dataDevolucao,
                              [l.id]: e.target.value,
                            })
                          }
                        />


                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            handleFinalizar(l.id)
                          }
                        >
                          Finalizar
                        </button>

                      </div>

                    )}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}