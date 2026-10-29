export type Municipality = {
  id: string;
  name: string;
  regionId: string;
  region: string;
};
export type Region = { id: string; name: string };
export type Source = { url: string; capturedAt: string; sha256: string };
export type Procedure = {
  id: string;
  cnpj: string;
  agency: string;
  unit: string;
  unitCode: string;
  municipalityId: string;
  municipality: string;
  year: number;
  sequence: number;
  object: string;
  publishedAt: string;
  mode: string;
  srp: boolean;
  estimated: number | null;
  homologated: number | null;
  officialUrl: string;
  source: Source;
  itemCount: number;
  matchedCount: number;
  modalityId?: number;
  status?: string;
  statusId?: number;
};
export type Observation = {
  id: string;
  procedureId: string;
  municipalityId: string;
  agencyId: string;
  productId: string;
  product: string;
  description: string;
  item: number;
  result: number;
  supplierId: string;
  supplier: string;
  date: string;
  year: number;
  quantity: number;
  unitPrice: number;
  total: number | null;
  originalUnit: string;
  originalQuantity: number;
  originalPrice: number;
  conversion: number;
  source: Source;
  itemSource: Source;
  precisionNote: string | null;
};
export type Exclusion = {
  procedureId: string;
  item: number;
  description: string;
  reason: string;
  url: string;
};
export type Manifest = {
  version: string;
  collectedAt: string;
  scope: "pilot" | "state";
  years: number[];
  modalities: number[];
  scopeDescription: string;
  metadataScanned: number;
  medicineCandidates: number;
  municipalitiesWithData: number;
  procedures: number;
  observations: number;
  suppliers: number;
  sourceRequests: number;
  sourceFailures: number;
  datasetSha256: string;
  catalogCoverage?: {
    modality: number;
    year: number;
    month: number;
    records: number;
  }[];
  contractCoverage?: { cnpj: string; year: number; records: number }[];
  contracts?: number;
  neo4j: {
    verified: boolean;
    version?: string;
    nodes?: number;
    edges?: number;
    verifiedAt?: string;
  };
};
export type Dataset = {
  contracts?: PublicContract[];
  municipalities: Municipality[];
  regions: Region[];
  procedures: Procedure[];
  observations: Observation[];
  exclusions: Exclusion[];
  manifest: Manifest;
};
export type PublicContract = {
  id: string;
  procedureId: string | null;
  cnpj: string;
  agencyId: string;
  municipalityId: string;
  municipality: string;
  agency: string;
  supplierId: string;
  supplier: string;
  object: string;
  year: number;
  signedAt: string;
  publishedAt: string;
  start: string;
  end: string;
  initialValue: number | null;
  globalValue: number | null;
  kind: string;
  kindId: number;
  source: Source;
  officialUrl: string;
};
export type GraphNode = {
  id: string;
  type:
    | "municipality"
    | "region"
    | "agency"
    | "procedure"
    | "supplier"
    | "product"
    | "contract";
  label: string;
  municipalityId?: string;
  year?: number;
  evidence?: string;
};
export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  evidence: string;
  capturedAt: string;
  procedureId?: string;
  year?: number;
};
export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  backend: "neo4j-snapshot" | "neo4j-live";
  verified: boolean;
  version: string;
  truncated?: boolean;
};
