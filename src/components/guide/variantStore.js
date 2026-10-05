/**
 * Guide variant state (accelerator × engine) shared by the VariantSelector,
 * <Variant>/<VariantGroup> blocks and <GuideEnv> on published guide pages.
 *
 * Resolution order: URL query (?accelerator=tpu/v7&engine=sglang), then
 * localStorage (carries the choice across guides), then the guide defaults
 * from guide.yaml. Selections the guide does not support fall back to the
 * defaults with a notice.
 *
 * The engine is stored in the same storage slot / query param as Docusaurus
 * <Tabs groupId="engine" queryString="engine">, so engine tab groups and the
 * selector stay in sync in both directions.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStorageSlot } from '@docusaurus/theme-common';
import { useHistory, useLocation } from '@docusaurus/router';
import useIsBrowser from '@docusaurus/useIsBrowser';

export const ACCELERATOR_STORAGE_KEY = 'llmd.guide.accelerator';
// Same key Docusaurus Tabs use for groupId="engine".
export const ENGINE_STORAGE_KEY = 'docusaurus.tab.engine';
export const MODELSERVER_STORAGE_KEY = 'docusaurus.tab.modelserver';
export const ACCELERATOR_PARAM = 'accelerator';
export const ENGINE_PARAM = 'engine';
export const MODELSERVER_PARAM = 'modelserver';

const GuideContext = createContext(null);

export function useGuide() {
  return useContext(GuideContext);
}

/** Normalised engine cell: {status, issue} or null when unsupported/missing. */
export function engineCell(support, accelerator, engine) {
  const cell = support?.accelerators?.[accelerator]?.engines?.[engine];
  if (cell == null) return null;
  const c = typeof cell === 'string' ? { status: cell } : { status: cell.status, issue: cell.issue };
  return c;
}

export function isSupported(support, accelerator, engine) {
  if (!support?.accelerators) return true; // no matrix: everything allowed
  const c = engineCell(support, accelerator, engine);
  return Boolean(c && c.status && c.status !== 'unsupported');
}

export function acceleratorKeys(support) {
  return Object.keys(support?.accelerators ?? {});
}

export function engineKeys(support) {
  return Object.keys(support?.engines ?? {});
}

export function supportedEngines(support, accelerator) {
  return engineKeys(support).filter((e) => isSupported(support, accelerator, e));
}

/**
 * Pick a supported {accelerator, engine} given the requested values and the
 * guide defaults. Returns {accelerator, engine, fellBack}.
 */
export function resolveSelection(meta, requested) {
  const support = meta?.support;
  const defaults = meta?.defaults ?? {};
  const accs = acceleratorKeys(support);
  let fellBack = false;
  let accelerator = requested.accelerator ?? defaults.accelerator;
  if (accs.length && !accs.includes(accelerator)) {
    if (requested.accelerator != null) fellBack = true;
    accelerator = accs.includes(defaults.accelerator) ? defaults.accelerator : accs[0];
  }
  let engine = requested.engine ?? defaults.engine;
  const engs = engineKeys(support);
  if (support?.accelerators && (!engs.includes(engine) || !isSupported(support, accelerator, engine))) {
    if (requested.engine != null) fellBack = true;
    const ok = supportedEngines(support, accelerator);
    engine = ok.includes(defaults.engine) ? defaults.engine : ok[0] ?? defaults.engine;
  }
  return { accelerator, engine, fellBack };
}

/** Parse a data-when string: "ACCELERATOR_TYPE=a,b;MODEL_SERVER=vllm". */
export function parseWhen(when) {
  const out = {};
  for (const part of String(when ?? '').split(';')) {
    const [k, v] = part.split('=');
    if (!k || v == null) continue;
    const key = k.trim() === 'ACCELERATOR_TYPE' ? 'accelerator' : k.trim() === 'MODEL_SERVER' ? 'engine' : k.trim();
    out[key] = v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

export function whenMatches(when, selection) {
  const cond = parseWhen(when);
  return Object.entries(cond).every(([k, vals]) => vals.includes(selection[k]));
}

export function GuideProvider({ meta, children }) {
  const isBrowser = useIsBrowser();
  const location = useLocation();
  const history = useHistory();
  const [storedAcc, accSlot] = useStorageSlot(ACCELERATOR_STORAGE_KEY);
  const [storedEng, engSlot] = useStorageSlot(ENGINE_STORAGE_KEY);
  const [, msSlot] = useStorageSlot(MODELSERVER_STORAGE_KEY);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requested = isBrowser
    ? {
        accelerator: query.get(ACCELERATOR_PARAM) ?? storedAcc ?? undefined,
        engine: query.get(ENGINE_PARAM) ?? storedEng ?? undefined,
      }
    : {};
  const { accelerator, engine, fellBack: fellBackNow } = resolveSelection(meta, requested);
  // Keep the notice once shown (the URL is rewritten below, after which the
  // request itself no longer falls back).
  const [noticed, setNoticed] = useState(false);
  const fellBack = fellBackNow || noticed;

  const writeQuery = useCallback(
    (updates) => {
      const q = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(updates)) q.set(k, v);
      history.replace({ ...history.location, search: `?${q.toString()}` });
    },
    [history],
  );

  const setAccelerator = useCallback(
    (acc) => {
      setNoticed(false);
      accSlot.set(acc);
      const msTab = acc === 'tpu/v7-dynamic-slice' ? 'google-tpu-v7-dynamic-slicing' : 'default';
      msSlot.set(msTab);
      const updates = { [ACCELERATOR_PARAM]: acc, [MODELSERVER_PARAM]: msTab };
      if (!isSupported(meta?.support, acc, engine)) {
        const ok = supportedEngines(meta?.support, acc);
        const next = ok.includes(meta?.defaults?.engine) ? meta.defaults.engine : ok[0];
        if (next) {
          engSlot.set(next);
          updates[ENGINE_PARAM] = next;
        }
      } else {
        updates[ENGINE_PARAM] = engine;
      }
      writeQuery(updates);
    },
    [accSlot, engSlot, msSlot, engine, meta, writeQuery],
  );

  const setEngine = useCallback(
    (eng) => {
      setNoticed(false);
      engSlot.set(eng);
      writeQuery({ [ACCELERATOR_PARAM]: accelerator, [ENGINE_PARAM]: eng });
    },
    [engSlot, accelerator, writeQuery],
  );

  // When the requested selection fell back (unsupported here), pin the
  // resolved values in the URL so engine <Tabs> (which read ?engine= before
  // storage) agree with the selector. Storage is left alone so the reader's
  // preference still applies to other guides.
  useEffect(() => {
    if (!isBrowser || !fellBackNow) return;
    setNoticed(true);
    if (query.get(ENGINE_PARAM) !== engine || query.get(ACCELERATOR_PARAM) !== accelerator) {
      writeQuery({ [ACCELERATOR_PARAM]: accelerator, [ENGINE_PARAM]: engine });
    }
  }, [isBrowser, fellBackNow, query, engine, accelerator, writeQuery]);

  const value = useMemo(
    () => ({ meta, selection: { accelerator, engine }, fellBack, setAccelerator, setEngine }),
    [meta, accelerator, engine, fellBack, setAccelerator, setEngine],
  );
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
