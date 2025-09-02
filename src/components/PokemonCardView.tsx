import Image from "next/image";
import PokemonCardViewCss from "@/components/PokemonCardView.module.css";
import Media from "@/components/Media.module.css";
import cx from "classnames";
import { ReactNode } from "react";
import { ApiPokemon } from "@/types";

interface Props {
  className?: string;
  children?: ReactNode;
  pokemon: ApiPokemon;
  priority?: boolean; // For LCP optimization
}

export default function PokemonCardView({ className, children, pokemon, priority = false }: Props) {
  return (
    <div className={cx(Media.layout, className, "grow", "gap-x-2", "p-4")}>
      <div className={Media.img}>
        {pokemon.sprites.artwork ? (
          <Image
            src={pokemon.sprites.artwork}
            alt={pokemon.name}
            width={96}
            height={96}
            className="h-24 w-24"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            sizes="96px"
          />
        ) : (
          <div className="h-24 w-24 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </div>
      <div className={Media.title}>
        <h3 className={PokemonCardViewCss.title}>
          <span className={PokemonCardViewCss.id}>#{pokemon.id}</span>
          <span className={PokemonCardViewCss.name}>{pokemon.name}</span>
        </h3>
      </div>
      <div
        className={cx(
          Media.desc,
          "grow",
          "flex",
          "flex-col",
          "justify-between",
          "gap-y-4",
        )}
      >
        <ol className="flex flex-col">
          {pokemon.types.map(({ type }) => (
            <li key={type.name}>{type.name}</li>
          ))}
        </ol>
        {children}
      </div>
    </div>
  );
}
