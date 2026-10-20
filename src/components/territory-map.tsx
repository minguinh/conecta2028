'use client';
import { useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/dashboard-types';
import 'maplibre-gl/dist/maplibre-gl.css';
export default function TerritoryMap({points}:{points:DashboardData['communities']}){
 const container=useRef<HTMLDivElement>(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;let cleanup:(()=>void)|undefined;
 import('maplibre-gl').then(({Map,Marker,Popup,NavigationControl,LngLatBounds,setWorkerUrl})=>{
 if(!active||!container.current)return;
 setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString());
 const coordinates=points.filter((p):p is typeof p & {latitude:number;longitude:number}=>p.latitude!==null&&p.longitude!==null);
 if(!coordinates.length)return;
 const map=new Map({container:container.current,style:process.env.NEXT_PUBLIC_MAP_STYLE_URL||{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#efe9de'}}]},center:[coordinates[0].longitude,coordinates[0].latitude],zoom:11});
 cleanup=()=>map.remove();map.addControl(new NavigationControl());
 const bounds=new LngLatBounds();coordinates.forEach(p=>{bounds.extend([p.longitude,p.latitude]);new Marker({color:'#B90F13'}).setLngLat([p.longitude,p.latitude]).setPopup(new Popup().setText(p.name)).addTo(map);});
 if(coordinates.length>1)map.fitBounds(bounds,{padding:50,maxZoom:13});map.on('error',()=>{if(active)setError('Não foi possível carregar a base do mapa.');});
 }).catch(()=>{if(active)setError('Mapa indisponível neste dispositivo. Verifique o suporte a WebGL2.');});
 return ()=>{active=false;cleanup?.();};
 },[points]);
 return <div className="territory-live"><div ref={container} className="map-canvas" aria-label="Mapa das comunidades cadastradas"/>{error?<p className="map-message" role="status">{error}</p>:!process.env.NEXT_PUBLIC_MAP_STYLE_URL?<p className="map-message">Localizações cadastradas. Base cartográfica ainda não configurada.</p>:null}</div>;
}
