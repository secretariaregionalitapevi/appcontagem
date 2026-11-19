import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { PUBLIC_MEETING, meetingDate, meetingLabel } from '../config/publicMeeting';
import {
  MeetingCatalog,
  MeetingPerson,
  MeetingReceipt,
  MeetingRequestError,
  publicMeetingService,
} from '../services/publicMeetingService';
import { setPwaUpdateBlock } from '../services/pwaUpdateSafety';
import { normalizeComumDisplay } from '../utils/normalizeComum';

const Icon: React.FC<{
  name: React.ComponentProps<typeof FontAwesome5>['name'];
  color?: string;
  size?: number;
}> = ({ name, color = '#287ec0', size = 18 }) => (
  <FontAwesome5 solid name={name} color={color} size={size} />
);
const churchName = (name: string, city: string) =>
  meetingLabel(normalizeComumDisplay(name.replace(/^(?:BR-)?\d{2}-\d{3,6}\s*-\s*/i, ''), city));

export const PublicMeetingScreen: React.FC = () => {
  const [catalog, setCatalog] = useState<MeetingCatalog | null>(null);
  const [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [cityId, setCityId] = useState(''),
    [churchId, setChurchId] = useState('');
  const [query, setQuery] = useState(''),
    [person, setPerson] = useState<MeetingPerson | null>(null);
  const [people, setPeople] = useState<MeetingPerson[]>([]),
    [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false),
    [searched, setSearched] = useState(false);
  const [error, setError] = useState(''),
    [searchError, setSearchError] = useState('');
  const [saving, setSaving] = useState(false),
    [receipt, setReceipt] = useState<MeetingReceipt | null>(null);
  const [active, setActive] = useState(0);
  const savingRef = useRef(false),
    input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLDivElement>(null),
    blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const listId = useId();
  const city = catalog?.municipios.find(item => item.id === cityId);
  const church = city?.comuns.find(item => item.id === churchId);
  const event = catalog?.evento;
  const closed = !!event && !event.aberto;
  const listOpen = focused && !person && query.trim().length >= 2 && !!church && !closed;
  useEffect(() => {
    if (receipt) {
      const page = document.querySelector<HTMLElement>('.ram-page');
      if (page) page.scrollTop = 0;
    }
  }, [receipt]);
  useEffect(() => {
    document.title = 'Confirmação de Presença | Reunião Musical';
    const controller = new AbortController();
    setLoading(true);
    setError('');
    publicMeetingService
      .catalog(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setCatalog(data);
      })
      .catch(reason => {
        if (!controller.signal.aborted)
          setError(reason.message || 'Não foi possível carregar as opções.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useLayoutEffect(() => {
    setPwaUpdateBlock('public-meeting', !receipt && Boolean(cityId || query || saving));
    return () => setPwaUpdateBlock('public-meeting', false);
  }, [cityId, query, saving, receipt]);
  useEffect(() => {
    const controller = new AbortController();
    setPeople([]);
    setSearched(false);
    setSearchError('');
    setSearching(false);
    setActive(0);
    if (!city || !church || person || query.trim().length < 2 || closed) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await publicMeetingService.people(cityId, churchId, query, controller.signal);
        if (!controller.signal.aborted) {
          setPeople(rows);
          setSearched(true);
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setSearchError(
            reason instanceof Error ? reason.message : 'Não foi possível buscar os nomes.'
          );
          if (reason instanceof MeetingRequestError && reason.kind === 'closed')
            setCatalog(
              previous => previous && { ...previous, evento: { ...previous.evento, aberto: false } }
            );
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cityId, churchId, query, person, closed]);
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );
  useEffect(() => {
    if (listOpen && people[active])
      document.getElementById(listId + '-' + active)?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  const choose = (item: MeetingPerson) => {
    setPerson(item);
    setQuery(item.nome);
    setFocused(false);
    setError('');
    setPeople([]);
    input.current?.blur();
  };
  const changeCity = (value: string) => {
    setCityId(value);
    setChurchId('');
    setQuery('');
    setPerson(null);
    setPeople([]);
    setError('');
    setSearchError('');
  };
  const changeChurch = (value: string) => {
    setChurchId(value);
    setQuery('');
    setPerson(null);
    setPeople([]);
    setError('');
    setSearchError('');
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || !city || !church || !person || closed) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setFocused(false);
    try {
      setReceipt(await publicMeetingService.confirm(cityId, churchId, person.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Não foi possível confirmar sua presença.'
      );
      if (reason instanceof MeetingRequestError && reason.kind === 'closed')
        setCatalog(
          previous => previous && { ...previous, evento: { ...previous.evento, aberto: false } }
        );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  return (
    <main className="ram-page">
      <style>{css}</style>
      <article className="ram-card" aria-labelledby="ram-title">
        <header className="ram-hero">
          <div className="ram-logo" role="img" aria-label="Congregação Cristã no Brasil">
            <Image
              source={require('../img/logo-ccb-light.png')}
              style={{ width: 190, height: 98, alignSelf: 'center' }}
              resizeMode="contain"
              accessible={false}
            />
          </div>
          <h1 id="ram-title">Confirmação de Presença</h1>
          <p>{event?.titulo || PUBLIC_MEETING.title}</p>
          <span className="ram-regional">Regional Itapevi</span>
        </header>
        <div className="ram-event" aria-label="Informações da reunião">
          <div className="ram-event-item">
            <span className="ram-event-icon ram-amber">
              <Icon name="calendar-day" color="#c08018" size={17} />
            </span>
            <div>
              <small>Data da reunião</small>
              <strong>
                {meetingDate(event?.data || PUBLIC_MEETING.date)}
                {' · ' + (event?.horario || PUBLIC_MEETING.time)}
              </strong>
            </div>
          </div>
          <div className="ram-event-item">
            <span className="ram-event-icon ram-rose">
              <Icon name="map-marker-alt" color="#df5266" />
            </span>
            <div>
              <small>Local</small>
              <strong>{event?.local || PUBLIC_MEETING.venue}</strong>
            </div>
          </div>
        </div>
        {receipt ? (
          <section className="ram-success" aria-live="polite">
            <span className="ram-success-icon">
              <Icon name="check" color="#139576" size={29} />
            </span>
            <span className="ram-eyebrow">TUDO CERTO</span>
            <h2>
              {receipt.ja_confirmado ? 'Sua presença já está confirmada!' : 'Presença confirmada!'}
            </h2>
            <p>
              <strong>{meetingLabel(person?.nome || '')}</strong>, recebemos sua confirmação para a
              Reunião de Aprimoramento Musical.
            </p>
            <div className="ram-receipt">
              <Icon name="map-marker-alt" color="#df5266" size={17} />
              <div>
                <strong>{churchName(church?.nome || '', city?.nome || '')}</strong>
                <span>{meetingLabel(city?.nome || '')}</span>
              </div>
            </div>
            <p className="ram-success-note">
              Agradecemos sua participação. Nos vemos na Central de Itapevi!
            </p>
            <button
              type="button"
              className="ram-secondary"
              onClick={() => {
                setReceipt(null);
                setPerson(null);
                setQuery('');
                setError('');
              }}
            >
              Confirmar outra pessoa
            </button>
          </section>
        ) : (
          <form className="ram-form" onSubmit={submit} noValidate>
            <div className="ram-intro">
              <h2>Vamos confirmar sua participação?</h2>
              <p>Encontre seu nome e confirme sua presença na reunião.</p>
            </div>
            <ol className="ram-steps" aria-label="Etapas da confirmação">
              {['Município', 'Comum', 'Seu nome'].map((label, index) => {
                const complete = index === 0 ? !!city : index === 1 ? !!church : !!person;
                const current = !city ? 0 : !church ? 1 : 2;
                return (
                  <li
                    key={label}
                    className={complete ? 'done' : current === index ? 'current' : ''}
                  >
                    <span>
                      {complete ? <Icon name="check" size={10} color="#ffffff" /> : index + 1}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ol>
            {closed && (
              <div className="ram-message" role="status">
                <Icon name="calendar-check" color="#9a711d" />
                <span>As confirmações para esta reunião foram encerradas.</span>
              </div>
            )}
            {error && (
              <div className="ram-error" role="alert">
                <Icon name="exclamation-circle" color="#cc465d" size={17} />
                <div>
                  {error}
                  {!catalog && !loading && (
                    <button type="button" onClick={() => setRetry(value => value + 1)}>
                      Tentar novamente
                    </button>
                  )}
                </div>
              </div>
            )}
            <label className="ram-label" htmlFor="ram-city">
              Município <span>*</span>
            </label>
            <div className="ram-field">
              <span className="ram-field-icon">
                <Icon name="city" />
              </span>
              <select
                id="ram-city"
                value={cityId}
                onChange={e => changeCity(e.target.value)}
                disabled={loading || saving || closed || !catalog}
                required
              >
                <option value="">
                  {loading ? 'Carregando municípios…' : 'Selecione o município'}
                </option>
                {catalog?.municipios.map(item => (
                  <option value={item.id} key={item.id}>
                    {meetingLabel(item.nome)}
                  </option>
                ))}
              </select>
              <span className="ram-chevron">
                <Icon name="chevron-down" size={11} color="#8295aa" />
              </span>
            </div>
            <label className="ram-label" htmlFor="ram-church">
              Comum congregação <span>*</span>
            </label>
            <div className="ram-field">
              <span className="ram-field-icon">
                <Icon name="map-marker-alt" color="#df5266" />
              </span>
              <select
                id="ram-church"
                value={churchId}
                onChange={e => changeChurch(e.target.value)}
                disabled={!city || saving || closed}
                required
              >
                <option value="">
                  {city ? 'Selecione sua comum congregação' : 'Selecione primeiro o município'}
                </option>
                {city?.comuns.map(item => (
                  <option value={item.id} key={item.id}>
                    {churchName(item.nome, city.nome)}
                  </option>
                ))}
              </select>
              <span className="ram-chevron">
                <Icon name="chevron-down" size={11} color="#8295aa" />
              </span>
            </div>
            <label className="ram-label" htmlFor="ram-person">
              Nome completo <span>*</span>
            </label>
            <div ref={picker}>
              <div className={'ram-field' + (person ? ' ram-field-selected' : '')}>
                <span className="ram-field-icon">
                  <Icon name="user" color="#0a9a9c" />
                </span>
                <input
                  id="ram-person"
                  ref={input}
                  type="text"
                  value={query}
                  autoComplete="off"
                  maxLength={100}
                  disabled={!church || saving || closed}
                  placeholder={
                    church ? 'Digite seu nome para buscar' : 'Selecione primeiro sua comum'
                  }
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={listOpen}
                  aria-controls={listId}
                  aria-activedescendant={
                    listOpen && people[active] ? listId + '-' + active : undefined
                  }
                  aria-describedby="ram-name-help"
                  onChange={e => {
                    setQuery(e.target.value);
                    setPerson(null);
                    setError('');
                  }}
                  onFocus={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    setFocused(true);
                  }}
                  onBlur={() => {
                    blurTimer.current = setTimeout(() => setFocused(false), 150);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setFocused(false);
                    if (
                      listOpen &&
                      people.length &&
                      (e.key === 'ArrowDown' || e.key === 'ArrowUp')
                    ) {
                      e.preventDefault();
                      setActive(
                        value =>
                          (value + (e.key === 'ArrowDown' ? 1 : -1) + people.length) % people.length
                      );
                    }
                    if (e.key === 'Enter' && listOpen) {
                      e.preventDefault();
                      if (people[active]) choose(people[active]);
                    }
                  }}
                />
                {person && (
                  <span className="ram-selected-icon">
                    <Icon name="check-circle" color="#0a9a7a" size={17} />
                  </span>
                )}
              </div>
              {listOpen && (
                <div className="ram-results">
                  {searchError ? (
                    <p role="alert">{searchError}</p>
                  ) : searching || !searched ? (
                    <p role="status">Buscando nomes…</p>
                  ) : people.length ? (
                    <ul id={listId} role="listbox" aria-label="Nomes encontrados">
                      {people.map((item, index) => (
                        <li key={item.id} role="presentation">
                          <button
                            type="button"
                            id={listId + '-' + index}
                            role="option"
                            aria-selected={active === index}
                            className={active === index ? 'active' : ''}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => choose(item)}
                          >
                            <span className="ram-avatar">{item.nome.trim().charAt(0)}</span>
                            <span>
                              <strong>{meetingLabel(item.nome)}</strong>
                              {item.cargo && <small>{meetingLabel(item.cargo)}</small>}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p role="status">
                      Nenhum nome encontrado. Confira o município e a comum ou tente outra parte do
                      nome.
                    </p>
                  )}
                </div>
              )}
            </div>
            <p id="ram-name-help" className={'ram-help' + (person ? ' selected' : '')}>
              {person
                ? 'Nome selecionado. Agora é só confirmar sua presença.'
                : 'Digite pelo menos 2 letras e selecione seu nome na lista.'}
            </p>
            <button
              type="submit"
              className="ram-primary"
              disabled={!person || !church || saving || closed}
            >
              <Icon name={saving ? 'hourglass-half' : 'check-circle'} color="#ffffff" size={18} />
              {saving ? 'Confirmando presença…' : 'Confirmar presença'}
            </button>
            <p className="ram-footnote">
              <Icon name="lock" size={10} color="#8b9bad" />
              Sua confirmação será usada na organização desta reunião.
            </p>
          </form>
        )}
      </article>
      <footer className="ram-page-footer">
        Congregação Cristã no Brasil
        <br />
        <strong>Secretaria Regional da Música · Itapevi</strong>
      </footer>
    </main>
  );
};
const css = `
.ram-page,.ram-page *{box-sizing:border-box}.ram-page{width:100%;height:100%;overflow-y:auto;background:#f1f5f9;padding:32px 20px 24px;display:flex;flex-direction:column;align-items:center;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#28435b;-webkit-text-size-adjust:100%}.ram-card{width:100%;max-width:548px;border:1px solid #e1e9f1;border-radius:25px;background:white;box-shadow:0 12px 38px rgba(32,57,82,.08);flex-shrink:0}.ram-hero{padding:30px 24px 27px;background:#1e4b7a;border-radius:24px 24px 0 0;text-align:center;color:white}.ram-logo{display:flex;justify-content:center;filter:brightness(0) invert(1);-webkit-filter:brightness(0) invert(1)}.ram-hero h1{font-family:Outfit,Inter,sans-serif;font-size:28px;line-height:1.2;letter-spacing:-.55px;margin:20px 0 9px;font-weight:700}.ram-hero p{font-size:17px;line-height:1.5;margin:0 auto;max-width:330px;color:#f0f5fb}.ram-regional{display:block;margin-top:5px;font-size:12px;color:#c5d8ec;letter-spacing:.3px}.ram-event{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:21px 24px;border-bottom:1px solid #e9eff5;background:#fbfcfe}.ram-event-item{display:flex;align-items:center;gap:10px;min-width:0}.ram-event-item small{font-size:10px;display:block;color:#7f91a4;margin-bottom:5px}.ram-event-item strong{font-size:12px;line-height:1.4;display:block;color:#2e4b64}.ram-event-icon{height:36px;width:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ram-amber{background:#fff5df}.ram-rose{background:#fff0f3}.ram-form{padding:25px 27px 23px}.ram-intro h2{font-size:17px;line-height:1.4;margin:0 0 5px;letter-spacing:-.25px}.ram-intro p{font-size:12px;line-height:1.6;margin:0;color:#7b8fa3}.ram-steps{display:flex;list-style:none;padding:0;margin:21px 0 26px;gap:14px}.ram-steps li{display:flex;align-items:center;gap:6px;font-size:11px;color:#99a8b8;white-space:nowrap}.ram-steps li>span{display:flex;align-items:center;justify-content:center;background:#f0f4f8;width:22px;height:22px;border-radius:50%;font-size:10px;font-weight:700;flex-shrink:0}.ram-steps .current{color:#176fb0;font-weight:600}.ram-steps .current>span{background:#e8f3fc;color:#176fb0}.ram-steps .done{color:#486d81}.ram-steps .done>span{background:#1685bb}.ram-label{display:block;font-size:12px;font-weight:600;color:#40576f;margin:19px 0 8px}.ram-label>span{color:#dc6b7c}.ram-field{position:relative;height:54px;border:1px solid #dfe7f0;border-radius:12px;display:flex;align-items:stretch;background:#fff;transition:border-color .15s,box-shadow .15s;min-width:0}.ram-field:focus-within{border-color:#338dce;box-shadow:0 0 0 3px #2987c917}.ram-field-icon{width:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-right:1px solid #e4ebf3;border-radius:11px 0 0 11px}.ram-field select,.ram-field input{width:100%;min-width:0;flex:1;border:0;outline:0;background:transparent;color:#324c65;font:400 15px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:0 13px;border-radius:0 12px 12px 0}.ram-field select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:32px}.ram-chevron{position:absolute;right:16px;top:19px;pointer-events:none;display:flex}.ram-field select:disabled,.ram-field input:disabled{color:#9baabb;opacity:1;cursor:default}.ram-field input::placeholder{color:#97a7b8}.ram-field-selected{border-color:#9cd8ca;background:#fbfefd}.ram-selected-icon{width:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.ram-help{margin:10px 0 22px;font-size:11px;line-height:1.6;color:#8192a5}.ram-help.selected{color:#278975}.ram-primary,.ram-secondary{width:100%;min-height:52px;border:0;border-radius:12px;font-family:inherit;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;padding:12px 16px}.ram-primary{background:#1e4b7a;color:#fff;box-shadow:0 3px 6px #193e6417}.ram-primary:hover:not(:disabled){background:#153e69}.ram-primary:disabled{background:#c5d2df;color:#fff;box-shadow:none;cursor:default}.ram-primary:focus-visible,.ram-secondary:focus-visible,.ram-results button:focus-visible{outline:3px solid #85bdec;outline-offset:3px}.ram-footnote{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;line-height:1.5;color:#8b9bad;text-align:center;margin:16px 0 0}.ram-page-footer{font-size:11px;line-height:1.7;color:#8b9bad;text-align:center;margin:20px 0 0;flex-shrink:0}.ram-page-footer strong{font-weight:500;color:#7f91a6}.ram-error,.ram-message{display:flex;align-items:flex-start;gap:9px;padding:12px;border-radius:11px;margin:0 0 16px;font-size:12px;line-height:1.6}.ram-error{background:#fff1f3;color:#a64255;border:1px solid #f4d2d9}.ram-error button{display:block;border:0;background:transparent;color:#176fb0;padding:9px 0 0;font:600 12px Inter,sans-serif;cursor:pointer}.ram-message{color:#84662a;background:#fff8e9;border:1px solid #efdfb8}.ram-results{margin-top:8px;border:1px solid #d9e7f2;background:#fff;border-radius:12px;box-shadow:0 5px 16px #2947600c;overflow:hidden}.ram-results ul{list-style:none;margin:0;padding:5px;max-height:250px;overflow:auto;overscroll-behavior:contain}.ram-results li{margin:0;padding:0}.ram-results button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;background:white;border-radius:8px;cursor:pointer;padding:10px;font-family:inherit;min-height:52px;color:#355069}.ram-results button.active,.ram-results button:hover{background:#eff6fc}.ram-results strong{display:block;font-size:13px;font-weight:600;line-height:1.5}.ram-results small{display:block;font-size:11px;color:#8394a7;margin-top:2px}.ram-results p{font-size:12px;color:#7b8fa3;line-height:1.6;padding:13px 15px;margin:0}.ram-avatar{height:32px;width:32px;background:#e8f3f9;color:#297db2;display:flex;align-items:center;justify-content:center;border-radius:10px;font-weight:700;font-size:12px;flex-shrink:0}.ram-success{padding:32px 27px;text-align:center}.ram-success-icon{margin:0 auto 18px;background:#e6f7ef;display:flex;align-items:center;justify-content:center;width:70px;height:70px;border-radius:24px}.ram-eyebrow{font-size:9px;letter-spacing:1.5px;color:#42957e;font-weight:700}.ram-success h2{font-family:Outfit,Inter,sans-serif;color:#24485c;font-size:25px;line-height:1.25;letter-spacing:-.4px;margin:9px 0 12px}.ram-success>p{font-size:13px;color:#788da1;line-height:1.8;margin:0}.ram-success>p strong{color:#355971;font-weight:600}.ram-receipt{display:flex;align-items:center;gap:12px;padding:15px;background:#f6f9fc;border:1px solid #e6edf4;border-radius:13px;text-align:left;margin:22px 0 17px}.ram-receipt strong{display:block;font-size:13px;line-height:1.5}.ram-receipt span{display:block;font-size:11px;color:#8295a8;margin-top:3px}.ram-success .ram-success-note{font-size:12px}.ram-secondary{background:#edf4fa;color:#1e4b7a;font-size:12px;margin-top:24px}.ram-secondary:hover{background:#e3eef7}@media(max-width:480px){.ram-page{padding:16px 14px 24px}.ram-card{border-radius:22px}.ram-hero{border-radius:21px 21px 0 0;padding:25px 19px 23px}.ram-hero h1{font-size:25px;margin-top:17px}.ram-hero p{font-size:16px;max-width:270px}.ram-form{padding:22px 20px}.ram-event{padding:18px 20px;gap:10px}.ram-event-item{gap:8px}.ram-event-item strong{font-size:11px}.ram-event-icon{width:32px;height:34px;border-radius:10px}.ram-steps{gap:10px;justify-content:space-between}.ram-steps li{font-size:10px;gap:5px}.ram-field input,.ram-field select{font-size:16px}.ram-field-icon{width:44px}.ram-success{padding:28px 20px}.ram-success h2{font-size:24px}}@media(max-width:350px){.ram-page{padding:12px 10px 20px}.ram-form{padding:20px 15px}.ram-event{padding:16px 15px}.ram-event-item strong{font-size:10px}.ram-hero h1{font-size:23px}.ram-steps{gap:6px}.ram-steps li{font-size:9px}}@media(prefers-reduced-motion:reduce){.ram-field{transition:none}}
`;
