import { range } from "@/utils/array/range";
import { ReactElement, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import apiFetch from "@/components/apiFetch";
import type { ApiListResult } from "@/api/jsonList";
import type { ListPokemonResponse } from "@/types";
import PokemonList from "@/components/PokemonList";
import { DefaultLayout } from "@/components/DefaultLayout";

const totalCardCount = 151;
const maxPageSize = 10;
const initialPageSize = 20; // Start with fewer Pokemon for better LCP

export default function Home() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(initialPageSize);
  
  // Calculate how many queries we need for the current page
  const pokemonNeeded = (currentPage + 1) * itemsPerPage;
  const queriesNeeded = Math.ceil(pokemonNeeded / maxPageSize);
  
  const queries = range(0, queriesNeeded).map((i) => ({
    offset: maxPageSize * i,
    limit: Math.min(maxPageSize * (i + 1), totalCardCount) - maxPageSize * i,
  }));

  const { data, isLoading } = useQuery<Array<ApiListResult<ListPokemonResponse>>>({
    queryKey: ["/api/pokemon", queriesNeeded],
    queryFn: ({ queryKey }) =>
      Promise.all(queries.map((query) => apiFetch("/api/pokemon", query))),
    enabled: true,
  });

  const allLoadedPokemon = data?.flatMap(apiResult => apiResult.results) || [];
  
  // Filter for search term first
  const searchTerm = String(router.query.q ?? '').toLowerCase();
  const searchFilteredPokemon = searchTerm
    ? allLoadedPokemon.filter(({pokemon}) => 
      pokemon?.name.includes(searchTerm) || searchTerm?.includes(pokemon?.name.toLowerCase() ?? '')
    ) 
    : allLoadedPokemon;

  // Then paginate the results
  const displayedPokemon = searchFilteredPokemon.slice(0, (currentPage + 1) * itemsPerPage);
  const hasMorePokemon = searchFilteredPokemon.length > displayedPokemon.length || 
                        (!searchTerm && pokemonNeeded < totalCardCount);

  if (isLoading && displayedPokemon.length === 0) {
    return (
      <div>
        <ul className="grid md:grid-cols-2 grid-cols-1 gap-px bg-black p-px">
          <li className="flex grow bg-white h-32 col-span-full place-content-center place-items-center">
            Loading...
          </li>
        </ul>
      </div>
    );
  }

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  return (
    <div>
      <PokemonList pokemonList={displayedPokemon} />
      {hasMorePokemon && (
        <div className="flex justify-center p-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded"
          >
            {isLoading ? 'Loading...' : 'Load More Pokemon'}
          </button>
        </div>
      )}
    </div>
  );
}

function Layout({page}: {page: ReactElement}) {
  const router = useRouter();

  return <DefaultLayout page={page} navChildren={
    <div className="place-self-center flex flex-grow justify-center absolute left-0 right-0 pointer-events-none">
      <input
        type="text"
        placeholder="Search..."
        className="pointer-events-auto px-4 py-1 rounded-md border w-1/3"
        value={router.query.q ?? ''}
        onChange={(e) => {
          const q = e.target.value;
          const query: typeof router.query = { ...router.query, q };
          if (!q) {
            delete query.q;
          }
          router.push({ query });
        }}
      />
    </div>
  } />;
}
Home.Layout = Layout;
