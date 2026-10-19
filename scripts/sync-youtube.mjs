/**
 * Sincroniza automáticamente las listas públicas de un canal de YouTube.
 * Variables necesarias: YOUTUBE_API_KEY y YOUTUBE_CHANNEL_ID
 * Uso: YOUTUBE_API_KEY=... YOUTUBE_CHANNEL_ID=... node scripts/sync-youtube.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCTzl2vYpWCOkWnG0KRNEAzQ";
if (!API_KEY || !CHANNEL_ID) {
  console.error("Falta YOUTUBE_API_KEY. El ID del canal ya está configurado, aunque puedes sobrescribirlo con YOUTUBE_CHANNEL_ID.");
  process.exit(1);
}
const OUT = path.resolve("data/catalog.json");
const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;

async function api(resource, params={}) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  Object.entries({...params,key:API_KEY}).forEach(([k,v])=>url.searchParams.set(k,v));
  const res = await fetch(url);
  const body = await res.json();
  if(!res.ok) throw new Error(`${resource}: ${body?.error?.message || res.statusText}`);
  return body;
}
async function pages(resource, params, listKey) {
  const all=[]; let token;
  do {
    const body=await api(resource,{...params,...(token?{pageToken:token}:{})});
    all.push(...(body[listKey]||[])); token=body.nextPageToken;
  } while(token);
  return all;
}
const playlists=await pages("playlists",{part:"snippet,contentDetails",channelId:CHANNEL_ID,maxResults:50},"items");
const games=[];


const filters = JSON.parse(
  await fs.readFile("data/list-filters.json", "utf8")
);
const excludedIds = new Set(filters.excludedPlaylistIds || []);
const excludedKeywords = (filters.excludedTitleKeywords || [])
  .map(k => String(k).trim().toLowerCase())
  .filter(Boolean);
const includedIds = new Set(filters.includedPlaylistIds || []);


for(const pl of playlists) {

  
  const playlistTitle = String(pl.snippet?.title || "").toLowerCase();

  if (filters.mode === "allow") {
    if (!includedIds.has(pl.id)) continue;
  } else {
    if (excludedIds.has(pl.id)) continue;
    if (excludedKeywords.some(keyword => playlistTitle.includes(keyword))) continue;
  }

  const items=await pages("playlistItems",{part:"snippet,contentDetails",playlistId:pl.id,maxResults:50},"items");
  const videos=items.map(item=>{
    const s=item.snippet||{}, vid=item.contentDetails?.videoId || s.resourceId?.videoId;
    if(!vid || s.title==="Deleted video" || s.title==="Private video") return null;
    return {
      title:s.title || "Vídeo de YouTube",
      url:`https://www.youtube.com/watch?v=${vid}`,
      thumbnail:s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.medium?.url || "",
      publishedAt:s.publishedAt || item.contentDetails?.videoPublishedAt || ""
    };
  }).filter(Boolean);
  if(!videos.length) continue;
  const title=pl.snippet?.title || "Juego sin título";
  games.push({
    id:pl.id,
    title,
    description:pl.snippet?.description || "",
    thumbnail:pl.snippet?.thumbnails?.maxres?.url || pl.snippet?.thumbnails?.high?.url || pl.snippet?.thumbnails?.medium?.url || videos[0]?.thumbnail || "",
    updatedAt:videos.reduce((latest,v)=>v.publishedAt>latest?v.publishedAt:latest,""),
    videos
  });
}
games.sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
const catalog={channelUrl:CHANNEL_URL,generatedAt:new Date().toISOString(),games};
await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify(catalog,null,2)+"\n");
console.log(`Catálogo actualizado: ${games.length} listas/juegos, ${games.reduce((n,g)=>n+g.videos.length,0)} vídeos.`);
