import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogFilters, catalogExplore, valueCheck, topicOf } from "../src/lib/catalog";
import { graphInput, neighborhood } from "../src/lib/graph";
import { getData } from "../src/lib/data";
import type { Procedure, PublicContract } from "../src/lib/model";
// Synthetic financial edge cases stay in this test file; public records are never generated.
const procedure = (estimated:number|null,homologated:number|null,statusId:number|undefined=1) => ({estimated,homologated,statusId}) as Procedure;
test("global published-value checks exclude absent, zero, cancelled and unknown-status records",()=>{
  assert.equal(valueCheck(procedure(100,150)).above,true);
  assert.equal(valueCheck(procedure(100,100.01)).above,false);
  for(const p of [procedure(null,150),procedure(0,150),procedure(100,null),procedure(100,150,2),{...procedure(100,150),statusId:undefined}]) {
    assert.equal(valueCheck(p).eligible,false);assert.equal(valueCheck(p).above,false);assert.equal(valueCheck(p).difference,null);
  }
});
test("subject labels support services and infrastructure without asserting official classification",()=>{
  assert.equal(topicOf("CONTRATAÇÃO DE EMPRESA PARA PAVIMENTAÇÃO DE RUAS").id,"obras");
  assert.equal(topicOf("Prestação de serviços de assessoria contábil").id,"servicos");
  assert.equal(topicOf("Aquisição de combustíveis e diesel").id,"transporte");
  assert.equal(topicOf("Objeto sem palavras de classificação").id,"outros");
});
test("real catalog searches preserve primary-source identity and page boundaries",async()=>{
  const {data}=await getData();
  const e=catalogExplore(data,catalogFilters(new URLSearchParams("q=Pimenteiras")));
  assert.ok(e.rows.length);assert.ok(e.rows.every(p=>p.source.url.startsWith("https://pncp.gov.br/")));
  assert.ok(e.rows.every(p=>p.municipality==="Pimenteiras"||/pimenteiras/i.test(`${p.object} ${p.agency}`)));
  const all=catalogExplore(data,catalogFilters(new URLSearchParams()));
  const next=catalogExplore(data,catalogFilters(new URLSearchParams("page=2")));
  if(all.pages>1)assert.ok(!all.rows.some(a=>next.rows.some(b=>a.id===b.id)));
  assert.equal(all.total,data.procedures.length);
});
test("contract relationships use the explicit procurement key; missing keys do not invent a link",async()=>{
  const {data}=await getData();const p=data.procedures[0];
  const c:PublicContract={id:"test-only-contract",procedureId:p.id,cnpj:p.cnpj,agencyId:`${p.cnpj}:${p.unitCode}`,agency:p.agency,municipalityId:p.municipalityId,municipality:p.municipality,supplierId:"12345678000199",supplier:"Synthetic test company",object:"Test fixture only",year:2025,signedAt:"2025-01-10",publishedAt:"2025-01-10",start:"2025-01-10",end:"2025-12-31",initialValue:100,globalValue:100,kind:"Contrato",kindId:1,source:p.source,officialUrl:"https://pncp.gov.br/test-fixture"};
  const graph=graphInput({...data,contracts:[c]});
  assert.ok(graph.edges.some(e=>e.source===`procedure:${p.id}`&&e.target==="contract:test-only-contract"&&e.type==="ORIGINA_CONTRATO"));
  assert.ok(neighborhood(graph,`procedure:${p.id}`,2).nodes.some(n=>n.id==="supplier:12345678000199"));
  const missing=graphInput({...data,contracts:[{...c,procedureId:null}]});
  assert.ok(!missing.edges.some(e=>e.target==="contract:test-only-contract"&&e.type==="ORIGINA_CONTRATO"));
});
