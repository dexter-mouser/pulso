import { useRef, useState, type FormEvent } from 'react';
import { MONEDAS } from '../../../config';
import { mensajeDeError, useAvisos } from '../../../estado/Avisos';
import { useNegocio } from '../../../estado/Negocio';
import { usePaneles, type PropiedadesPanel } from '../../../estado/Paneles';
import { PanelDeslizante } from '../../PanelDeslizante/PanelDeslizante';
import estilos from './PanelAjustes.module.css';

const MAXIMO_NOMBRE = 60;

type CampoAjustes = 'nombre' | 'impuesto';
interface ErrorCampo {
  campo: CampoAjustes;
  texto: string;
}

// Ajustes generales del negocio
export function PanelAjustes({ abierto, onCerrado }: PropiedadesPanel) {
  const { datos, modo, puedeEditar, guardarAjustes } = useNegocio();
  const { avisar } = useAvisos();
  const { cerrarPanel } = usePaneles();
  const [nombre, setNombre] = useState(datos.ajustes.nombre);
  const [moneda, setMoneda] = useState(datos.ajustes.moneda);
  const [impuesto, setImpuesto] = useState(String(datos.ajustes.impuesto));
  const [errorCampo, setErrorCampo] = useState<ErrorCampo | null>(null);
  const [errorGuardado, setErrorGuardado] = useState('');
  const refs = { nombre: useRef<HTMLInputElement>(null), impuesto: useRef<HTMLInputElement>(null) };
  const [guardando, setGuardando] = useState(false);
  const editable = puedeEditar('ajustes');
  const monedas = (MONEDAS as readonly string[]).includes(moneda) ? MONEDAS : [moneda, ...MONEDAS];

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim();
    const impuestoNumero = Number(impuesto);
    const invalido = (campo: CampoAjustes, texto: string) => {
      setErrorCampo({ campo, texto });
      refs[campo].current?.focus();
    };
    if (!nombreLimpio) return invalido('nombre', 'Escribe el nombre del negocio.');
    if (impuesto.trim() === '' || !Number.isFinite(impuestoNumero) || impuestoNumero < 0 || impuestoNumero > 100) {
      return invalido('impuesto', 'El impuesto debe estar entre 0 y 100.');
    }
    setErrorCampo(null);
    setErrorGuardado('');
    setGuardando(true);
    try {
      await guardarAjustes({ nombre: nombreLimpio, moneda, impuesto: impuestoNumero });
      avisar('Ajustes guardados');
      cerrarPanel();
    } catch (fallo) {
      setErrorGuardado(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelDeslizante abierto={abierto} titulo="Ajustes del negocio" onCerrado={onCerrado}>
      <div className={estilos.contenedor}>
        <form className="formulario" onSubmit={guardar} noValidate>
          <div className="campo">
            <label className="campo-etiqueta" htmlFor="ajustes-nombre">Nombre del negocio</label>
            <input
              ref={refs.nombre} id="ajustes-nombre" className="control" required maxLength={MAXIMO_NOMBRE} value={nombre}
              disabled={!editable} aria-invalid={errorCampo?.campo === 'nombre' || undefined}
              aria-describedby={errorCampo?.campo === 'nombre' ? 'ajustes-nombre-error' : undefined}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errorCampo?.campo === 'nombre' && <p id="ajustes-nombre-error" className="campo-error">{errorCampo.texto}</p>}
          </div>
          <div className="fila-campos">
            <div className="campo">
              <label className="campo-etiqueta" htmlFor="ajustes-moneda">Moneda</label>
              <select id="ajustes-moneda" className="control" value={moneda} disabled={!editable} onChange={(e) => setMoneda(e.target.value)}>
                {monedas.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label className="campo-etiqueta" htmlFor="ajustes-impuesto">Impuesto sobre ventas (%)</label>
              <input
                ref={refs.impuesto} id="ajustes-impuesto" className="control" type="number" min={0} max={100} step={0.01} inputMode="decimal"
                value={impuesto} disabled={!editable}
                aria-describedby={errorCampo?.campo === 'impuesto' ? 'ajustes-impuesto-ayuda ajustes-impuesto-error' : 'ajustes-impuesto-ayuda'}
                aria-invalid={errorCampo?.campo === 'impuesto' || undefined}
                onChange={(e) => setImpuesto(e.target.value)}
              />
              {errorCampo?.campo === 'impuesto' && <p id="ajustes-impuesto-error" className="campo-error">{errorCampo.texto}</p>}
              <span id="ajustes-impuesto-ayuda" className="campo-ayuda">Se aplica a las ventas nuevas</span>
            </div>
          </div>
          {errorGuardado && <p className="campo-error" role="alert">{errorGuardado}</p>}
          {editable ? (
            <div>
              <button type="submit" className="boton boton-primario" disabled={guardando}>Guardar</button>
            </div>
          ) : (
            <p className="texto-secundario">Solo lectura: tu rol no puede editar los ajustes.</p>
          )}
        </form>

        <section aria-labelledby="ajustes-origen">
          <h3 id="ajustes-origen" className={estilos.encabezado}>Origen de datos</h3>
          <p className="texto-secundario">
            {modo === 'local'
              ? 'Los datos se guardan en este navegador. Para usar Supabase, completa .env (ver README).'
              : 'Conectado a Supabase.'}
          </p>
        </section>
      </div>
    </PanelDeslizante>
  );
}
