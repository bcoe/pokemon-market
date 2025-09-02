import respondWith from "@/api/respondWith";
import serializeEvolution from "@/api/serializers/evolution";
import serializePokemon from "@/api/serializers/pokemon";
import serializeSpecies from "@/api/serializers/species";
import type { ListPokemonResponse } from "@/types";
import type { NextApiRequest } from "next";
import unpackSettledResults from "@/api/serializers/unpackSettledResults";
import mainClient from "@/pokemon/apiClient";
import type { Pokemon, PokemonSpecies, EvolutionChain } from "pokenode-ts";
import {missingNo} from "@/pokemon/missingNo";

type PokemonData = {
  pokemon: Pokemon,
  species: PokemonSpecies,
  evolution: EvolutionChain,
};

// Global cache for all Pokemon data
let allPokemonCache: PokemonData[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchPokemonByName(name: string): Promise<PokemonData> {
  if (name === 'missingno') {
    return missingNo;
  }
  
  const pokemon = await mainClient().pokemon.getPokemonByName(name);
  const species = await mainClient().pokemon.getPokemonSpeciesByName(pokemon.species.name);

  const url = new URL(species.evolution_chain.url);
  const chainId = url.pathname.split('/').filter(Boolean).slice(-1)[0];
  const evolution = await mainClient().evolution.getEvolutionChainById(Number(chainId));

  return {
    pokemon,
    species,
    evolution,
  };
}

async function getAllPokemonData(): Promise<PokemonData[]> {
  // Check if cache is valid
  const now = Date.now();
  if (allPokemonCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return allPokemonCache;
  }

  // Fetch all Pokemon names first (single API call)
  const allPokemons = await mainClient().pokemon.listPokemons(0, 151);
  
  // Fetch all Pokemon details in parallel (151 × 3 = 453 API calls, but done once)
  const detailResults = await Promise.allSettled(
    allPokemons.results.map(({name}) => fetchPokemonByName(name))
  );
  
  const data = detailResults.map(unpackSettledResults).filter(Boolean) as PokemonData[];
  
  // Cache the results
  allPokemonCache = data;
  cacheTimestamp = now;
  
  return data;
}

export default respondWith(async function ApiBulkPokemon(req: NextApiRequest) { 
  // Get all Pokemon data (cached after first request)
  const allPokemonData = await getAllPokemonData();
  
  // Parse pagination parameters
  const offset = parseInt(req.query.offset as string) || 0;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // Slice the data for pagination
  const paginatedData = allPokemonData.slice(offset, offset + limit);
  
  // Serialize the data
  const results: ListPokemonResponse[] = paginatedData.map((data) => ({
    pokemon: serializePokemon(data?.pokemon),
    species: serializeSpecies(data?.species),
    evolution: serializeEvolution(data?.evolution),
  }));
  
  return {
    count: allPokemonData.length,
    next: offset + limit < allPokemonData.length ? {
      offset: offset + limit,
      limit,
      url: `/api/pokemon/bulk?offset=${offset + limit}&limit=${limit}`,
    } : null,
    previous: offset > 0 ? {
      offset: Math.max(0, offset - limit),
      limit,
      url: `/api/pokemon/bulk?offset=${Math.max(0, offset - limit)}&limit=${limit}`,
    } : null,
    results,
  };
});