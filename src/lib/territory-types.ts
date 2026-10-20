import type { Geometry,FeatureCollection } from 'geojson';
export const localityKinds={distrito:'Distrito',bairro:'Bairro',engenho:'Engenho',sitio:'Sítio',comunidade_rural:'Comunidade rural'} as const;
export type LocalityKind=keyof typeof localityKinds;
export type Locality={id:string;name:string;description:string|null;kind:LocalityKind;latitude:number|null;longitude:number|null;geometry:Geometry|null;version:number};
export type TerritoryActivity={id:string;title:string;communityId:string|null;community:string|null;longitude:number|null;latitude:number|null;assignedTo:string|null;version:number};
export type Boundary={id:string;name:string;source:string;sourceUrl:string|null;verified:boolean;geometry:Geometry;importedAt:string};
export type TerritoryData={localities:Locality[];activities:TerritoryActivity[];boundaries:Boundary[];truncated:boolean};
export type MapCollection=FeatureCollection;
