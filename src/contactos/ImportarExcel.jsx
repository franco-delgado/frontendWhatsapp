// Carga masiva de clientes desde un archivo Excel (.xlsx).
// 1) Se elige el archivo y se lee en el navegador. 2) Se muestra una vista previa con las
// filas válidas e inválidas. 3) Al confirmar, se envían al servidor: los teléfonos nuevos se
// cargan, los que ya estaban agendados actualizan su monto a cobrar, y devuelve el detalle
// de lo que no pudo cargar (DNI repetido, teléfono agendado por otro usuario, etc.).
import { useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";

const MAX_FILAS = 5000;
const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

// Quita tildes/mayúsculas para reconocer encabezados: "Teléfono" == "telefono".
const norm = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Nombres de columna aceptados para cada campo.
const ALIAS = {
  nombre: ["nombre", "nombres"],
  apellido: ["apellido", "apellidos"],
  dni: ["dni", "documento"],
  numero: ["telefono", "numero", "celular", "whatsapp", "tel"],
  monto: ["monto", "deuda", "importe", "saldo"],
};

// Los números de Excel llegan como Number: se pasan a texto sin notación científica.
const aTexto = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? v.toFixed(0) : String(v);
  return String(v).trim();
};

// Acepta "15000", "15.000,50", "15,000.50" y "$ 15000".
function aMonto(v) {
  if (typeof v === "number") return v;
  let t = String(v ?? "").replace(/[^\d.,-]/g, "");
  if (t === "") return NaN;
  const ultimaComa = t.lastIndexOf(","),
    ultimoPunto = t.lastIndexOf(".");
  if (ultimaComa > -1 && ultimoPunto > -1) {
    // El separador que aparece último es el decimal.
    t = ultimaComa > ultimoPunto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (ultimaComa > -1) {
    t = t.replace(",", ".");
  }
  return Number(t);
}

// Convierte la matriz leída del Excel en filas validadas.
function interpretar(matriz) {
  if (!matriz?.length) throw new Error("El archivo está vacío.");

  const encabezados = matriz[0].map(norm);
  const col = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    col[campo] = encabezados.findIndex((h) => alias.includes(h));
  }
  const faltan = ["nombre", "numero", "monto"].filter((c) => col[c] === -1);
  if (faltan.length) {
    const nombres = { nombre: "Nombre", numero: "Teléfono", monto: "Monto" };
    throw new Error(
      `Faltan columnas obligatorias en la primera fila: ${faltan.map((c) => nombres[c]).join(", ")}. ` +
        "Descargá la plantilla para ver el formato."
    );
  }

  const celda = (fila, campo) => (col[campo] === -1 ? "" : aTexto(fila[col[campo]]));
  const validas = [];
  const invalidas = [];

  matriz.slice(1).forEach((fila, i) => {
    const nroFila = i + 2; // número de fila tal como se ve en Excel
    if (!fila || fila.every((c) => c === null || c === undefined || String(c).trim() === "")) return;

    const nombre = celda(fila, "nombre");
    const apellido = celda(fila, "apellido");
    const dni = soloDigitos(celda(fila, "dni"));
    const numero = soloDigitos(celda(fila, "numero"));
    const monto = aMonto(fila[col.monto]);

    // La fila de ejemplo de la plantilla no se importa.
    if (dni === "27345678" && numero === "5493827402013" && nombre === "María") return;

    const motivos = [];
    if (!nombre) motivos.push("falta el nombre");
    if (numero.length < 8) motivos.push("teléfono inválido");
    if (dni && (dni.length < 6 || dni.length > 8)) motivos.push("DNI debe tener 6 a 8 números");
    if (!Number.isFinite(monto) || monto < 0) motivos.push("monto inválido");

    if (motivos.length) invalidas.push({ fila: nroFila, motivo: motivos.join(", ") });
    else validas.push({ fila: nroFila, nombre, apellido, dni, numero, monto });
  });

  return { validas, invalidas };
}

export default function ImportarExcel({ importar }) {
  const inputRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState("");
  const [preview, setPreview] = useState(null); // { validas, invalidas }
  const [resultado, setResultado] = useState(null); // respuesta del servidor
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const reiniciar = () => {
    setArchivo("");
    setPreview(null);
    setResultado(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const alElegir = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    reiniciar();
    setArchivo(f.name);

    if (!/\.xlsx$/i.test(f.name)) {
      setError("Solo se aceptan archivos .xlsx. Si tenés un .xls o .csv, abrilo en Excel y guardalo como .xlsx.");
      return;
    }
    setTrabajando(true);
    try {
      const matriz = await readSheet(f); // primera hoja
      const r = interpretar(matriz);
      if (r.validas.length + r.invalidas.length > MAX_FILAS) {
        throw new Error(`El archivo tiene más de ${MAX_FILAS} filas. Dividilo en partes.`);
      }
      setPreview(r);
    } catch (err) {
      setError(err.message || "No se pudo leer el archivo.");
    } finally {
      setTrabajando(false);
    }
  };

  const confirmar = async () => {
    setTrabajando(true);
    setError("");
    try {
      setResultado(await importar(preview.validas));
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="importar-excel">
      <button type="button" className="btn-guardar" onClick={() => setAbierto((v) => !v)}>
        📥 Cargar clientes desde Excel
      </button>

      {abierto && (
        <div className="importar-panel">
          <small className="filtro-aviso">
            Columnas: <b>Nombre</b>, Apellido, DNI, <b>Teléfono</b> y <b>Monto</b> (en negrita, obligatorias).{" "}
            <a href="/plantilla-clientes.xlsx" download>
              Descargar plantilla
            </a>
            . Si el teléfono ya está agendado, se <b>actualiza su monto a cobrar</b>; si lo tiene
            otro usuario o el DNI está repetido, esa fila no se carga.
          </small>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="form-input"
            onChange={alElegir}
            disabled={trabajando}
          />

          {trabajando && <small className="filtro-aviso">Procesando {archivo}…</small>}
          {error && <small className="importar-error">⚠️ {error}</small>}

          {preview && (
            <div className="importar-preview">
              <p>
                <b>{preview.validas.length}</b> cliente(s) listos para cargar
                {preview.invalidas.length > 0 && (
                  <>
                    {" "}y <b>{preview.invalidas.length}</b> fila(s) con problemas (no se cargarán)
                  </>
                )}
                .
              </p>
              {preview.invalidas.length > 0 && (
                <ul className="importar-errores">
                  {preview.invalidas.slice(0, 50).map((x) => (
                    <li key={x.fila}>
                      Fila {x.fila}: {x.motivo}
                    </li>
                  ))}
                  {preview.invalidas.length > 50 && <li>… y {preview.invalidas.length - 50} más.</li>}
                </ul>
              )}
              <div className="importar-botones">
                <button
                  type="button"
                  className="btn-guardar"
                  onClick={confirmar}
                  disabled={trabajando || preview.validas.length === 0}
                >
                  Cargar {preview.validas.length} cliente(s)
                </button>
                <button type="button" className="btn-cancelar" onClick={reiniciar} disabled={trabajando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {resultado && (
            <div className="importar-preview">
              <p>
                ✅ Se cargaron <b>{resultado.importados}</b> cliente(s) nuevo(s).
                {resultado.actualizados > 0 && (
                  <> Se actualizó el monto de <b>{resultado.actualizados}</b> cliente(s) que ya estaban.</>
                )}
                {resultado.sinCambios > 0 && (
                  <> {resultado.sinCambios} ya estaban con ese mismo monto.</>
                )}
                {resultado.omitidos > 0 && <> No se cargaron {resultado.omitidos}:</>}
              </p>
              {resultado.errores?.length > 0 && (
                <ul className="importar-errores">
                  {resultado.errores.slice(0, 50).map((x) => (
                    <li key={x.fila}>
                      Fila {x.fila}: {x.motivo}
                    </li>
                  ))}
                  {resultado.errores.length > 50 && <li>… y {resultado.errores.length - 50} más.</li>}
                </ul>
              )}
              <button type="button" className="btn-cancelar" onClick={reiniciar}>
                Cargar otro archivo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
