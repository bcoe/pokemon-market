import { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import apiFetch from "@/components/apiFetch";
import type { ApiListResult } from "@/api/jsonList";
import type { ListPokemonResponse } from "@/types";
import PokemonList from "@/components/PokemonList";
import { DefaultLayout } from "@/components/DefaultLayout";

const totalCardCount = 151;

export default function Home() {
  const router = useRouter();
  const { data } = useQuery<ApiListResult<ListPokemonResponse>>({
    queryKey: ["/api/pokemon/bulk"],
    queryFn: ({ queryKey }) =>
      apiFetch(queryKey.join("/"), { offset: 0, limit: totalCardCount }),
    enabled: true,
  });

  const pokemonList = data?.results;

  if (!pokemonList) {
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

  const searchTerm = String(router.query.q ?? '').toLowerCase();
  const filteredPokemonList = searchTerm
    ? pokemonList.filter(({pokemon}) => 
      pokemon?.name.includes(searchTerm) || searchTerm?.includes(pokemon?.name.toLowerCase() ?? '')
    ) 
    : pokemonList;

  return <PokemonList pokemonList={filteredPokemonList} />;
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
