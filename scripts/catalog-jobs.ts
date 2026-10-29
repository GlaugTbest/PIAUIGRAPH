import type { Dataset } from "../src/lib/model";
export function contractJobs(data:Dataset) {
  const groups=Map.groupBy(data.procedures,p=>p.cnpj);
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).flatMap(([cnpj,ps])=>{
    const units=ps.some(p=>p.sphere==="F")?[...new Set(ps.map(p=>p.unitCode))].sort():[""];
    return units.flatMap(unitCode=>[2024,2025].map(year=>({cnpj,year,unitCode})));
  });
}
