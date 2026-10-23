'use client';
import { useEffect,useRef,useState } from 'react';
import type { Feature,FeatureCollection,Geometry } from 'geojson';
import type { Map as MapInstance,StyleSpecification } from 'maplibre-gl';
import type { TerritoryData } from '@/lib/territory-types';
import 'maplibre-gl/dist/maplibre-gl.css';
const baseStyle:StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]};
export default function TerritorialCanvas({data,onPick,focus,reference=true,activities=true,boundaries=true,localities=true}:{data:TerritoryData;onPick?:((latitude:number,longitude:number)=>void);focus?:[number,number]|null;reference?:boolean;activities?:boolean;boundaries?:boolean;localities?:boolean}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<MapInstance|null>(null),pickRef=useRef(onPick);pickRef.current=onPick;const [error,setError]=useState('');
 useEffect(()=>{let active=true;let dispose:(()=>void)|undefined;setError('');
 Promise.all([import('maplibre-gl'),reference?fetch('/geo/xexeu-ibge.geojson').then(r=>{if(!r.ok)throw Error();return r.json() as Promise<FeatureCollection>;}):Promise.resolve({type:'FeatureCollection',features:[]} as FeatureCollection)]).then(([lib,base])=>{
 if(!active||!container.current)return;lib.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString());
 const map=new lib.Map({container:container.current,style:process.env.NEXT_PUBLIC_MAP_STYLE_URL||baseStyle,center:[-35.6533,-8.8362],zoom:12,cooperativeGestures:true});mapRef.current=map;dispose=()=>{mapRef.current=null;map.remove();};map.addControl(new lib.NavigationControl());map.addControl(new lib.FullscreenControl());map.on('error',()=>{if(active)setError('Alguns elementos da base cartográfica não carregaram. As camadas cadastradas continuam disponíveis.');});
 map.on('load',()=>{
 const features:Feature[]=[];
 if(reference)features.push(...base.features.map(f=>({...f,properties:{title:'Xexéu · referência IBGE',layer:'reference'}})));
 if(boundaries)features.push(...data.boundaries.map(b=>({type:'Feature' as const,geometry:b.geometry,properties:{title:b.name,layer:'boundary',source:b.source}})));
 if(localities)features.push(...data.localities.flatMap(l=>{const geometry=l.geometry||(l.longitude!==null&&l.latitude!==null?{type:'Point' as const,coordinates:[l.longitude,l.latitude]}:null);return geometry?[{type:'Feature' as const,geometry,properties:{id:l.id,title:l.name,layer:'locality',kind:l.kind,contactCount:l.contactCount}}]:[];}));
 if(activities)features.push(...data.activities.filter(a=>a.latitude!==null&&a.longitude!==null).map(a=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[a.longitude!,a.latitude!]},properties:{id:a.id,title:a.title,layer:'activity'}})));
 const collection:FeatureCollection={type:'FeatureCollection',features};map.addSource('territory',{type:'geojson',data:collection});
 map.addLayer({id:'areas',type:'fill',source:'territory',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':['match',['get','layer'],'reference','#b90f13','boundary','#f66a00','#ffb900'],'fill-opacity':['case',['==',['get','layer'],'reference'],.04,.17]}});
 map.addLayer({id:'lines',type:'line',source:'territory',filter:['any',['==',['geometry-type'],'Polygon'],['==',['geometry-type'],'LineString']],paint:{'line-color':['match',['get','layer'],'reference','#8f0b0e','boundary','#f66a00','#b18c00'],'line-width':2}});
 map.addLayer({id:'points',type:'circle',source:'territory',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['case',['==',['get','layer'],'activity'],8,['+',6,['min',18,['sqrt',['coalesce',['get','contactCount'],0]]]]],'circle-color':['case',['==',['get','layer'],'activity'],'#b90f13','#f6a400'],'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
 const bounds=new lib.LngLatBounds();function extend(g:Geometry){if(g.type==='GeometryCollection'){g.geometries.forEach(extend);return;}function walk(c:unknown){if(!Array.isArray(c))return;if(typeof c[0]==='number'&&typeof c[1]==='number')bounds.extend([c[0],c[1]]);else c.forEach(walk);}walk(g.coordinates);}features.forEach(f=>{if(f.geometry)extend(f.geometry);});if(!bounds.isEmpty())map.fitBounds(bounds,{padding:40,maxZoom:14,duration:0});
 map.on('click',event=>{if(pickRef.current){pickRef.current(event.lngLat.lat,event.lngLat.lng);return;}const feature=map.queryRenderedFeatures(event.point,{layers:['points','areas','lines']})[0];if(feature){const node=document.createElement('div');node.textContent=String(feature.properties?.title||'Localidade')+(feature.properties?.layer==='locality'?' · '+Number(feature.properties.contactCount||0)+' contato(s) cadastrado(s)':'');new lib.Popup().setLngLat(event.lngLat).setDOMContent(node).addTo(map);}});
 });
 }).catch(()=>{if(active)setError('Não foi possível abrir o mapa. Verifique a conexão e o suporte a WebGL2.');});return()=>{active=false;dispose?.();};
 },[data,reference,activities,boundaries,localities]);
 useEffect(()=>{if(focus)mapRef.current?.flyTo({center:focus,zoom:15,essential:false});},[focus]);
 return <div className={`territorial-map ${onPick?'selecting-point':''}`}><div className="territorial-map-canvas" ref={container} aria-label="Mapa interativo de Xexéu"/>{onPick&&<p className="map-mode">Clique no mapa para preencher as coordenadas do formulário.</p>}{error&&<p className="map-warning" role="status">{error}</p>}</div>;
}
